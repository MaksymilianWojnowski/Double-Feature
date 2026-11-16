'use client'

import { useState, useSyncExternalStore } from 'react'
import { Share } from 'lucide-react'
import { t } from '@/lib/strings/en'
import { button } from '@/components/ui/styles'

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
    <section className="glass flex flex-col gap-5 rounded-3xl p-5">
      <p className="text-muted">{t.pair.inviteBody}</p>
      <div>
        <p className="text-small text-muted">{t.pair.inviteCode}</p>
        <p className="mt-0.5 text-title tracking-[0.15em] tabular-nums">{code}</p>
      </div>
      <button className={button} onClick={send} aria-live="polite">
        {!copied && <Share size={18} strokeWidth={2.25} aria-hidden />}
        {copied ? t.pair.copied : canShare ? t.pair.share : t.pair.copy}
      </button>
    </section>
  )
}
