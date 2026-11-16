import type { Card } from '@/lib/tmdb/types'
import { PARTNER_BOOST_EVERY } from './config'

/**
 * Discover cards with the partner's likes woven in at every `every`-th position.
 * Swiped titles and duplicates are dropped. Leftover partner likes wait for the next batch
 * (a run of them would give them away), unless discover is exhausted: then they all go at the end.
 */
export function buildDeck({
  discovered,
  boost,
  swiped,
  every = PARTNER_BOOST_EVERY,
  exhausted = false,
}: {
  discovered: Card[]
  boost: Card[]
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

  const deck: Card[] = []
  while (rest.length) deck.push((deck.length + 1) % every === 0 && boosts.length ? boosts.shift()! : rest.shift()!)
  return exhausted ? deck.concat(boosts) : deck
}
