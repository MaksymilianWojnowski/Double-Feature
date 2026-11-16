'use client'

import { useState, useSyncExternalStore } from 'react'
import { t } from '@/lib/strings/en'
import { button, label } from '@/components/ui/styles'

const noop = () => () => {}

export function InviteLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  // Server renders "copy"; phones with a share sheet switch to "share" after hydration without a mismatch.
  const canShare = useSyncExternalStore(noop, () => 'share' in navigator, () => false)

  async function send() {
    const url = `${window.location.origin}/join/${code}`
    if (canShare) {
      await navigator.share({ title: t.app.name, url }).catch(() => {}) // dismissed share sheet
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <section className="mt-12 flex flex-col gap-6">
      <p className="text-muted">{t.pair.inviteBody}</p>
      <div>
        <p className={label}>{t.pair.inviteCode}</p>
        <p className="mt-1 font-display text-title tracking-[0.2em]">{code}</p>
      </div>
      <button className={button} onClick={send} aria-live="polite">
        {copied ? t.pair.copied : canShare ? t.pair.share : t.pair.copy}
      </button>
    </section>
  )
}
