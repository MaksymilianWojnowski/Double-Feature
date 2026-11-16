'use client' // Error boundaries must be Client Components

import { t } from '@/lib/strings/en'
import { buttonQuiet, screen } from '@/components/ui/styles'

/** Friendly fallback when a page fails to load (e.g. Supabase unreachable). */
export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className={`${screen} justify-center`}>
      <div className="glass rounded-3xl p-6">
        <h1 className="text-title">{t.errors.title}</h1>
        <p className="mt-2 text-muted">{t.errors.body}</p>
        <button type="button" className={`${buttonQuiet} mt-6`} onClick={() => retry()}>
          {t.deck.retry}
        </button>
      </div>
    </main>
  )
}
