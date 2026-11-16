import { trendingPosters } from '@/lib/tmdb/client'
import { posterSrc } from '@/lib/tmdb/images'

/**
 * Trending posters, heavily blurred, behind screens that have no card of their own.
 * Glass needs colour behind it; on plain black it disappears. Falls back to black if TMDB is down.
 */
export async function PosterBackdrop() {
  const posters = await trendingPosters() // never throws; [] when TMDB is unavailable
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg">
      {posters.length > 0 && (
        <div className="absolute -inset-[10%] grid grid-cols-3 grid-rows-3 opacity-80 blur-2xl saturate-[1.8]">
          {posters.slice(0, 9).map((p) => (
            // eslint-disable-next-line @next/next/no-img-element -- small TMDB size, blurred anyway
            <img key={p} src={posterSrc(p, 'w185')} alt="" fetchPriority="low" decoding="async" className="h-full w-full object-cover" />
          ))}
        </div>
      )}
      <div className="absolute inset-0 bg-linear-to-b from-black/25 via-black/45 to-black/80" />
    </div>
  )
}
