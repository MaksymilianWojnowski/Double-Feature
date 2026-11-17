import { connection } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Called once a day by Vercel Cron (vercel.json). A free Supabase project pauses after a week without
 * activity, which would take the whole app down; one tiny query a day keeps it awake. Returns no data.
 */
export async function GET(request: Request) {
  await connection() // run on every call, never at build time
  const secret = process.env.CRON_SECRET // when set, Vercel sends it; then only Vercel may call this
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  const admin = createAdminClient()
  if (!admin) return Response.json({ error: 'SUPABASE_SECRET_KEY is not set' }, { status: 500 })
  const { error } = await admin.from('pairs').select('id', { count: 'exact', head: true })
  return Response.json({ ok: !error }, { status: error ? 502 : 200 })
}
