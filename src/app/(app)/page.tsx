import { t } from '@/lib/strings/en'
import { Deck } from '@/components/deck/deck'

export default function DeckPage() {
  return (
    // Bottom padding clears the floating tab bar.
    <main className="mx-auto flex h-dvh w-full max-w-sm flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <h1 className="sr-only">{t.app.name}</h1>
      <Deck />
    </main>
  )
}
