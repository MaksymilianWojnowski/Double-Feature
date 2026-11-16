import type { MediaType } from '@/lib/tmdb/types'
import { DEFAULT_MIN_VOTES } from './config'

export type Filters = {
  genres?: number[]
  yearMin?: number
  yearMax?: number
  minRating?: number
  minVotes?: number
  runtimeMin?: number // films only
  runtimeMax?: number // films only
  language?: string // ISO 639-1, e.g. "ko"
}

export type PairSettings = {
  region: string
  provider_ids: number[]
  only_our_services: boolean
  content_type: MediaType | 'both'
  filters: Filters
}

/** TMDB /discover query for one page under the pair's settings. Both partners get the same order. */
export function discoverParams(settings: PairSettings, type: MediaType, page: number): Record<string, string> {
  const f = settings.filters
  const date = type === 'movie' ? 'primary_release_date' : 'first_air_date'
  const p: Record<string, string | number | undefined> = {
    page,
    sort_by: 'popularity.desc',
    include_adult: 'false',
    'vote_count.gte': f.minVotes ?? DEFAULT_MIN_VOTES,
    'vote_average.gte': f.minRating,
    with_genres: f.genres?.length ? f.genres.join('|') : undefined,
    with_original_language: f.language,
    [`${date}.gte`]: f.yearMin ? `${f.yearMin}-01-01` : undefined,
    [`${date}.lte`]: f.yearMax ? `${f.yearMax}-12-31` : undefined,
  }
  if (type === 'movie') {
    p['with_runtime.gte'] = f.runtimeMin
    p['with_runtime.lte'] = f.runtimeMax
  }
  if (settings.only_our_services && settings.provider_ids.length) {
    p.watch_region = settings.region
    p.with_watch_providers = settings.provider_ids.join('|')
    p.with_watch_monetization_types = 'flatrate|free|ads'
  }
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
}

/** Short stable hash of everything that changes discover results; a saved cursor is only valid for its key. */
export function settingsKey(s: PairSettings): string {
  const text = JSON.stringify([s.content_type, s.region, s.only_our_services, [...s.provider_ids].sort(), Object.entries(s.filters).sort()])
  let h = 0x811c9dc5 // FNV-1a
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193)
  return (h >>> 0).toString(36)
}
