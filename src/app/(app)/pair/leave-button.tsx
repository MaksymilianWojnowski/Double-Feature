'use client'

import { useState } from 'react'
import { t } from '@/lib/strings/en'
import { leavePair } from './actions'

const row = 'w-full px-5 py-3.5 text-left text-body transition-colors active:bg-white/10'

export function LeaveButton() {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <div className="glass overflow-hidden rounded-2xl">
        <button className={`${row} text-danger`} onClick={() => setConfirming(true)}>
          {t.pair.leave}
        </button>
      </div>
    )
  }

  // Like an iOS action sheet: the warning, the destructive choice, then cancel.
  return (
    <div role="alertdialog" aria-labelledby="leave-warning" className="flex flex-col gap-3">
      <div className="glass divide-y divide-white/10 overflow-hidden rounded-2xl">
        <p id="leave-warning" className="px-5 py-4 text-center text-small text-muted">
          {t.pair.leaveConfirm}
        </p>
        <form action={leavePair}>
          <button className={`${row} text-center font-semibold text-danger`}>{t.pair.leaveYes}</button>
        </form>
      </div>
      <div className="glass overflow-hidden rounded-2xl">
        <button className={`${row} text-center font-semibold`} onClick={() => setConfirming(false)} autoFocus>
          {t.pair.cancel}
        </button>
      </div>
    </div>
  )
}
