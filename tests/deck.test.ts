import { describe, expect, it } from 'vitest'
import { buildDeck } from '@/lib/deck/build-deck'
import { discoverParams, settingsKey, type PairSettings } from '@/lib/deck/discover-params'
import type { Card, MediaType } from '@/lib/tmdb/types'

const card = (id: number, mediaType: MediaType = 'movie'): Card => ({
  key: `${mediaType}:${id}`,
  tmdbId: id,
  mediaType,
  title: `T${id}`,
  year: 2000,
  posterPath: `/p${id}.jpg`,
})
const keys = (cards: Card[]) => cards.map((c) => c.key)

describe('buildDeck', () => {
  it('drops swiped titles from both lists', () => {
    const deck = buildDeck({
      discovered: [card(1), card(2)],
      boost: [card(3), card(4)],
      swiped: new Set(['movie:2', 'movie:3']),
      exhausted: true,
    })
    expect(keys(deck).sort()).toEqual(['movie:1', 'movie:4'])
  })

  it('shows a title that is in both lists once', () => {
    const deck = buildDeck({ discovered: [card(1), card(2), card(3)], boost: [card(2)], swiped: new Set() })
    expect(keys(deck).filter((k) => k === 'movie:2')).toHaveLength(1)
    expect(deck).toHaveLength(3)
  })

  it('treats the same id with a different media type as a different title', () => {
    const deck = buildDeck({ discovered: [card(1, 'movie'), card(1, 'tv')], boost: [], swiped: new Set(['tv:1']) })
    expect(keys(deck)).toEqual(['movie:1'])
  })

  it('puts a partner like at every 4th position; leftovers wait for the next batch', () => {
    const discovered = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => card(i))
    const boost = [101, 102, 103].map((i) => card(i))
    const deck = keys(buildDeck({ discovered, boost, swiped: new Set(), every: 4 }))
    expect(deck[3]).toBe('movie:101')
    expect(deck[7]).toBe('movie:102')
    expect(deck).not.toContain('movie:103')
    expect(deck).toHaveLength(11)
  })

  it('appends leftover partner likes once discover is exhausted', () => {
    const deck = keys(buildDeck({ discovered: [card(1)], boost: [card(7), card(8)], swiped: new Set(), exhausted: true }))
    expect(deck).toEqual(['movie:1', 'movie:7', 'movie:8'])
  })

  it('without partner likes, the deck is the discover order', () => {
    const discovered = [1, 2, 3, 4, 5].map((i) => card(i))
    expect(keys(buildDeck({ discovered, boost: [], swiped: new Set() }))).toEqual(keys(discovered))
  })
})

const base: PairSettings = { region: 'PL', provider_ids: [], only_our_services: false, content_type: 'both', filters: {} }

describe('discoverParams', () => {
  it('maps years and runtime for films', () => {
    const p = discoverParams({ ...base, filters: { yearMin: 1990, yearMax: 1999, runtimeMin: 80, runtimeMax: 120 } }, 'movie', 3)
    expect(p).toMatchObject({
      page: '3',
      sort_by: 'popularity.desc',
      include_adult: 'false',
      'primary_release_date.gte': '1990-01-01',
      'primary_release_date.lte': '1999-12-31',
      'with_runtime.gte': '80',
      'with_runtime.lte': '120',
    })
  })

  it('uses first-air dates and no runtime for series', () => {
    const p = discoverParams({ ...base, filters: { yearMin: 2010, runtimeMax: 60 } }, 'tv', 1)
    expect(p['first_air_date.gte']).toBe('2010-01-01')
    expect(p).not.toHaveProperty('primary_release_date.gte')
    expect(p).not.toHaveProperty('with_runtime.lte')
  })

  it('limits to our services only when the toggle is on and services are chosen', () => {
    const on = discoverParams({ ...base, only_our_services: true, provider_ids: [8, 119] }, 'movie', 1)
    expect(on).toMatchObject({ watch_region: 'PL', with_watch_providers: '8|119', with_watch_monetization_types: 'flatrate|free|ads' })
    expect(discoverParams({ ...base, only_our_services: false, provider_ids: [8] }, 'movie', 1)).not.toHaveProperty('with_watch_providers')
    expect(discoverParams({ ...base, only_our_services: true, provider_ids: [] }, 'movie', 1)).not.toHaveProperty('with_watch_providers')
  })

  it('defaults the vote floor and maps rating, genres and language', () => {
    expect(discoverParams(base, 'movie', 1)['vote_count.gte']).toBe('150')
    const p = discoverParams({ ...base, filters: { minVotes: 1000, minRating: 7, genres: [18, 35], language: 'ko' } }, 'tv', 1)
    expect(p).toMatchObject({ 'vote_count.gte': '1000', 'vote_average.gte': '7', with_genres: '18|35', with_original_language: 'ko' })
  })
})

describe('settingsKey', () => {
  it('is stable for equal settings and changes when a filter changes', () => {
    expect(settingsKey(base)).toBe(settingsKey({ ...base }))
    expect(settingsKey(base)).not.toBe(settingsKey({ ...base, filters: { minRating: 6 } }))
  })
})
