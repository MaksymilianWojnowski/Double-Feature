import { NextResponse, type NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getMyPair } from '@/lib/pair'
import { createAdminClient } from '@/lib/supabase/admin'
import { details, discover, recommendations } from '@/lib/tmdb/client'
import { TmdbError } from '@/lib/tmdb/fetch-retry'
import { cardKey, type Card, type MediaType } from '@/lib/tmdb/types'
import { buildDeck } from '@/lib/deck/build-deck'
import { discoverParams, settingsKey, type PairSettings } from '@/lib/deck/discover-params'
import { DECK_BATCH, MAX_PAGES_PER_REQUEST, RECOMMEND_CHECKED, RECOMMEND_SEEDS } from '@/lib/deck/config'
import { needsDetails, passesDetails, passesFilters } from '@/lib/deck/recommend'
import { LOCALE_TAGS, requestLocale } from '@/lib/i18n/locales'

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
  const language = LOCALE_TAGS[requestLocale(request)]
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

  // Partner likes and recommendations don't depend on the discover walk: fetch them while it runs.
  const boostP = partner ? partnerLikes(me.id) : Promise.resolve([])
  boostP.catch(() => {}) // if the walk fails first we return early; this one's error is surfaced below
  const recommendedP = recommendedFor(supabase, settings, types, language).catch((e) => {
    console.warn('deck: recommendations skipped', e) // a bonus; never worth failing the deck over
    return []
  })

  const total: Partial<Record<MediaType, number>> = {}
  const fresh: Card[] = []
  const swiped = new Set<string>()
  try {
    for (let walked = 0; walked < MAX_PAGES_PER_REQUEST && fresh.length < DECK_BATCH; walked++) {
      const active = types.filter((t) => page[t] <= (total[t] ?? 500))
      if (!active.length) break
      const pages = await Promise.all(active.map((t) => discover(t, discoverParams(settings, t, page[t])!, language)))
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
  const [boost, recommended] = await Promise.all([boostP, recommendedP])
  const body: DeckResponse = {
    cards: buildDeck({ discovered: fresh, boost, recommended, swiped, exhausted: done }),
    cursor: { key, ...page },
    done,
    region: settings.region,
  }
  return NextResponse.json(body, { headers: noStore })
}

/** Round-robin merge, so "both" alternates films and series. */
function interleave<T extends Card>(lists: T[][]): T[] {
  const out: T[] = []
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

/** Unswiped titles like the user's most recent likes (TMDB recommendations), under the pair's filters. */
async function recommendedFor(supabase: SupabaseClient, settings: PairSettings, types: MediaType[], language: string): Promise<Card[]> {
  if (!types.length) return []
  const { data: seeds, error } = await supabase // RLS: own swipes
    .from('swipes')
    .select('tmdb_id, media_type')
    .eq('decision', 'like')
    .in('media_type', types)
    .order('created_at', { ascending: false })
    .limit(RECOMMEND_SEEDS)
  if (error) throw error
  if (!seeds.length) return []
  const lists = await Promise.all(seeds.map((s) => recommendations(s.media_type, s.tmdb_id, language)))
  let picks = interleave(lists).filter((r) => passesFilters(r, settings))
  const swiped = new Set(await swipedKeys(supabase, picks))
  picks = picks.filter((r) => !swiped.has(r.key))
  if (needsDetails(settings)) {
    picks = picks.slice(0, RECOMMEND_CHECKED)
    const found = await Promise.all(picks.map((r) => details(r.mediaType, r.tmdbId, language).catch(() => null)))
    picks = picks.filter((_, i) => found[i] && passesDetails(found[i], settings))
  }
  return picks.map(({ key, tmdbId, mediaType, title, year, posterPath }) => ({ key, tmdbId, mediaType, title, year, posterPath }))
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
