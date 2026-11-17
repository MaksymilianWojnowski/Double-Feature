import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC = ['/login', '/auth', '/about', '/api/keepalive']
const isPublic = (path: string) => PUBLIC.some((p) => path === p || path.startsWith(p + '/'))

// Refreshes the Supabase session cookie on every request and gates signed-out access.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list, headers) {
          list.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
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
  // Icons and the manifest must load signed out: the phone fetches them when installing.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
}
