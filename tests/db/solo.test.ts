import { beforeEach, describe, expect, it } from 'vitest'
import { makeDb } from './harness'

let h: Awaited<ReturnType<typeof makeDb>>
beforeEach(async () => {
  h = await makeDb()
})

const swipe = (uid: string, id: number, decision: string) =>
  h.as(uid, 'select * from swipe($1, $2, $3, $4)', [id, 'movie', decision, `T${id}`])
const solo = async () => {
  const uid = await h.user()
  const [p] = await h.as<{ id: string; invite_code: string }>(uid, 'select * from create_pair()')
  return { uid, pairId: p.id, code: p.invite_code }
}
const matchesOf = (pairId: string) =>
  h.db.query<{ tmdb_id: number }>('select tmdb_id from matches where pair_id = $1 order by tmdb_id', [pairId]).then((r) => r.rows.map((m) => m.tmdb_id))

describe('joining from solo', () => {
  it('brings your swipes along and turns titles you both liked into matches', async () => {
    const a = await solo()
    const b = await solo()
    await swipe(a.uid, 1, 'like')
    await swipe(a.uid, 2, 'like')
    await swipe(a.uid, 3, 'pass')
    await swipe(b.uid, 1, 'like') // both liked → match
    await swipe(b.uid, 3, 'like') // a passed → no match
    await swipe(b.uid, 4, 'like') // only b → no match

    await h.as(b.uid, 'select join_pair($1)', [a.code])

    expect(await matchesOf(a.pairId)).toEqual([1])
    const moved = await h.db.query('select * from swipes where user_id = $1 and pair_id = $2', [b.uid, a.pairId])
    expect(moved.rows).toHaveLength(3)
    const gone = await h.db.query('select * from pairs where id = $1', [b.pairId])
    expect(gone.rows).toHaveLength(0) // the solo pair (and its settings) are deleted
  })

  it('keeps matching normally afterwards', async () => {
    const a = await solo()
    const b = await solo()
    await h.as(b.uid, 'select join_pair($1)', [a.code])
    await swipe(a.uid, 7, 'like')
    expect(await swipe(b.uid, 7, 'like')).toHaveLength(1)
  })

  it('changes nothing when the pair you join is already full', async () => {
    const { code } = await h.pair()
    const c = await solo()
    await swipe(c.uid, 1, 'like')
    await expect(h.as(c.uid, 'select join_pair($1)', [code])).rejects.toThrow('pair_full')
    const still = await h.db.query('select * from swipes where user_id = $1 and pair_id = $2', [c.uid, c.pairId])
    expect(still.rows).toHaveLength(1)
  })

  it('opening your own invite link changes nothing', async () => {
    const a = await solo()
    await swipe(a.uid, 1, 'like')
    await h.as(a.uid, 'select join_pair($1)', [a.code])
    expect((await h.db.query('select * from pair_members where pair_id = $1', [a.pairId])).rows).toHaveLength(1)
  })
})
