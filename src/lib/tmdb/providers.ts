import type { Provider } from './types'

export type RawWatchProvider = {
  provider_id: number
  provider_name: string
  logo_path: string
  display_priority: number
  display_priorities?: Record<string, number>
}

/** Film and series provider lists as one, deduped, in the order TMDB ranks them for this region. */
export function mergeProviders(lists: RawWatchProvider[][], region: string): Provider[] {
  const best = new Map<number, { provider: Provider; rank: number }>()
  for (const r of lists.flat()) {
    const rank = r.display_priorities?.[region] ?? r.display_priority
    const seen = best.get(r.provider_id)
    if (!seen || rank < seen.rank) best.set(r.provider_id, { provider: { id: r.provider_id, name: r.provider_name, logoPath: r.logo_path }, rank })
  }
  return [...best.values()].sort((a, b) => a.rank - b.rank || a.provider.name.localeCompare(b.provider.name)).map((x) => x.provider)
}
