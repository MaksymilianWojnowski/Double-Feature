'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getMyPair } from '@/lib/pair'
import { watchRegions } from '@/lib/tmdb/client'

export async function saveName(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim().slice(0, 40)
  if (!name) return
  const { supabase, me } = await getMyPair()
  await supabase.from('profiles').update({ display_name: name }).eq('id', me.id)
  redirect('/onboarding')
}

export async function createPair() {
  const { supabase } = await getMyPair()
  const { data: pair, error } = await supabase.rpc('create_pair')
  if (error && !error.message.includes('already_paired')) throw error
  // Start on the creator's country (Vercel's geo header) when TMDB has streaming data for it.
  const country = (await headers()).get('x-vercel-ip-country')
  const pairId = (pair as { id: string } | null)?.id
  if (pairId && country && country !== 'PL' && (await watchRegions().catch((): string[] => [])).includes(country)) {
    await supabase.from('pair_settings').update({ region: country }).eq('pair_id', pairId)
  }
  redirect('/')
}

export async function goToCode(formData: FormData) {
  const code = String(formData.get('code') ?? '').replace(/\s/g, '').toUpperCase()
  if (code) redirect(`/join/${encodeURIComponent(code)}`)
}
