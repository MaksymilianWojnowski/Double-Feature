'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { safeNext } from '@/lib/safe-next'
import { useT } from '@/lib/i18n/client'
import { button, field, label, link } from '@/components/ui/styles'

export function LoginForm() {
  const t = useT()
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(params.get('error') === 'link' ? t.login.errors.link : '')

  const next = () => safeNext(params.get('next'), window.location.origin)

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await createClient().auth.signInWithOtp({
      email,
      // The email template appends token_hash to this URL (see README).
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next())}` },
    })
    setBusy(false)
    if (error) setError(t.login.errors.send)
    else setStep('code')
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await createClient().auth.verifyOtp({ email, token: code.trim(), type: 'email' })
    if (error) {
      setBusy(false)
      setError(t.login.errors.code)
      return
    }
    router.replace(next())
    router.refresh()
  }

  if (step === 'code') {
    return (
      <form onSubmit={verifyCode} className="flex flex-col gap-6">
        <div>
          <h2 className="text-title">{t.login.sentTitle}</h2>
          <p className="mt-2 text-muted">{t.login.sentBody}</p>
        </div>
        <label className="flex flex-col gap-1">
          <span className={label}>{t.login.codeLabel}</span>
          <input
            className={`${field} tracking-[0.3em]`}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6,10}"
            maxLength={10}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
        </label>
        {error && <p role="alert" className="text-small text-ink">{error}</p>}
        <button className={button} disabled={busy}>
          {busy ? t.login.verifying : t.login.verify}
        </button>
        <button type="button" className={link} onClick={() => (setStep('email'), setCode(''), setError(''))}>
          {t.login.otherEmail}
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={sendEmail} className="flex flex-col gap-6">
      <label className="flex flex-col gap-1">
        <span className={label}>{t.login.emailLabel}</span>
        <input
          className={field}
          type="email"
          autoComplete="email"
          placeholder={t.login.emailPlaceholder}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      {error && <p role="alert" className="text-small text-ink">{error}</p>}
      <button className={button} disabled={busy}>
        {busy ? t.login.sending : t.login.send}
      </button>
    </form>
  )
}
