import 'server-only'
import { createClient } from '@supabase/supabase-js'

/** Service-role client (bypasses RLS). Server only. Null when the secret key isn't configured. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!key) return null
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
