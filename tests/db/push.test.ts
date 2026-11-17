import { beforeEach, describe, expect, it } from 'vitest'
import { makeDb } from './harness'

let h: Awaited<ReturnType<typeof makeDb>>
beforeEach(async () => {
  h = await makeDb()
})

describe('push_subscriptions', () => {
  it('is invisible to signed-in users (only the server reads it)', async () => {
    const { a } = await h.pair()
    await h.asService("insert into push_subscriptions (endpoint, user_id, p256dh, auth) values ('https://push.example/1', $1, 'k', 'a')", [a])
    await expect(h.as(a, 'select * from push_subscriptions')).rejects.toThrow(/permission denied/)
  })

  it('goes away with the user', async () => {
    const { a } = await h.pair()
    await h.asService("insert into push_subscriptions (endpoint, user_id, p256dh, auth) values ('https://push.example/1', $1, 'k', 'a')", [a])
    await h.db.query('delete from auth.users where id = $1', [a])
    expect(await h.asService('select * from push_subscriptions')).toHaveLength(0)
  })
})
