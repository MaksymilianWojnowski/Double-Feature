import { beforeAll, describe, expect, it } from 'vitest'
import { makeDb } from './harness'

let h: Awaited<ReturnType<typeof makeDb>>
beforeAll(async () => {
  h = await makeDb()
})

const swipe = (uid: string, id: number, decision: string, type = 'movie') =>
  h.as<{ tmdb_id: number }>(uid, 'select * from swipe($1, $2, $3, $4)', [id, type, decision, `T${id}`])

describe('swipe()', () => {
  it('returns the match only from the swipe that created it', async () => {
    const { a, b } = await h.pair()
    expect(await swipe(a, 1, 'like')).toHaveLength(0)
    expect(await swipe(b, 1, 'like')).toMatchObject([{ tmdb_id: 1 }])
    expect(await swipe(a, 1, 'like')).toHaveLength(0) // re-like of an existing match
  })

  it('a pass never returns a match', async () => {
    const { a, b } = await h.pair()
    await swipe(a, 1, 'like')
    expect(await swipe(b, 1, 'pass')).toHaveLength(0)
  })

  it('stores the swipe in your own pair with the display fields', async () => {
    const { a, pairId } = await h.pair()
    await h.as(a, "select * from swipe(5, 'tv', 'seen', 'Show', '/p.jpg', 2020)")
    const rows = await h.as(a, 'select pair_id, media_type, decision, title, poster_path, year from swipes')
    expect(rows).toEqual([{ pair_id: pairId, media_type: 'tv', decision: 'seen', title: 'Show', poster_path: '/p.jpg', year: 2020 }])
  })

  it('refuses without a pair', async () => {
    const loner = await h.user()
    await expect(swipe(loner, 1, 'like')).rejects.toThrow('no_pair')
  })
})

describe('boost_candidates()', () => {
  it('is not callable from the browser role', async () => {
    const { a } = await h.pair()
    await expect(h.as(a, 'select * from boost_candidates($1)', [a])).rejects.toThrow(/permission denied/)
  })

  it("returns the partner's likes you haven't swiped, newest first, and nothing else", async () => {
    const { a, b } = await h.pair()
    const other = await h.pair()
    await swipe(b, 1, 'like')
    await swipe(b, 2, 'like')
    await swipe(b, 3, 'pass') // not a like
    await swipe(b, 4, 'like')
    await swipe(a, 2, 'pass') // already swiped by a
    await swipe(a, 5, 'like') // a's own like
    await swipe(other.a, 6, 'like') // another pair
    const rows = await h.asService<{ tmdb_id: number }>('select tmdb_id from boost_candidates($1)', [a])
    expect(rows.map((r) => r.tmdb_id)).toEqual([4, 1])
  })
})
