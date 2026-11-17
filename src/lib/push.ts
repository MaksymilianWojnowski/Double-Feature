import 'server-only'
import { sendNotification, WebPushError } from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { STRINGS } from '@/lib/strings'
import { isLocale } from '@/lib/i18n/locales'

type Row = { endpoint: string; p256dh: string; auth: string; locale: string }

/** Both VAPID keys set: push is on. Without them the app works, just without notifications. */
export const pushConfigured = () => !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)

/**
 * "It's a match" on every device the user turned notifications on, in each device's language.
 * Subscriptions the push service says are gone (404/410) are deleted. Never throws.
 */
export async function notifyMatch(userId: string, match: { id: number; title: string }, origin: string) {
  const admin = createAdminClient()
  if (!admin || !pushConfigured()) return
  const { data, error } = await admin.from('push_subscriptions').select('endpoint, p256dh, auth, locale').eq('user_id', userId)
  if (error) return console.warn('push: subscriptions not loaded', error.message)

  const vapidDetails = {
    // The push service may contact this address about abuse; must be https: or mailto:.
    subject: process.env.VAPID_SUBJECT || (origin.startsWith('https://') ? origin : 'mailto:push@localhost.invalid'),
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    privateKey: process.env.VAPID_PRIVATE_KEY!,
  }
  await Promise.all(
    (data as Row[]).map(async (s) => {
      const t = STRINGS[isLocale(s.locale) ? s.locale : 'en']
      const payload = JSON.stringify({ title: t.match.title, body: t.push.body(match.title), url: '/matches', tag: `match-${match.id}` })
      try {
        await sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          vapidDetails,
          TTL: 60 * 60 * 24, // still worth knowing tomorrow
          urgency: 'high',
        })
      } catch (e) {
        if (e instanceof WebPushError && (e.statusCode === 404 || e.statusCode === 410)) {
          await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
        } else console.warn('push: send failed', e instanceof WebPushError ? e.statusCode : e)
      }
    }),
  )
}
