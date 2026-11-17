import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getMyPair } from '@/lib/pair'
import { getT } from '@/lib/i18n/server'
import { button, buttonQuiet, field, label, link, screen, title } from '@/components/ui/styles'
import { createPair, goToCode, saveName } from './actions'
import { PosterBackdrop } from '@/components/ui/poster-backdrop'

export default function OnboardingPage() {
  return (
    <main className={screen}>
      <PosterBackdrop />
      <Suspense>
        <Onboarding />
      </Suspense>
    </main>
  )
}

async function Onboarding() {
  const t = await getT()
  const { me, pair } = await getMyPair()

  if (!me.display_name) {
    return (
      <form action={saveName} className="flex flex-1 flex-col">
        <h1 className={title}>{t.onboarding.nameTitle}</h1>
        <div className="mt-auto flex flex-col gap-6 pt-16">
          <label className="flex flex-col gap-1">
            <span className={label}>{t.onboarding.nameLabel}</span>
            <input name="name" className={field} maxLength={40} required autoFocus autoComplete="given-name" />
          </label>
          <button className={button}>{t.onboarding.save}</button>
        </div>
      </form>
    )
  }

  if (pair) redirect('/')

  return (
    <div className="flex flex-1 flex-col">
      <h1 className={title}>{t.onboarding.startTitle}</h1>
      <p className="mt-3 text-muted">{t.onboarding.startBody}</p>
      <div className="mt-auto flex flex-col gap-6 pt-16">
        {/* Solo first: a pair of one, made in the background. The partner can join any time from the Pair tab. */}
        <form action={createPair}>
          <button className={button}>{t.onboarding.start}</button>
        </form>
        {/* Most people arrive through an invite link; the code is the fallback, so it stays folded away. */}
        <details className="group">
          <summary className={`${link} cursor-pointer list-none text-center [&::-webkit-details-marker]:hidden`}>{t.onboarding.haveCode}</summary>
          <form action={goToCode} className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className={label}>{t.onboarding.codeLabel}</span>
              <input
                name="code"
                className={`${field} uppercase tracking-[0.2em]`}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                required
              />
            </label>
            <button className={buttonQuiet}>{t.onboarding.join}</button>
          </form>
        </details>
      </div>
    </div>
  )
}
