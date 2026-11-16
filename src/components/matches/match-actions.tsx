'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Star } from 'lucide-react'
import { t } from '@/lib/strings/en'
import { createClient } from '@/lib/supabase/browser'
import type { MatchItem } from '@/lib/matches'
import { button, link } from '@/components/ui/styles'
import type { Patch } from './matches-view'

/** Optimistic: patch the list, write under RLS, revert and say so if the write fails. */
function useMatchWrite(match: MatchItem, onPatch: (id: number, p: Patch) => void) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [error, setError] = useState('')
  async function write(next: Patch, previous: Patch, op: (s: typeof supabase) => PromiseLike<{ error: unknown }>) {
    setError('')
    onPatch(match.id, next)
    const { error } = await op(supabase)
    if (error) {
      onPatch(match.id, previous)
      setError(t.matches.saveError)
    } else router.refresh()
  }
  return { write, error }
}

export function MatchActions({ match, partnerName, onPatch }: { match: MatchItem; partnerName: string; onPatch: (id: number, p: Patch) => void }) {
  const { write, error } = useMatchWrite(match, onPatch)

  const toggleWatched = () => {
    const watchedAt = match.watchedAt ? null : new Date().toISOString()
    write({ watchedAt }, { watchedAt: match.watchedAt }, (s) => s.from('matches').update({ watched_at: watchedAt }).eq('id', match.id))
  }
  const rate = (n: number) => {
    const next = match.myRating === n ? null : n // tapping your current rating clears it
    write({ myRating: next }, { myRating: match.myRating }, (s) => s.rpc('rate_match', { p_match_id: match.id, p_rating: next }))
  }

  return (
    <div className="flex flex-col gap-3">
      {match.watchedAt ? (
        <>
          {/* Ratings only make sense once you've both seen it. */}
          <div className="divide-y divide-white/10 overflow-hidden rounded-2xl bg-white/[0.07]">
            <Stars label={t.matches.yourRating} value={match.myRating} onRate={rate} />
            <Stars label={t.matches.partnerRating(partnerName)} value={match.partnerRating} />
          </div>
          <button type="button" className={`${link} self-start px-1`} onClick={toggleWatched}>
            {t.matches.unwatch}
          </button>
        </>
      ) : (
        <button type="button" className={button} onClick={toggleWatched}>
          <Check size={18} strokeWidth={2.5} aria-hidden /> {t.matches.markWatched}
        </button>
      )}
      {error && (
        <p role="alert" className="px-1 text-small text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

function Stars({ label, value, onRate }: { label: string; value: number | null; onRate?: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-body">{label}</span>
      {!onRate && value === null ? (
        <span className="text-small text-muted">{t.matches.notRated}</span>
      ) : (
        <div role={onRate ? 'radiogroup' : 'img'} aria-label={onRate ? label : `${value} / 5`} className="flex">
          {[1, 2, 3, 4, 5].map((n) => {
            const star = <Star size={22} strokeWidth={1.75} fill={n <= (value ?? 0) ? 'currentColor' : 'none'} aria-hidden />
            return onRate ? (
              <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={t.matches.rate(n)} onClick={() => onRate(n)} className="p-1 transition active:scale-90">
                {star}
              </button>
            ) : (
              <span key={n} className="p-1 text-muted">
                {star}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function RemoveMatch({ match, onPatch }: { match: MatchItem; onPatch: (id: number, p: Patch) => void }) {
  const { write, error } = useMatchWrite(match, onPatch)
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <button type="button" className="self-start px-1 text-small font-medium text-danger" onClick={() => setConfirming(true)}>
        {t.matches.remove}
      </button>
    )
  }
  return (
    <div role="alertdialog" aria-labelledby="remove-warning" className="divide-y divide-white/10 overflow-hidden rounded-2xl bg-white/[0.07]">
      <p id="remove-warning" className="px-4 py-3 text-center text-small text-muted">
        {t.matches.removeConfirm}
      </p>
      <button
        type="button"
        className="w-full py-3 font-semibold text-danger active:bg-white/10"
        onClick={() => write('removed', {}, (s) => s.from('matches').delete().eq('id', match.id))}
      >
        {t.matches.removeYes}
      </button>
      <button type="button" className="w-full py-3 active:bg-white/10" onClick={() => setConfirming(false)} autoFocus>
        {t.matches.cancel}
      </button>
      {error && <p className="px-4 py-3 text-small text-danger">{error}</p>}
    </div>
  )
}
