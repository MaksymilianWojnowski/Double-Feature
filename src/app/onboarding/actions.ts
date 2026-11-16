'use server'

import { redirect } from 'next/navigation'
import { getMyPair } from '@/lib/pair'

export async function saveName(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim().slice(0, 40)
  if (!name) return
  const { supabase, me } = await getMyPair()
  await supabase.from('profiles').update({ display_name: name }).eq('id', me.id)
  redirect('/onboarding')
}

export async function createPair() {
  const { supabase } = await getMyPair()
  const { error } = await supabase.rpc('create_pair')
  if (error && !error.message.includes('already_paired')) throw error
  redirect('/pair')
}

export async function goToCode(formData: FormData) {
  const code = String(formData.get('code') ?? '').replace(/\s/g, '').toUpperCase()
  if (code) redirect(`/join/${encodeURIComponent(code)}`)
}
