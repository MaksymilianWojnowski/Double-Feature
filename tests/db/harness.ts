import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..', '..')
const migrationsDir = join(root, 'supabase', 'migrations')

/** Fresh in-memory Postgres with the Supabase stub and every migration applied. */
export async function makeDb() {
  const db = new PGlite()
  await db.exec(readFileSync(join(import.meta.dirname, 'supabase-stub.sql'), 'utf8'))
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(migrationsDir, file), 'utf8'))
  }

  let n = 0
  /** Creates an auth user (and, via trigger, a profile). Returns its id. */
  async function user(name = `u${++n}`) {
    const { rows } = await db.query<{ id: string }>(
      'insert into auth.users (email) values ($1) returning id',
      [`${name}@test.local`],
    )
    return rows[0].id
  }

  /** Runs one statement as an authenticated user, with RLS in force. */
  async function as<T = Record<string, unknown>>(uid: string, sql: string, params: unknown[] = []) {
    return db.transaction(async (tx) => {
      await tx.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: uid, role: 'authenticated' }),
      ])
      await tx.exec('set local role authenticated')
      return (await tx.query<T>(sql, params)).rows
    })
  }

  /** Two users in one pair, plus helpers to swipe as either. */
  async function pair() {
    const a = await user()
    const b = await user()
    const [p] = await as<{ id: string; invite_code: string }>(a, 'select * from create_pair()')
    await as(b, 'select join_pair($1)', [p.invite_code])
    const swipe = (uid: string, tmdbId: number, decision: 'like' | 'pass' | 'seen', mediaType = 'movie') =>
      as(
        uid,
        `insert into swipes (pair_id, tmdb_id, media_type, decision, title)
         values ($1, $2, $3, $4, 'T')
         on conflict (user_id, tmdb_id, media_type) do update set decision = excluded.decision`,
        [p.id, tmdbId, mediaType, decision],
      )
    const matches = () =>
      db.query<{ tmdb_id: number; media_type: string }>('select * from matches where pair_id = $1', [p.id]).then((r) => r.rows)
    return { a, b, pairId: p.id, code: p.invite_code, swipe, matches }
  }

  return { db, user, as, pair }
}
