import { t } from '@/lib/strings/en'
import { screen } from '@/components/ui/styles'

export default function DeckPage() {
  return (
    <main className={screen}>
      <h1 className="font-display text-hero">{t.app.name}</h1>
      <p className="mt-3 text-muted">{t.deck.comingSoon}</p>
    </main>
  )
}
