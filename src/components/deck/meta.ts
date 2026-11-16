import { t } from '@/lib/strings/en'
import type { Card, TitleDetails } from '@/lib/tmdb/types'

/** "2019 · Film · 2h 12m · TMDB 7.8": the parts known so far. */
export function metaLine(card: Card, d?: Pick<TitleDetails, 'runtime' | 'seasons' | 'rating' | 'voteCount'>) {
  return [
    card.year,
    t.title[card.mediaType],
    d?.runtime ? t.title.runtime(d.runtime) : d?.seasons ? t.title.seasons(d.seasons) : null,
    d && d.voteCount > 0 ? t.title.rating(d.rating) : null,
  ]
    .filter(Boolean)
    .join(' · ')
}
