// TMDB has separate genre lists for films and series with partly different ids.
// One UI list, mapped to each; an empty array means that type has no such genre.
export const GENRES = {
  action: { movie: [28], tv: [10759] },
  adventure: { movie: [12], tv: [10759] },
  animation: { movie: [16], tv: [16] },
  comedy: { movie: [35], tv: [35] },
  crime: { movie: [80], tv: [80] },
  documentary: { movie: [99], tv: [99] },
  drama: { movie: [18], tv: [18] },
  family: { movie: [10751], tv: [10751, 10762] },
  fantasy: { movie: [14], tv: [10765] },
  history: { movie: [36], tv: [] },
  horror: { movie: [27], tv: [] },
  mystery: { movie: [9648], tv: [9648] },
  romance: { movie: [10749], tv: [] },
  scifi: { movie: [878], tv: [10765] },
  thriller: { movie: [53], tv: [] },
  war: { movie: [10752], tv: [10768] },
  western: { movie: [37], tv: [37] },
  reality: { movie: [], tv: [10764] },
} as const satisfies Record<string, { movie: readonly number[]; tv: readonly number[] }>

export type GenreKey = keyof typeof GENRES
export const GENRE_KEYS = Object.keys(GENRES) as GenreKey[]
