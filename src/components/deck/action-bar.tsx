import { Heart, RotateCcw, X } from 'lucide-react'
import { t } from '@/lib/strings/en'
import { iconButton } from '@/components/ui/styles'
import type { Decision } from './use-deck'

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
    <div className="flex items-center justify-center gap-4 py-4">
      <button type="button" onClick={onUndo} disabled={!canUndo} aria-label={t.deck.undo} className={`${iconButton} size-11 text-white/80`}>
        <RotateCcw size={18} strokeWidth={2.25} />
      </button>
      <button type="button" onClick={() => onDecide('pass')} disabled={disabled} aria-label={t.deck.pass} className={`${iconButton} size-16`}>
        <X size={28} strokeWidth={2.25} />
      </button>
      <button
        type="button"
        onClick={() => onDecide('seen')}
        disabled={disabled}
        className="glass h-11 rounded-full px-4 text-small font-semibold text-white/85 transition active:scale-95 disabled:opacity-30"
      >
        {t.deck.seen}
      </button>
      <button type="button" onClick={() => onDecide('like')} disabled={disabled} aria-label={t.deck.like} className={`${iconButton} glass-accent size-16`}>
        <Heart size={26} strokeWidth={2.25} fill="currentColor" />
      </button>
    </div>
  )
}
