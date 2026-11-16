'use client'

import { useState } from 'react'
import { t } from '@/lib/strings/en'
import { buttonQuiet, link } from '@/components/ui/styles'
import { leavePair } from './actions'

export function LeaveButton() {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <button className={link} onClick={() => setConfirming(true)}>
        {t.pair.leave}
      </button>
    )
  }

  return (
    <div role="alertdialog" aria-labelledby="leave-warning" className="flex w-full flex-col gap-4 border-t border-line pt-6">
      <p id="leave-warning" className="text-ink">
        {t.pair.leaveConfirm}
      </p>
      <form action={leavePair}>
        <button className={buttonQuiet}>{t.pair.leaveYes}</button>
      </form>
      <button className={link} onClick={() => setConfirming(false)} autoFocus>
        {t.pair.cancel}
      </button>
    </div>
  )
}
