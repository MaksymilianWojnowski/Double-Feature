import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export type Profile = { id: string; display_name: string | null }
export type Pair = { id: string; invite_code: string }
export type PairErrorKey = 'pair_full' | 'already_paired' | 'invalid_code' | 'generic'

/** The signed-in user, their pair (if any) and their partner (if joined). Deduped per request. */
export const getMyPair = cache(async () => {
  const supabase = await createServerClient()
  const { data: auth } = await supabase.auth.getClaims()
  const uid = auth?.claims.sub
  if (!uid) redirect('/login')

  const [{ data: profiles }, { data: pair }] = await Promise.all([
    supabase.from('profiles').select('id, display_name').returns<Profile[]>(), // RLS: self + partner
    supabase.from('pairs').select('id, invite_code').maybeSingle<Pair>(),
  ])
  const me = profiles?.find((p) => p.id === uid) ?? { id: uid, display_name: null }
  const partner = profiles?.find((p) => p.id !== uid) ?? null
  return { supabase, me, pair: pair ?? null, partner }
})

/** Maps a Postgres exception from the pair RPCs to a strings key. */
export function pairErrorKey(message: string): PairErrorKey {
  return (['pair_full', 'already_paired', 'invalid_code'] as const).find((k) => message.includes(k)) ?? 'generic'
}
