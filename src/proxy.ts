import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isLocale, requestLocale } from '@/lib/i18n/locales'

const PUBLIC = ['/login', '/auth', '/about', '/api/keepalive']
const isPublic = (path: string) => PUBLIC.some((p) => path === p || path.startsWith(p + '/'))

// Pages live under app/[lang]; URLs don't show it. /matches is served from /pl/matches, the language being
// the saved choice or else the browser's. Route handlers (/api, /auth) sit outside [lang] and aren't rewritten.
function localeRewrite(request: NextRequest): URL | null {
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/api/') || pathname.startsWith('/auth/') || isLocale(pathname.split('/')[1])) return null
  const url = request.nextUrl.clone()
  url.pathname = `/${requestLocale(request)}${pathname === '/' ? '' : pathname}`
  return url
}

// Refreshes the Supabase session cookie on every request, gates signed-out access and picks the language.
export async function proxy(request: NextRequest) {
  const rewrite = localeRewrite(request)
  const pass = () => (rewrite ? NextResponse.rewrite(rewrite, { request }) : NextResponse.next({ request }))
  let response = pass()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list, headers) {
          list.forEach(({ name, value }) => request.cookies.set(name, value))
          response = pass()
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v))
        },
      },
    },
  )

  const { data } = await supabase.auth.getClaims()
  const { pathname, search } = request.nextUrl

  if (!data?.claims && !isPublic(pathname)) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(pathname + search)}`
    return NextResponse.redirect(url)
  }

  if (data?.claims && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // Icons, the manifest and the service worker must load signed out: the phone fetches them when installing.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon|apple-icon|sw.js|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
}
