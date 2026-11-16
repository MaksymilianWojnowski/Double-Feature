import 'server-only'
import { cacheLife } from 'next/cache'
import { fetchWithRetry } from './fetch-retry'
import { mergeProviders, type RawWatchProvider } from './providers'
import { cardKey, type Card, type Details, type MediaType, type Provider, type RegionProviders } from './types'

const BASE = 'https://api.themoviedb.org/3'
const LANGUAGE = 'en-US' // follows the UI language

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const token = process.env.TMDB_ACCESS_TOKEN
  if (!token) throw new Error('TMDB_ACCESS_TOKEN is not set')
  const qs = new URLSearchParams({ language: LANGUAGE, ...params })
  const res = await fetchWithRetry(`${BASE}${path}?${qs}`, {
    headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
  })
  return res.json() as Promise<T>
}

type RawTitle = {
  id: number
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  poster_path: string | null
}

const yearOf = (date?: string) => (date ? Number(date.slice(0, 4)) || null : null)

const toCard = (type: MediaType, r: RawTitle): Card => ({
  key: cardKey(type, r.id),
  tmdbId: r.id,
  mediaType: type,
  title: (r.title ?? r.name ?? '').trim(),
  year: yearOf(r.release_date ?? r.first_air_date),
  posterPath: r.poster_path,
})

/** One discover page as cards (posterless titles dropped: the poster is the card). Cached 1h. */
export async function discover(type: MediaType, params: Record<string, string>) {
  'use cache: remote'
  cacheLife('hours')
  const raw = await get<{ total_pages: number; results: RawTitle[] }>(`/discover/${type}`, params)
  return {
    totalPages: Math.min(raw.total_pages, 500), // TMDB refuses pages past 500
    cards: raw.results.filter((r) => r.poster_path).map((r) => toCard(type, r)),
  }
}

/** Streaming services available in a region (films + series), TMDB's order. Cached 24h. */
export async function providers(region: string): Promise<Provider[]> {
  'use cache: remote'
  cacheLife('days')
  const lists = await Promise.all(
    (['movie', 'tv'] as const).map((type) =>
      get<{ results: RawWatchProvider[] }>(`/watch/providers/${type}`, { watch_region: region }).then((r) => r.results),
    ),
  )
  return mergeProviders(lists, region)
}

/** Films and series matching a title query (people dropped, posterless dropped). Cached 1h. */
export async function searchTitles(query: string): Promise<Card[]> {
  'use cache: remote'
  cacheLife('hours')
  const raw = await get<{ results: (RawTitle & { media_type: string })[] }>('/search/multi', { query, include_adult: 'false' })
  return raw.results
    .filter((r): r is RawTitle & { media_type: MediaType } => (r.media_type === 'movie' || r.media_type === 'tv') && !!r.poster_path)
    .map((r) => toCard(r.media_type, r))
}

/** This week's trending poster paths, for the blurred backdrop behind screens without a card. Cached 24h. */
export async function trendingPosters(): Promise<string[]> {
  'use cache: remote'
  cacheLife('days')
  const raw = await get<{ results: RawTitle[] }>('/trending/all/week')
  return raw.results.map((r) => r.poster_path).filter((p): p is string => !!p)
}

type RawProvider = { provider_id: number; provider_name: string; logo_path: string }
type RawDetails = RawTitle & {
  vote_average: number
  vote_count: number
  runtime?: number
  number_of_seasons?: number
  genres: { name: string }[]
  overview: string
  created_by?: { name: string }[]
  credits?: { cast: { name: string }[]; crew: { name: string; job: string }[] }
  videos?: { results: { key: string; site: string; type: string; official: boolean }[] }
  'watch/providers'?: {
    results: Record<string, { link?: string; flatrate?: RawProvider[]; free?: RawProvider[]; ads?: RawProvider[]; rent?: RawProvider[]; buy?: RawProvider[] }>
  }
}

const toProviders = (list: RawProvider[] = []): Provider[] =>
  list.map((p) => ({ id: p.provider_id, name: p.provider_name, logoPath: p.logo_path }))

/** Everything the card and details sheet need, for every region. Cached 24h. */
export async function details(type: MediaType, id: number): Promise<Details> {
  'use cache: remote'
  cacheLife('days')
  const d = await get<RawDetails>(`/${type}/${id}`, {
    append_to_response: 'credits,videos,watch/providers',
    include_video_language: 'en,null',
  })

  const videos = (d.videos?.results ?? []).filter((v) => v.site === 'YouTube')
  const trailer =
    videos.find((v) => v.type === 'Trailer' && v.official) ?? videos.find((v) => v.type === 'Trailer') ?? videos.find((v) => v.type === 'Teaser')

  const providers: Record<string, RegionProviders> = {}
  for (const [region, p] of Object.entries(d['watch/providers']?.results ?? {})) {
    const stream = [...toProviders(p.flatrate), ...toProviders(p.free), ...toProviders(p.ads)]
    providers[region] = {
      link: p.link ?? null,
      stream: stream.filter((x, i) => stream.findIndex((y) => y.id === x.id) === i),
      rent: toProviders(p.rent),
      buy: toProviders(p.buy),
    }
  }

  return {
    ...toCard(type, d),
    rating: Math.round(d.vote_average * 10) / 10,
    voteCount: d.vote_count,
    runtime: type === 'movie' ? d.runtime || null : null,
    seasons: type === 'tv' ? d.number_of_seasons || null : null,
    genres: d.genres.map((g) => g.name),
    overview: d.overview,
    creators:
      type === 'movie'
        ? (d.credits?.crew ?? []).filter((c) => c.job === 'Director').map((c) => c.name)
        : (d.created_by ?? []).map((c) => c.name),
    cast: (d.credits?.cast ?? []).slice(0, 6).map((c) => c.name),
    trailerKey: trailer?.key ?? null,
    providers,
  }
}
