import { describe, expect, it } from 'vitest'
import { pickTonight, viewMatches, type MatchItem } from '@/lib/matches'

const m = (id: number, over: Partial<MatchItem> = {}): MatchItem => ({
  id,
  key: `movie:${id}`,
  tmdbId: id,
  mediaType: 'movie',
  title: `T${id}`,
  year: 2000,
  posterPath: null,
  createdAt: `2026-11-${String(10 + id).padStart(2, '0')}T00:00:00Z`,
  watchedAt: null,
  rating: 7,
  runtime: 100,
  seasons: null,
  onOurServices: false,
  myRating: null,
  partnerRating: null,
  ...over,
})
const ids = (list: MatchItem[]) => list.map((x) => x.id)
const all = { type: 'all', onOurServices: false, sort: 'newest' } as const

describe('viewMatches', () => {
  it('filters by type', () => {
    const items = [m(1), m(2, { mediaType: 'tv', key: 'tv:2' })]
    expect(ids(viewMatches(items, { ...all, type: 'tv' }))).toEqual([2])
    expect(ids(viewMatches(items, { ...all, type: 'movie' }))).toEqual([1])
  })

  it('filters to titles on our services', () => {
    const items = [m(1, { onOurServices: true }), m(2)]
    expect(ids(viewMatches(items, { ...all, onOurServices: true }))).toEqual([1])
  })

  it('sorts newest first, by rating (high first), by runtime (short first), nulls last', () => {
    const items = [m(1, { rating: 8, runtime: null }), m(2, { rating: null, runtime: 90 }), m(3, { rating: 6, runtime: 150 })]
    expect(ids(viewMatches(items, { ...all, sort: 'newest' }))).toEqual([3, 2, 1])
    expect(ids(viewMatches(items, { ...all, sort: 'rating' }))).toEqual([1, 3, 2])
    expect(ids(viewMatches(items, { ...all, sort: 'runtime' }))).toEqual([2, 3, 1])
  })

  it('puts unwatched before watched', () => {
    const items = [m(1, { watchedAt: '2026-11-15T00:00:00Z' }), m(2)]
    expect(ids(viewMatches(items, { ...all, sort: 'newest' }))).toEqual([2, 1])
  })
})

describe('pickTonight', () => {
  it('never picks a watched title', () => {
    const items = [m(1, { watchedAt: 'x' }), m(2)]
    expect(pickTonight(items, {}, () => 0)?.id).toBe(2)
    expect(pickTonight(items, {}, () => 0.99)?.id).toBe(2)
  })

  it('with a max runtime, keeps only titles known to fit', () => {
    const items = [m(1, { runtime: 140 }), m(2, { runtime: 85 }), m(3, { mediaType: 'tv', key: 'tv:3', runtime: null, seasons: 2 })]
    expect(pickTonight(items, { maxRuntime: 90 }, () => 0.5)?.id).toBe(2)
  })

  it('avoids the current pick while there are alternatives', () => {
    const items = [m(1), m(2)]
    expect(pickTonight(items, { avoid: 'movie:1' }, () => 0)?.id).toBe(2)
    expect(pickTonight([m(1)], { avoid: 'movie:1' }, () => 0)?.id).toBe(1)
  })

  it('returns null when nothing fits', () => {
    expect(pickTonight([], {})).toBeNull()
    expect(pickTonight([m(1, { runtime: 200 })], { maxRuntime: 90 })).toBeNull()
  })
})
