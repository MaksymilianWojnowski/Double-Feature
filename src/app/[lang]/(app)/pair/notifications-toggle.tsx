'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n/client'
import { Switch } from '@/components/ui/switch'

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

type State = 'loading' | 'unsupported' | 'install' | 'blocked' | 'off' | 'on'

const keyBytes = (base64url: string) =>
  Uint8Array.from(atob((base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

const json = (method: string, body: unknown) => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

/** Match notifications on this device. On iPhone only inside the installed app (Home Screen), iOS 16.4+. */
export function NotificationsToggle() {
  const t = useT()
  const [state, setState] = useState<State>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let live = true
    ;(async () => {
      let next: State
      if (!VAPID_KEY) next = 'unsupported' // push not configured on this deployment
      else if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        next = /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'install' : 'unsupported' // iOS Safari: Home Screen apps only
      } else if (Notification.permission === 'denied') next = 'blocked'
      else {
        // Registered up front so turning it on later doesn't wait for the worker to install.
        const reg = await navigator.serviceWorker.register('/sw.js').catch(() => null)
        next = (await reg?.pushManager.getSubscription()) ? 'on' : 'off'
      }
      if (live) setState(next)
    })()
    return () => {
      live = false
    }
  }, [])

  async function toggle(on: boolean) {
    setError(false)
    // First, while the tap still counts as a user gesture: iOS only shows the prompt then.
    if (on && Notification.permission === 'default') {
      const answer = await Notification.requestPermission()
      if (answer !== 'granted') return setState(answer === 'denied' ? 'blocked' : 'off')
    }
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const current = await reg.pushManager.getSubscription()
      if (on) {
        const sub = current ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_KEY!) }))
        const r = await fetch('/api/push', json('POST', sub.toJSON()))
        if (!r.ok) throw new Error(String(r.status))
      } else if (current) {
        await fetch('/api/push', json('DELETE', { endpoint: current.endpoint }))
        await current.unsubscribe()
      }
      setState(on ? 'on' : 'off')
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  if (state === 'loading' || state === 'unsupported') return null
  const hint =
    state === 'install' ? t.pair.notificationsInstall : state === 'blocked' ? t.pair.notificationsBlocked : error ? t.pair.notificationsError : t.pair.notificationsHint
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-4 px-5 py-3">
      <div>
        <p>{t.pair.notifications}</p>
        <p className={`text-small ${error ? 'text-danger' : 'text-muted'}`}>{hint}</p>
      </div>
      {state !== 'install' && <Switch label={t.pair.notifications} checked={state === 'on'} disabled={busy || state === 'blocked'} onChange={toggle} />}
    </div>
  )
}
