'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { preloadPoster } from '@/lib/tmdb/images'
import type { Card, TitleDetails } from '@/lib/tmdb/types'
import type { DeckResponse } from '@/app/api/deck/route'
import { useLocale, useT } from '@/lib/i18n/client'

export type Decision = 'like' | 'pass' | 'seen'
export type Match = { id: number; tmdb_id: number; media_type: Card['mediaType']; title: string; poster_path: string | null; year: number | null }
type Cursor = DeckResponse['cursor']

const LOW_WATER = 6 // fetch the next batch when fewer cards than this are left
const PREFETCH = 4 // details + posters ready this many cards ahead
const CURSOR_KEY = 'df:deck-cursor'

const loadCursor = (): Cursor | null => {
  try {
    return JSON.parse(localStorage.getItem(CURSOR_KEY) ?? 'null')
  } catch {
    return null
  }
}
const saveCursor = (c: Cursor | null) => {
  try {
    if (c) localStorage.setItem(CURSOR_KEY, JSON.stringify(c))
  } catch {}
}

export function useDeck({ onMatch }: { onMatch?: (m: Match) => void } = {}) {
  const t = useT()
  const locale = useLocale()
  const supabase = useMemo(() => createClient(), [])
  const [queue, setQueue] = useState<Card[]>([])
  const [details, setDetails] = useState<Record<string, TitleDetails | 'error'>>({})
  const [last, setLast] = useState<{ card: Card; decision: Decision; saved: Promise<unknown> } | null>(null)
  const [fetchState, setFetchState] = useState<'idle' | 'loading' | 'error' | 'done'>('idle')
  const [batches, setBatches] = useState(0) // bumps after each fetch so the low-water effect re-checks
  const [notice, setNotice] = useState('')
  const [region, setRegion] = useState('PL')

  const busy = useRef(false)
  const cursor = useRef<Cursor | null>(null)
  const known = useRef(new Set<string>()) // every key queued this session: batches may overlap
  const requested = useRef(new Set<string>())
  const onMatchRef = useRef(onMatch)
  useEffect(() => void (onMatchRef.current = onMatch))

  const fetchMore = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    setFetchState('loading')
    cursor.current ??= loadCursor()
    const sent = cursor.current
    try {
      const qs = sent ? new URLSearchParams(Object.entries(sent).map(([k, v]) => [k, String(v)])) : ''
      const res = await fetch(`/api/deck?${qs}`)
      if (!res.ok) throw new Error(String(res.status))
      const body: DeckResponse = await res.json()
      // shortcut: saves the cursor this batch was fetched with, so a reload re-serves it minus swiped titles;
      // up to LOW_WATER unswiped cards of the batch before can be skipped. Upgrade: persist per-card cursors.
      saveCursor(sent)
      cursor.current = body.cursor
      setRegion(body.region)
      const fresh = body.cards.filter((c) => !known.current.has(c.key))
      fresh.forEach((c) => known.current.add(c.key))
      setQueue((q) => [...q, ...fresh])
      setFetchState(body.done ? 'done' : 'idle')
    } catch {
      setFetchState('error')
    } finally {
      busy.current = false
      setBatches((b) => b + 1)
    }
  }, [])

  useEffect(() => {
    if (queue.length < LOW_WATER && fetchState === 'idle') fetchMore()
  }, [queue.length, fetchState, batches, fetchMore])

  // Details and posters for the next few cards, so swiping never waits on the network.
  useEffect(() => {
    for (const card of queue.slice(0, PREFETCH)) {
      if (requested.current.has(card.key)) continue
      requested.current.add(card.key)
      preloadPoster(card.posterPath)
      fetch(`/api/titles/${card.mediaType}/${card.tmdbId}?region=${region}&lang=${locale}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((d: TitleDetails) => setDetails((all) => ({ ...all, [card.key]: d })))
        .catch(() => setDetails((all) => ({ ...all, [card.key]: 'error' })))
    }
  }, [queue, region, locale])

  const queueRef = useRef(queue)
  const lastRef = useRef(last)
  useEffect(() => {
    queueRef.current = queue
    lastRef.current = last
  })

  const decide = useCallback(
    (decision: Decision) => {
      const card = queueRef.current[0]
      if (!card) return
      queueRef.current = queueRef.current.slice(1) // a second press before re-render acts on the next card
      navigator.vibrate?.(8)
      const saved = Promise.resolve(
        supabase.rpc('swipe', {
          p_tmdb_id: card.tmdbId,
          p_media_type: card.mediaType,
          p_decision: decision,
          p_title: card.title,
          p_poster_path: card.posterPath,
          p_year: card.year,
        }),
      ).then(({ data, error }) => {
        if (error) {
          setQueue((q) => [card, ...q])
          setLast((l) => (l?.card.key === card.key ? null : l))
          setNotice(t.deck.saveError)
          return
        }
        const match = (data as Match[] | null)?.[0]
        if (match) onMatchRef.current?.(match)
      })
      setQueue((q) => q.filter((c) => c.key !== card.key))
      setLast({ card, decision, saved })
    },
    [supabase, t],
  )

  const undo = useCallback(async () => {
    const l = lastRef.current
    if (!l) return
    lastRef.current = null
    setLast(null)
    setQueue((q) => [l.card, ...q])
    await l.saved // never delete before the insert landed
    const { error } = await supabase.from('swipes').delete().eq('tmdb_id', l.card.tmdbId).eq('media_type', l.card.mediaType)
    if (error) setNotice(t.deck.saveError)
  }, [supabase, t])

  useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(id)
  }, [notice])

  const retry = useCallback(() => setFetchState('idle'), [])

  return {
    queue,
    details,
    region,
    lastDecision: last?.decision ?? null,
    canUndo: !!last,
    loading: fetchState === 'loading' || fetchState === 'idle',
    error: fetchState === 'error',
    done: fetchState === 'done',
    notice,
    decide,
    undo,
    retry,
  }
}
