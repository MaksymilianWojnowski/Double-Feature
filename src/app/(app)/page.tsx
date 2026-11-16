import { Deck } from '@/components/deck/deck'

export default function DeckPage() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-sm flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(3.25rem+env(safe-area-inset-bottom))]">
      <Deck />
    </main>
  )
}
