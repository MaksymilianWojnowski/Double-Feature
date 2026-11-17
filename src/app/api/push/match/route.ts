import { NextResponse, type NextRequest } from 'next/server'
import { getMyPair } from '@/lib/pair'
import { notifyMatch } from '@/lib/push'

const FRESH_MS = 5 * 60_000 // only a match made just now; old ones can't be re-announced

// POST /api/push/match {matchId} → called by the browser right after its own swipe created a match:
// the partner gets a notification. RLS means you can only name a match of your own pair.
export async function POST(request: NextRequest) {
  const { supabase, partner } = await getMyPair()
  const { matchId } = await request.json().catch(() => ({}))
  if (!Number.isSafeInteger(matchId)) return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  if (!partner) return new NextResponse(null, { status: 204 })

  const { data: match } = await supabase.from('matches').select('id, title, created_at').eq('id', matchId).maybeSingle<{ id: number; title: string; created_at: string }>()
  if (!match || Date.now() - Date.parse(match.created_at) > FRESH_MS) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  await notifyMatch(partner.id, match, request.nextUrl.origin)
  return new NextResponse(null, { status: 204 })
}
