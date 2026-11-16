import { Suspense } from 'react'
import Link from 'next/link'
import { t } from '@/lib/strings/en'
import { link, screen } from '@/components/ui/styles'
import { LoginForm } from './login-form'
import { PosterBackdrop } from '@/components/ui/poster-backdrop'

export default function LoginPage() {
  return (
    <main className={screen}>
      <PosterBackdrop />
      <h1 className="text-hero">{t.app.name}</h1>
      <p className="mt-3 text-muted">{t.app.tagline}</p>
      <div className="mt-auto pt-16">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
      <footer className="mt-8 flex flex-col items-center gap-1 text-center">
        <p className="text-small text-faint">{t.about.tmdbNotice}</p>
        <Link href="/about" className={link}>
          {t.about.title}
        </Link>
      </footer>
    </main>
  )
}
