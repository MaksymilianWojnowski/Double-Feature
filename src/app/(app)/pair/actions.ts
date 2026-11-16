'use server'

import { redirect } from 'next/navigation'
import { getMyPair } from '@/lib/pair'

export async function leavePair() {
  const { supabase } = await getMyPair()
  const { error } = await supabase.rpc('leave_pair')
  if (error) throw error
  redirect('/onboarding')
}
