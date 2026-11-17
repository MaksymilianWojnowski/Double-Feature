import type { Card } from '@/lib/tmdb/types'
import { PARTNER_BOOST_EVERY } from './config'

/**
 * Discover cards with the partner's likes woven in at every `every`-th position and recommendations
 * halfway between them. Swiped titles and duplicates are dropped. Leftovers wait for the next batch
 * (a run of partner likes would give them away), unless discover is exhausted: then they go at the end.
 */
export function buildDeck({
  discovered,
  boost,
  recommended = [],
  swiped,
  every = PARTNER_BOOST_EVERY,
  exhausted = false,
}: {
  discovered: Card[]
  boost: Card[]
  recommended?: Card[]
  swiped: Set<string>
  every?: number
  exhausted?: boolean
}): Card[] {
  const taken = new Set(swiped)
  const fresh = (list: Card[]) =>
    list.filter((c) => {
      if (taken.has(c.key)) return false
      taken.add(c.key)
      return true
    })
  const rest = fresh(discovered) // first: a title in both lists keeps its discover slot instead of waiting
  const boosts = fresh(boost)
  const recs = fresh(recommended)

  const deck: Card[] = []
  while (rest.length) {
    const slot = (deck.length + 1) % every
    deck.push(slot === 0 && boosts.length ? boosts.shift()! : slot === Math.floor(every / 2) && recs.length ? recs.shift()! : rest.shift()!)
  }
  return exhausted ? deck.concat(boosts, recs) : deck
}
