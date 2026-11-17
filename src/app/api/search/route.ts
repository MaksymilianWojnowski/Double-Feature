import { NextResponse, type NextRequest } from 'next/server'
import { getMyPair } from '@/lib/pair'
import { searchTitles } from '@/lib/tmdb/client'
import { TmdbError } from '@/lib/tmdb/fetch-retry'
import { cardKey, type Card } from '@/lib/tmdb/types'
import { LOCALE_TAGS, requestLocale } from '@/lib/i18n/locales'

export type SearchResult = Card & { decision: 'like' | 'pass' | 'seen' | null }
export type SearchResponse = { results: SearchResult[]; region: string }

const noStore = { 'Cache-Control': 'no-store' }

// GET /api/search?q=matrix → films and series, each with your own swipe on it (if any).
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase().slice(0, 100)
  const { supabase } = await getMyPair()
  if (!q) return NextResponse.json({ results: [], region: 'PL' } satisfies SearchResponse, { headers: noStore })

  try {
    const [cards, { data: settings }] = await Promise.all([
      searchTitles(q, LOCALE_TAGS[requestLocale(request)]), // lowercased: one cache entry per query regardless of how it was typed
      supabase.from('pair_settings').select('region').maybeSingle<{ region: string }>(),
    ])
    const ids = [...new Set(cards.map((c) => c.tmdbId))]
    const { data: mine, error } = ids.length
      ? await supabase.from('swipes').select('tmdb_id, media_type, decision').in('tmdb_id', ids) // RLS: own swipes
      : { data: [], error: null }
    if (error) throw error
    const decision = new Map(mine.map((s) => [cardKey(s.media_type, s.tmdb_id), s.decision as SearchResult['decision']]))
    const body: SearchResponse = {
      results: cards.map((c) => ({ ...c, decision: decision.get(c.key) ?? null })),
      region: settings?.region ?? 'PL',
    }
    return NextResponse.json(body, { headers: noStore })
  } catch (e) {
    if (e instanceof TmdbError) return NextResponse.json({ error: 'tmdb' }, { status: 502, headers: noStore })
    throw e
  }
}
