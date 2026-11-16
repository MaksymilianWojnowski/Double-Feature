import { beforeAll, describe, expect, it } from 'vitest'
import { makeDb } from './harness'

let h: Awaited<ReturnType<typeof makeDb>>
beforeAll(async () => {
  h = await makeDb()
})

describe('match detection', () => {
  it('like + like creates exactly one match', async () => {
    const { a, b, swipe, matches } = await h.pair()
    await swipe(a, 100, 'like')
    expect(await matches()).toHaveLength(0)
    await swipe(b, 100, 'like')
    expect(await matches()).toMatchObject([{ tmdb_id: 100, media_type: 'movie' }])
  })

  it.each(['pass', 'seen'] as const)('like + %s creates none', async (other) => {
    const { a, b, swipe, matches } = await h.pair()
    await swipe(a, 100, 'like')
    await swipe(b, 100, other)
    expect(await matches()).toHaveLength(0)
  })

  it('same tmdb_id with a different media_type is a different title', async () => {
    const { a, b, swipe, matches } = await h.pair()
    await swipe(a, 100, 'like', 'movie')
    await swipe(b, 100, 'like', 'tv')
    expect(await matches()).toHaveLength(0)
  })

  it('likes in different pairs never match', async () => {
    const p1 = await h.pair()
    const p2 = await h.pair()
    await p1.swipe(p1.a, 100, 'like')
    await p2.swipe(p2.a, 100, 'like')
    expect(await p1.matches()).toHaveLength(0)
    expect(await p2.matches()).toHaveLength(0)
  })

  it('changing a pass to a like creates the match', async () => {
    const { a, b, swipe, matches } = await h.pair()
    await swipe(a, 100, 'like')
    await swipe(b, 100, 'pass')
    await swipe(b, 100, 'like')
    expect(await matches()).toHaveLength(1)
  })

  it('liking twice still gives one match', async () => {
    const { a, b, swipe, matches } = await h.pair()
    await swipe(a, 100, 'like')
    await swipe(b, 100, 'like')
    await swipe(b, 100, 'like')
    await swipe(a, 100, 'like')
    expect(await matches()).toHaveLength(1)
  })

  it('undoing a like removes the unwatched match', async () => {
    const { a, b, swipe, matches } = await h.pair()
    await swipe(a, 100, 'like')
    await swipe(b, 100, 'like')
    await h.as(b, 'delete from swipes where tmdb_id = 100')
    expect(await matches()).toHaveLength(0)
  })

  it('changing a like to a pass removes the unwatched match', async () => {
    const { a, b, swipe, matches } = await h.pair()
    await swipe(a, 100, 'like')
    await swipe(b, 100, 'like')
    await swipe(b, 100, 'pass')
    expect(await matches()).toHaveLength(0)
  })

  it('undoing a like keeps a match that was already watched', async () => {
    const { a, b, swipe, matches } = await h.pair()
    await swipe(a, 100, 'like')
    await swipe(b, 100, 'like')
    await h.as(a, 'update matches set watched_at = now()')
    await h.as(b, 'delete from swipes where tmdb_id = 100')
    expect(await matches()).toHaveLength(1)
  })
})
