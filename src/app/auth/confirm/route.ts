import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { safeNext } from '@/lib/safe-next'

// Two kinds of sign-in link land here:
// - custom email template (needs custom SMTP): ?token_hash=&type= — works in any browser;
// - Supabase's default template: ?code= (PKCE) — works only in the browser that asked for the email.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (code || (tokenHash && type)) {
    const supabase = await createServerClient()
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type! })
    if (!error) return NextResponse.redirect(new URL(safeNext(searchParams.get('next'), origin), origin))
  }
  return NextResponse.redirect(new URL('/login?error=link', origin))
}
