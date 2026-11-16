import { beforeAll, describe, expect, it } from 'vitest'
import { makeDb } from './harness'

let h: Awaited<ReturnType<typeof makeDb>>
beforeAll(async () => {
  h = await makeDb()
})

describe('row level security', () => {
  it("you see only your own swipes, never your partner's", async () => {
    const { a, b, swipe } = await h.pair()
    await swipe(a, 1, 'like')
    await swipe(b, 2, 'like')
    const rows = await h.as<{ tmdb_id: number }>(a, 'select tmdb_id from swipes')
    expect(rows.map((r) => r.tmdb_id)).toEqual([1])
  })

  it("you can't see another pair's matches, settings, members or pair", async () => {
    const p1 = await h.pair()
    const p2 = await h.pair()
    await p2.swipe(p2.a, 5, 'like')
    await p2.swipe(p2.b, 5, 'like')
    for (const table of ['matches', 'pair_settings', 'pair_members']) {
      const rows = await h.as(p1.a, `select 1 from ${table} where pair_id = $1`, [p2.pairId])
      expect(rows, table).toHaveLength(0)
    }
    expect(await h.as(p1.a, 'select 1 from pairs where id = $1', [p2.pairId])).toHaveLength(0)
  })

  it("you can't swipe into another pair", async () => {
    const p1 = await h.pair()
    const p2 = await h.pair()
    await expect(
      h.as(p1.a, "insert into swipes (pair_id, tmdb_id, media_type, decision, title) values ($1, 1, 'movie', 'like', 'T')", [p2.pairId]),
    ).rejects.toThrow(/row-level security/)
  })

  it("you can't forge a match or a swipe for someone else", async () => {
    const { a, b, pairId } = await h.pair()
    await expect(
      h.as(a, "insert into matches (pair_id, tmdb_id, media_type, title) values ($1, 1, 'movie', 'T')", [pairId]),
    ).rejects.toThrow(/permission denied/)
    await expect(
      h.as(a, "insert into swipes (pair_id, user_id, tmdb_id, media_type, decision, title) values ($1, $2, 1, 'movie', 'like', 'T')", [pairId, b]),
    ).rejects.toThrow(/permission denied/)
  })

  it("you can read your partner's profile but not a stranger's", async () => {
    const { a, b } = await h.pair()
    const stranger = await h.user()
    const ids = (await h.as<{ id: string }>(a, 'select id from profiles')).map((r) => r.id).sort()
    expect(ids).toEqual([a, b].sort())
    expect(ids).not.toContain(stranger)
  })

  it('you can rename yourself but not your partner', async () => {
    const { a, b } = await h.pair()
    await h.as(a, "update profiles set display_name = 'Ann' where id = $1", [a])
    await h.as(a, "update profiles set display_name = 'Hacked' where id = $1", [b])
    const { rows } = await h.db.query<{ id: string; display_name: string | null }>(
      'select id, display_name from profiles where id = any($1)',
      [[a, b]],
    )
    expect(rows.find((r) => r.id === a)?.display_name).toBe('Ann')
    expect(rows.find((r) => r.id === b)?.display_name).toBeNull()
  })

  it('anon can read nothing', async () => {
    const { pairId } = await h.pair()
    await expect(
      h.db.transaction(async (tx) => {
        await tx.exec('set local role anon')
        return tx.query('select * from matches where pair_id = $1', [pairId])
      }),
    ).rejects.toThrow(/permission denied/)
  })
})
