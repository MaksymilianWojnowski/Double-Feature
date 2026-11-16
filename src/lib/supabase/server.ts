import 'server-only'
import { createServerClient as create } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { connection } from 'next/server'

/** Per-request client acting as the signed-in user (RLS applies). */
export async function createServerClient() {
  // Everything behind this is per-user and per-request. Without this, Next's runtime prerender (cookies
  // available, request not yet) reaches Supabase's session-expiry check and flags its Date.now() call.
  await connection()
  const store = await cookies()
  return create(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options))
        } catch {
          // Server Components can't set cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  })
}
