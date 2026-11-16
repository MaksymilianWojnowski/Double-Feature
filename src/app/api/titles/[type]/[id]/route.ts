import { NextResponse, type NextRequest } from 'next/server'
import { details } from '@/lib/tmdb/client'
import { TmdbError } from '@/lib/tmdb/fetch-retry'
import type { TitleDetails } from '@/lib/tmdb/types'

// GET /api/titles/movie/603?region=PL → details with that region's providers. Public data: CDN-cached for a day.
export async function GET(request: NextRequest, ctx: RouteContext<'/api/titles/[type]/[id]'>) {
  const { type, id } = await ctx.params
  const region = request.nextUrl.searchParams.get('region') ?? 'PL'
  if ((type !== 'movie' && type !== 'tv') || !/^\d{1,9}$/.test(id) || !/^[A-Z]{2}$/.test(region)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  try {
    const d = await details(type, Number(id))
    const body: TitleDetails = { ...d, providers: d.providers[region] ?? null }
    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    })
  } catch (e) {
    if (e instanceof TmdbError) return NextResponse.json({ error: 'tmdb' }, { status: e.status === 404 ? 404 : 502 })
    throw e
  }
}
