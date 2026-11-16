import { NextResponse, type NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getMyPair } from '@/lib/pair'
import { createAdminClient } from '@/lib/supabase/admin'
import { discover } from '@/lib/tmdb/client'
import { TmdbError } from '@/lib/tmdb/fetch-retry'
import { cardKey, type Card, type MediaType } from '@/lib/tmdb/types'
import { buildDeck } from '@/lib/deck/build-deck'
import { discoverParams, settingsKey, type PairSettings } from '@/lib/deck/discover-params'
import { DECK_BATCH, MAX_PAGES_PER_REQUEST } from '@/lib/deck/config'

export type DeckResponse = {
  cards: Card[]
  cursor: { key: string } & Partial<Record<MediaType, number>>
  done: boolean
  region: string
}

const noStore = { 'Cache-Control': 'no-store' }

// GET /api/deck?key=&movie=&tv= → the next batch of cards for the signed-in user.
export async function GET(request: NextRequest) {
  const { supabase, me, pair, partner } = await getMyPair()
  if (!pair) return NextResponse.json({ error: 'no_pair' }, { status: 409, headers: noStore })

  const { data: settings, error } = await supabase
    .from('pair_settings')
    .select('region, provider_ids, only_our_services, content_type, filters')
    .single<PairSettings>()
  if (error || !settings) throw error ?? new Error('pair_settings missing')

  const key = settingsKey(settings)
  const q = request.nextUrl.searchParams
  // Types the genre filter rules out entirely (e.g. series when only Horror is chosen) aren't fetched at all.
  const types = (settings.content_type === 'both' ? (['movie', 'tv'] as MediaType[]) : [settings.content_type]).filter(
    (t) => discoverParams(settings, t, 1) !== null,
  )
  const page = {} as Record<MediaType, number>
  for (const t of types) {
    const saved = Number(q.get(t))
    page[t] = q.get('key') === key && Number.isInteger(saved) && saved > 0 ? saved : 1 // cursor from other settings: start over
  }

  const total: Partial<Record<MediaType, number>> = {}
  const fresh: Card[] = []
  const swiped = new Set<string>()
  try {
    for (let walked = 0; walked < MAX_PAGES_PER_REQUEST && fresh.length < DECK_BATCH; walked++) {
      const active = types.filter((t) => page[t] <= (total[t] ?? 500))
      if (!active.length) break
      const pages = await Promise.all(active.map((t) => discover(t, discoverParams(settings, t, page[t])!)))
      active.forEach((t, i) => {
        total[t] = pages[i].totalPages
        page[t]++
      })
      const cards = interleave(pages.map((p) => p.cards))
      for (const k of await swipedKeys(supabase, cards)) swiped.add(k)
      fresh.push(...cards.filter((c) => !swiped.has(c.key)))
    }
  } catch (e) {
    if (e instanceof TmdbError) return NextResponse.json({ error: 'tmdb' }, { status: 502, headers: noStore })
    throw e
  }

  const done = types.every((t) => total[t] !== undefined && page[t] > total[t])
  const boost = partner ? await partnerLikes(me.id) : []
  const body: DeckResponse = {
    cards: buildDeck({ discovered: fresh, boost, swiped, exhausted: done }),
    cursor: { key, ...page },
    done,
    region: settings.region,
  }
  return NextResponse.json(body, { headers: noStore })
}

/** Round-robin merge, so "both" alternates films and series. */
function interleave(lists: Card[][]): Card[] {
  const out: Card[] = []
  for (let i = 0; i < Math.max(0, ...lists.map((l) => l.length)); i++) for (const l of lists) if (l[i]) out.push(l[i])
  return out
}

/** Which of these cards the user has already swiped (RLS: own swipes only). */
async function swipedKeys(supabase: SupabaseClient, cards: Card[]): Promise<string[]> {
  const ids = [...new Set(cards.map((c) => c.tmdbId))]
  if (!ids.length) return []
  const { data, error } = await supabase.from('swipes').select('tmdb_id, media_type').in('tmdb_id', ids)
  if (error) throw error
  return data.map((r) => cardKey(r.media_type, r.tmdb_id))
}

/** The partner's likes this user hasn't swiped, as plain cards (indistinguishable from discover cards). */
async function partnerLikes(userId: string): Promise<Card[]> {
  const admin = createAdminClient()
  if (!admin) {
    console.warn('SUPABASE_SECRET_KEY not set: deck runs without partner boost')
    return []
  }
  const { data, error } = await admin.rpc('boost_candidates', { p_user: userId, p_limit: 20 })
  if (error) throw error
  return (data as { tmdb_id: number; media_type: MediaType; title: string; poster_path: string | null; year: number | null }[])
    .filter((r) => r.poster_path)
    .map((r) => ({
      key: cardKey(r.media_type, r.tmdb_id),
      tmdbId: r.tmdb_id,
      mediaType: r.media_type,
      title: r.title,
      year: r.year,
      posterPath: r.poster_path,
    }))
}
