import type { Details, RecTitle } from '@/lib/tmdb/types'
import { DEFAULT_MIN_VOTES } from './config'
import type { PairSettings } from './discover-params'
import { GENRES } from './genres'

/** Whether a recommendation passes the pair's filters that need no details: the same rules discover applies. */
export function passesFilters(r: RecTitle, s: PairSettings): boolean {
  const f = s.filters
  const genreIds: readonly number[] = (f.genres ?? []).flatMap((g) => GENRES[g]?.[r.mediaType] ?? [])
  if (f.genres?.length && !r.genreIds.some((id) => genreIds.includes(id))) return false
  if ((f.yearMin && (!r.year || r.year < f.yearMin)) || (f.yearMax && (!r.year || r.year > f.yearMax))) return false
  if (f.minRating && r.rating < f.minRating) return false
  if (r.votes < (f.minVotes ?? DEFAULT_MIN_VOTES)) return false
  return !f.language || r.language === f.language
}

/** Whether any filter needs the title's details (film length, streaming services) to decide. */
export const needsDetails = (s: PairSettings) =>
  !!(s.filters.runtimeMin || s.filters.runtimeMax || (s.only_our_services && s.provider_ids.length))

/** The filters that need details: film length and "only titles on our services". */
export function passesDetails(d: Pick<Details, 'mediaType' | 'runtime' | 'providers'>, s: PairSettings): boolean {
  const f = s.filters
  if (d.mediaType === 'movie' && (f.runtimeMin || f.runtimeMax)) {
    if (!d.runtime || (f.runtimeMin && d.runtime < f.runtimeMin) || (f.runtimeMax && d.runtime > f.runtimeMax)) return false
  }
  if (s.only_our_services && s.provider_ids.length) {
    return !!d.providers[s.region]?.stream.some((p) => s.provider_ids.includes(p.id))
  }
  return true
}
