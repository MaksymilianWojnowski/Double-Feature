import { Heart, RotateCcw, X } from 'lucide-react'
import { t } from '@/lib/strings/en'
import type { Decision } from './use-deck'

const square = 'flex size-16 items-center justify-center rounded-sm border transition-colors disabled:opacity-30'

// Thumb zone: like on the right, where a right thumb rests; undo small and out of the way.
export function ActionBar({
  onDecide,
  onUndo,
  canUndo,
  disabled,
}: {
  onDecide: (d: Decision) => void
  onUndo: () => void
  canUndo: boolean
  disabled: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-4">
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label={t.deck.undo}
        className="flex size-11 items-center justify-center text-muted hover:text-ink disabled:opacity-30"
      >
        <RotateCcw size={20} strokeWidth={1.5} />
      </button>
      <button
        type="button"
        onClick={() => onDecide('pass')}
        disabled={disabled}
        aria-label={t.deck.pass}
        className={`${square} border-line text-ink hover:border-muted`}
      >
        <X size={28} strokeWidth={1.25} />
      </button>
      <button
        type="button"
        onClick={() => onDecide('seen')}
        disabled={disabled}
        className="h-11 px-2 text-small text-muted hover:text-ink disabled:opacity-30"
      >
        {t.deck.seen}
      </button>
      <button
        type="button"
        onClick={() => onDecide('like')}
        disabled={disabled}
        aria-label={t.deck.like}
        className={`${square} border-accent/60 text-accent hover:border-accent`}
      >
        <Heart size={26} strokeWidth={1.25} />
      </button>
    </div>
  )
}
