import { NextResponse, type NextRequest } from 'next/server'
import { providers } from '@/lib/tmdb/client'
import { TmdbError } from '@/lib/tmdb/fetch-retry'

// GET /api/providers?region=PL → streaming services in that region. Public data: CDN-cached for a day.
export async function GET(request: NextRequest) {
  const region = request.nextUrl.searchParams.get('region') ?? ''
  if (!/^[A-Z]{2}$/.test(region)) return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  try {
    return NextResponse.json(await providers(region), {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    })
  } catch (e) {
    if (e instanceof TmdbError) return NextResponse.json({ error: 'tmdb' }, { status: 502 })
    throw e
  }
}
