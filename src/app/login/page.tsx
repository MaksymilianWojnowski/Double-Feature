import { Suspense } from 'react'
import { t } from '@/lib/strings/en'
import { screen } from '@/components/ui/styles'
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <main className={screen}>
      <h1 className="font-display text-hero">{t.app.name}</h1>
      <p className="mt-3 text-muted">{t.app.tagline}</p>
      <div className="mt-auto pt-16">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
