import { beforeAll, describe, expect, it } from 'vitest'
import { makeDb } from './harness'

let h: Awaited<ReturnType<typeof makeDb>>
beforeAll(async () => {
  h = await makeDb()
})

describe('pairs', () => {
  it('create_pair returns an 8-char code from the unambiguous alphabet and adds the creator', async () => {
    const a = await h.user()
    const [p] = await h.as<{ id: string; invite_code: string }>(a, 'select * from create_pair()')
    expect(p.invite_code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/)
    const members = await h.as<{ user_id: string }>(a, 'select user_id from pair_members')
    expect(members.map((m) => m.user_id)).toEqual([a])
    const settings = await h.as<{ region: string; content_type: string }>(a, 'select * from pair_settings')
    expect(settings[0]).toMatchObject({ region: 'PL', content_type: 'both' })
  })

  it('join_pair accepts lowercase codes with spaces', async () => {
    const a = await h.user()
    const b = await h.user()
    const [p] = await h.as<{ invite_code: string }>(a, 'select * from create_pair()')
    const messy = ` ${p.invite_code.slice(0, 4).toLowerCase()} ${p.invite_code.slice(4)} `
    await h.as(b, 'select join_pair($1)', [messy])
    expect(await h.as(b, 'select * from pair_members')).toHaveLength(2)
  })

  it('opening your own invite link is a no-op', async () => {
    const a = await h.user()
    const [p] = await h.as<{ invite_code: string }>(a, 'select * from create_pair()')
    await expect(h.as(a, 'select join_pair($1)', [p.invite_code])).resolves.toBeDefined()
  })

  it('a third person gets pair_full', async () => {
    const { code } = await h.pair()
    const c = await h.user()
    await expect(h.as(c, 'select join_pair($1)', [code])).rejects.toThrow('pair_full')
  })

  it('someone already in a pair gets already_paired', async () => {
    const { a } = await h.pair()
    const x = await h.user()
    const [other] = await h.as<{ invite_code: string }>(x, 'select * from create_pair()')
    await expect(h.as(a, 'select join_pair($1)', [other.invite_code])).rejects.toThrow('already_paired')
    await expect(h.as(a, 'select create_pair()')).rejects.toThrow('already_paired')
  })

  it('a bad code gets invalid_code', async () => {
    const c = await h.user()
    await expect(h.as(c, 'select join_pair($1)', ['NOPE1234'])).rejects.toThrow('invalid_code')
  })

  it('leave_pair dissolves the pair and everything in it, for both people', async () => {
    const { a, b, pairId, swipe } = await h.pair()
    await swipe(a, 10, 'like')
    await swipe(b, 10, 'like')
    await h.as(a, 'select leave_pair()')
    for (const table of ['pairs', 'pair_members', 'pair_settings', 'swipes', 'matches']) {
      const col = table === 'pairs' ? 'id' : 'pair_id'
      const { rows } = await h.db.query(`select 1 from ${table} where ${col} = $1`, [pairId])
      expect(rows, table).toHaveLength(0)
    }
    // both are free to pair again
    await expect(h.as(b, 'select create_pair()')).resolves.toBeDefined()
  })

  it('pair_stats counts swipes per person, matches and watched', async () => {
    const { a, b, swipe } = await h.pair()
    await swipe(a, 1, 'like')
    await swipe(a, 2, 'pass')
    await swipe(a, 3, 'like')
    await swipe(b, 1, 'like')
    await swipe(b, 3, 'like')
    await h.as(a, 'update matches set watched_at = now() where tmdb_id = 3')
    const [s] = await h.as(a, 'select * from pair_stats()')
    expect(s).toEqual({ my_swipes: 3, partner_swipes: 2, matches: 2, watched: 1 })
  })
})
