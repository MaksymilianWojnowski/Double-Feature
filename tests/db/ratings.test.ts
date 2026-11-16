import { beforeAll, describe, expect, it } from 'vitest'
import { makeDb } from './harness'

let h: Awaited<ReturnType<typeof makeDb>>
beforeAll(async () => {
  h = await makeDb()
})

async function matchedPair() {
  const p = await h.pair()
  await p.swipe(p.a, 1, 'like')
  await p.swipe(p.b, 1, 'like')
  const [{ id }] = await p.matches().then((r) => r as unknown as { id: number }[])
  return { ...p, matchId: id }
}

describe('rate_match()', () => {
  it('stores one rating per person and updates it on re-rate', async () => {
    const { a, b, matchId } = await matchedPair()
    await h.as(a, 'select rate_match($1, $2::smallint)', [matchId, 4])
    await h.as(a, 'select rate_match($1, $2::smallint)', [matchId, 5])
    await h.as(b, 'select rate_match($1, $2::smallint)', [matchId, 3])
    const rows = await h.as<{ user_id: string; rating: number }>(a, 'select user_id, rating from match_ratings order by rating')
    expect(rows).toEqual([
      { user_id: b, rating: 3 },
      { user_id: a, rating: 5 },
    ])
  })

  it('null clears your rating', async () => {
    const { a, matchId } = await matchedPair()
    await h.as(a, 'select rate_match($1, $2::smallint)', [matchId, 4])
    await h.as(a, 'select rate_match($1, null)', [matchId])
    expect(await h.as(a, 'select 1 from match_ratings')).toHaveLength(0)
  })

  it("can't rate another pair's match", async () => {
    const { matchId } = await matchedPair()
    const other = await h.pair()
    await expect(h.as(other.a, 'select rate_match($1, $2::smallint)', [matchId, 5])).rejects.toThrow(/row-level security/)
  })

  it('rejects ratings outside 1–5', async () => {
    const { a, matchId } = await matchedPair()
    await expect(h.as(a, 'select rate_match($1, $2::smallint)', [matchId, 6])).rejects.toThrow(/check/)
  })
})
