import { describe, expect, it } from 'vitest'
import { mergeProviders, type RawWatchProvider } from '@/lib/tmdb/providers'

const p = (id: number, name: string, priority: number, regional?: Record<string, number>): RawWatchProvider => ({
  provider_id: id,
  provider_name: name,
  logo_path: `/${id}.png`,
  display_priority: priority,
  display_priorities: regional,
})

describe('mergeProviders', () => {
  it('dedups across film and series lists', () => {
    const merged = mergeProviders([[p(8, 'Netflix', 1)], [p(8, 'Netflix', 1), p(119, 'Prime', 2)]], 'PL')
    expect(merged.map((x) => x.id)).toEqual([8, 119])
  })

  it("orders by the region's own priority, falling back to the global one", () => {
    const merged = mergeProviders([[p(8, 'Netflix', 1, { PL: 5 }), p(1899, 'Max', 9, { PL: 1 }), p(2, 'Apple TV', 3)]], 'PL')
    expect(merged.map((x) => x.name)).toEqual(['Max', 'Apple TV', 'Netflix'])
  })

  it('keeps the best rank when a provider appears with two ranks', () => {
    const merged = mergeProviders([[p(8, 'Netflix', 7)], [p(8, 'Netflix', 2), p(9, 'Other', 4)]], 'BR')
    expect(merged.map((x) => x.id)).toEqual([8, 9])
  })
})
