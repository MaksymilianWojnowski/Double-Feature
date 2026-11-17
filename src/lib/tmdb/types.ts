export type MediaType = 'movie' | 'tv'

/** What the deck needs to draw a card before details arrive. Boost and discover cards share this exact shape. */
export type Card = {
  key: string // `${mediaType}:${tmdbId}`
  tmdbId: number
  mediaType: MediaType
  title: string
  year: number | null
  posterPath: string | null
}

export type Provider = { id: number; name: string; logoPath: string }

/** One region's availability. `stream` = subscription + free + with ads. */
export type RegionProviders = { link: string | null; stream: Provider[]; rent: Provider[]; buy: Provider[] }

export type Details = {
  tmdbId: number
  mediaType: MediaType
  title: string
  year: number | null
  posterPath: string | null
  rating: number
  voteCount: number
  runtime: number | null // movies, minutes
  seasons: number | null // series
  genres: string[]
  overview: string
  creators: string[] // director(s) for films, creators for series
  cast: string[]
  trailerKey: string | null // YouTube
  providers: Record<string, RegionProviders>
}

/** Details as served to the browser: providers narrowed to the pair's region. */
export type TitleDetails = Omit<Details, 'providers'> & { providers: RegionProviders | null }

export const cardKey = (mediaType: MediaType, tmdbId: number) => `${mediaType}:${tmdbId}`

/** A TMDB recommendation: a card plus the fields the deck filters on without fetching details. */
export type RecTitle = Card & { genreIds: number[]; rating: number; votes: number; language: string }
