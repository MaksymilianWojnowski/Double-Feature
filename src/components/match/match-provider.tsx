'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/browser'
import type { Match } from '@/components/deck/use-deck'
import { MatchMoment } from './match-moment'

const MatchContext = createContext<(m: Match) => void>(() => {})

/** Call with a match your own swipe just created: shows the match moment and notifies the partner's devices. */
export const useMatchMoment = () => useContext(MatchContext)

/**
 * Shows the match moment for matches from your own swipes (via the deck) and, live, from your partner's
 * (Supabase Realtime INSERTs on `matches`; RLS decides who receives them).
 */
export function MatchProvider({ pairId, children }: { pairId: string; children: React.ReactNode }) {
  const router = useRouter()
  const [queue, setQueue] = useState<Match[]>([])
  const shown = useRef(new Set<number>()) // your own match arrives twice: RPC result + realtime echo
  const notified = useRef(new Set<number>())

  const show = useCallback((m: Match) => {
    if (shown.current.has(m.id)) return
    shown.current.add(m.id)
    setQueue((q) => [...q, m])
  }, [])

  // Only the swipe that made the match reports it, so the partner hears about it once. Fire and forget.
  const own = useCallback(
    (m: Match) => {
      if (!notified.current.has(m.id)) {
        notified.current.add(m.id)
        fetch('/api/push/match', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ matchId: m.id }), keepalive: true }).catch(() => {})
      }
      show(m)
    },
    [show],
  )

  useEffect(() => {
    const supabase = createClient()
    let channel: RealtimeChannel | undefined
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      if (data.session) await supabase.realtime.setAuth(data.session.access_token) // realtime evaluates RLS as you
      channel = supabase
        .channel(`pair:${pairId}:matches`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches', filter: `pair_id=eq.${pairId}` }, (payload) => {
          show(payload.new as Match)
          router.refresh() // the Matches list, if it's on screen
        })
        .subscribe()
    })()
    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [pairId, show, router])

  return (
    <MatchContext value={own}>
      {children}
      <MatchMoment match={queue[0] ?? null} onDone={() => setQueue((q) => q.slice(1))} />
    </MatchContext>
  )
}
