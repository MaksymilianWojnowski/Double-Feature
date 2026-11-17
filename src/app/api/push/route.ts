import { NextResponse, type NextRequest } from 'next/server'
import { getMyPair } from '@/lib/pair'
import { createAdminClient } from '@/lib/supabase/admin'
import { requestLocale } from '@/lib/i18n/locales'

type Body = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }
const isText = (x: unknown, max: number): x is string => typeof x === 'string' && x.length > 0 && x.length <= max

// POST /api/push {endpoint, keys} → this device gets match notifications for the signed-in user.
export async function POST(request: NextRequest) {
  const { me } = await getMyPair()
  const body: Body = await request.json().catch(() => ({}))
  const { endpoint, keys } = body
  if (!isText(endpoint, 1000) || !endpoint.startsWith('https://') || !isText(keys?.p256dh, 200) || !isText(keys?.auth, 100)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  // A device belongs to whoever signed in on it last.
  const { error } = await admin
    .from('push_subscriptions')
    .upsert({ endpoint, user_id: me.id, p256dh: keys.p256dh, auth: keys.auth, locale: requestLocale(request) })
  if (error) throw error
  return new NextResponse(null, { status: 204 })
}

// DELETE /api/push {endpoint} → stop notifications on this device.
export async function DELETE(request: NextRequest) {
  const { me } = await getMyPair()
  const { endpoint }: Body = await request.json().catch(() => ({}))
  if (!isText(endpoint, 1000)) return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  const { error } = await admin.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', me.id)
  if (error) throw error
  return new NextResponse(null, { status: 204 })
}
