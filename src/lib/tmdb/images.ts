// Served straight from TMDB's CDN in fixed sizes (not next/image: Vercel's optimisation quota would run out on posters).
const IMG = 'https://image.tmdb.org/t/p/'

export const posterSrc = (path: string, size: 'w185' | 'w342' | 'w500' | 'w780' = 'w500') => `${IMG}${size}${path}`
export const posterSrcSet = (path: string) => `${IMG}w342${path} 342w, ${IMG}w500${path} 500w, ${IMG}w780${path} 780w`
export const POSTER_SIZES = '(min-width: 640px) 420px, 92vw'
export const logoSrc = (path: string) => `${IMG}w92${path}`

/** Warm the browser cache so the next cards' posters are already decoded when they reach the top. */
export function preloadPoster(path: string | null) {
  if (!path) return
  const img = new Image()
  img.sizes = POSTER_SIZES
  img.srcset = posterSrcSet(path)
  img.src = posterSrc(path)
}
