import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { safeNext } from '@/lib/safe-next'

// token_hash flow (not PKCE), so a link opened in a different browser than the one that asked still works.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (tokenHash && type) {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) return NextResponse.redirect(new URL(safeNext(searchParams.get('next'), origin), origin))
  }
  return NextResponse.redirect(new URL('/login?error=link', origin))
}
