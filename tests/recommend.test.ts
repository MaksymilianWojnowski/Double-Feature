import { describe, expect, it } from 'vitest'
import { needsDetails, passesDetails, passesFilters } from '@/lib/deck/recommend'
import { buildDeck } from '@/lib/deck/build-deck'
import type { PairSettings } from '@/lib/deck/discover-params'
import type { Card, RecTitle } from '@/lib/tmdb/types'

const settings = (over: Partial<PairSettings> = {}): PairSettings => ({
  region: 'PL',
  provider_ids: [],
  only_our_services: false,
  content_type: 'both',
  filters: {},
  ...over,
})
const rec = (over: Partial<RecTitle> = {}): RecTitle => ({
  key: 'movie:1',
  tmdbId: 1,
  mediaType: 'movie',
  title: 'T',
  year: 2010,
  posterPath: '/p.jpg',
  genreIds: [27],
  rating: 7.2,
  votes: 900,
  language: 'en',
  ...over,
})
const card = (id: number): Card => ({ key: `movie:${id}`, tmdbId: id, mediaType: 'movie', title: `T${id}`, year: 2000, posterPath: '/p.jpg' })

describe('passesFilters', () => {
  it('keeps a title when no filters are set (default vote floor only)', () => {
    expect(passesFilters(rec(), settings())).toBe(true)
    expect(passesFilters(rec({ votes: 20 }), settings())).toBe(false)
  })

  it('applies genres per media type (Horror has no series id)', () => {
    const s = settings({ filters: { genres: ['horror'] } })
    expect(passesFilters(rec(), s)).toBe(true)
    expect(passesFilters(rec({ genreIds: [35] }), s)).toBe(false)
    expect(passesFilters(rec({ mediaType: 'tv', key: 'tv:1', genreIds: [27] }), s)).toBe(false)
  })

  it('applies years, rating, votes and language', () => {
    expect(passesFilters(rec({ year: 1999 }), settings({ filters: { yearMin: 2000 } }))).toBe(false)
    expect(passesFilters(rec({ year: null }), settings({ filters: { yearMax: 2020 } }))).toBe(false)
    expect(passesFilters(rec({ rating: 6.9 }), settings({ filters: { minRating: 7 } }))).toBe(false)
    expect(passesFilters(rec({ votes: 900 }), settings({ filters: { minVotes: 1000 } }))).toBe(false)
    expect(passesFilters(rec({ votes: 5 }), settings({ filters: { minVotes: 0 } }))).toBe(true)
    expect(passesFilters(rec({ language: 'ko' }), settings({ filters: { language: 'en' } }))).toBe(false)
  })
})

describe('passesDetails', () => {
  const details = { mediaType: 'movie' as const, runtime: 130, providers: { PL: { link: null, stream: [{ id: 8, name: 'Netflix', logoPath: '' }], rent: [], buy: [] } } }

  it('only asks for details when a filter needs them', () => {
    expect(needsDetails(settings())).toBe(false)
    expect(needsDetails(settings({ filters: { runtimeMax: 120 } }))).toBe(true)
    expect(needsDetails(settings({ only_our_services: true, provider_ids: [8] }))).toBe(true)
  })

  it('applies film length', () => {
    expect(passesDetails(details, settings({ filters: { runtimeMax: 120 } }))).toBe(false)
    expect(passesDetails(details, settings({ filters: { runtimeMin: 90, runtimeMax: 150 } }))).toBe(true)
    expect(passesDetails({ ...details, runtime: null }, settings({ filters: { runtimeMax: 150 } }))).toBe(false)
  })

  it('keeps only titles streaming on our services in our region', () => {
    expect(passesDetails(details, settings({ only_our_services: true, provider_ids: [8] }))).toBe(true)
    expect(passesDetails(details, settings({ only_our_services: true, provider_ids: [337] }))).toBe(false)
    expect(passesDetails(details, settings({ region: 'BR', only_our_services: true, provider_ids: [8] }))).toBe(false)
  })
})

describe('buildDeck with recommendations', () => {
  it('puts recommendations halfway between partner likes', () => {
    const deck = buildDeck({
      discovered: [1, 2, 3, 4, 5, 6].map(card),
      boost: [card(100)],
      recommended: [card(200), card(201)],
      swiped: new Set(),
    })
    expect(deck.map((c) => c.tmdbId)).toEqual([1, 200, 2, 100, 3, 201, 4, 5, 6])
  })

  it('drops swiped recommendations and ones already in discover', () => {
    const deck = buildDeck({ discovered: [1, 2, 3].map(card), boost: [], recommended: [card(2), card(9)], swiped: new Set(['movie:9']) })
    expect(deck.map((c) => c.tmdbId)).toEqual([1, 2, 3])
  })
})
