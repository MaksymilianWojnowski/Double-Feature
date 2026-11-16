'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, ChevronLeft } from 'lucide-react'
import { t } from '@/lib/strings/en'
import { createClient } from '@/lib/supabase/browser'
import { logoSrc } from '@/lib/tmdb/images'
import type { Provider } from '@/lib/tmdb/types'
import type { Filters, PairSettings } from '@/lib/deck/discover-params'
import { GENRE_KEYS } from '@/lib/deck/genres'
import { Segmented } from '@/components/ui/segmented'
import { Switch } from '@/components/ui/switch'
import { iconButton, link } from '@/components/ui/styles'

const REGIONS = ['PL', 'BR'] as const
const PROVIDERS_SHOWN = 20
const thisYear = new Date().getFullYear()

export function SettingsForm({ pairId, initial }: { pairId: string; initial: PairSettings }) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [s, setS] = useState(initial)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const writes = useRef<Promise<unknown>>(Promise.resolve())

  // Every change saves at once, iOS-style. Writes are chained so a slow one can't land after a newer one.
  function save(patch: Partial<PairSettings>) {
    setS((prev) => ({ ...prev, ...patch }))
    setStatus('saving')
    writes.current = writes.current.then(async () => {
      const { error } = await supabase.from('pair_settings').update(patch).eq('pair_id', pairId)
      setStatus(error ? 'error' : 'saved')
    })
  }
  const setFilters = (change: Partial<Filters>) => save({ filters: { ...s.filters, ...change } })

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-7 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="flex flex-col gap-3">
        <div className="flex h-11 items-center justify-between">
          <button type="button" aria-label={t.settings.back} className={`${iconButton} size-10`} onClick={() => (history.length > 1 ? router.back() : router.push('/'))}>
            <ChevronLeft size={22} strokeWidth={2.25} />
          </button>
          <p role="status" className={`text-small ${status === 'error' ? 'text-danger' : 'text-muted'}`}>
            {status === 'saving' ? t.settings.saving : status === 'saved' ? t.settings.saved : status === 'error' ? t.settings.saveError : ''}
          </p>
        </div>
        <div className="px-2">
          <h1 className="text-hero">{t.settings.title}</h1>
          <p className="mt-1 text-small text-muted">{t.settings.shared}</p>
        </div>
      </header>

      <Section title={t.settings.show}>
        <Segmented
          label={t.settings.show}
          value={s.content_type}
          onChange={(content_type) => save({ content_type })}
          options={(['movie', 'tv', 'both'] as const).map((value) => ({ value, label: t.settings.contentTypes[value] }))}
        />
      </Section>

      <Section title={t.settings.region}>
        <Segmented
          label={t.settings.region}
          value={s.region}
          onChange={(region) => save({ region })}
          options={REGIONS.map((value) => ({ value, label: t.settings.regions[value] }))}
        />
      </Section>

      <Section title={t.settings.services} hint={t.settings.servicesHint}>
        <Services region={s.region} selected={s.provider_ids} onChange={(provider_ids) => save({ provider_ids })} />
        <div className="glass rounded-2xl">
          <Row label={t.settings.onlyOurs} hint={t.settings.onlyOursHint}>
            <Switch
              label={t.settings.onlyOurs}
              checked={s.only_our_services}
              disabled={!s.provider_ids.length}
              onChange={(only_our_services) => save({ only_our_services })}
            />
          </Row>
        </div>
        <p className="px-2 text-small text-faint">{t.settings.justWatch}</p>
      </Section>

      <Section title={t.settings.genres} hint={t.settings.genresHint}>
        <div className="flex flex-wrap gap-2">
          {GENRE_KEYS.map((g) => {
            const on = s.filters.genres?.includes(g) ?? false
            return (
              <button
                key={g}
                type="button"
                aria-pressed={on}
                onClick={() => setFilters({ genres: on ? s.filters.genres!.filter((x) => x !== g) : [...(s.filters.genres ?? []), g] })}
                className="glass h-9 rounded-full px-4 text-small font-semibold text-muted transition aria-pressed:bg-ink aria-pressed:text-bg"
              >
                {t.genres[g]}
              </button>
            )
          })}
        </div>
      </Section>

      <Section title={t.settings.filters}>
        <div className="glass divide-y divide-white/10 overflow-hidden rounded-2xl">
          <Row label={t.settings.years}>
            <Years
              from={s.filters.yearMin}
              to={s.filters.yearMax}
              onChange={(yearMin, yearMax) => setFilters({ yearMin, yearMax })}
            />
          </Row>
          <Row label={t.settings.minRating}>
            <Select
              value={String(s.filters.minRating ?? 'any')}
              options={Object.entries(t.settings.ratingOptions)}
              onChange={(v) => setFilters({ minRating: v === 'any' ? undefined : Number(v) })}
            />
          </Row>
          <Row label={t.settings.minVotes}>
            <Select
              value={String(s.filters.minVotes ?? 150)}
              options={Object.entries(t.settings.voteOptions)}
              onChange={(v) => setFilters({ minVotes: Number(v) })}
            />
          </Row>
          <Row label={t.settings.runtimeMin}>
            <Select
              value={String(s.filters.runtimeMin ?? 'any')}
              options={[['any', t.settings.any], ...[60, 90, 120].map((m) => [String(m), t.title.runtime(m).replace(' 0m', '')])]}
              onChange={(v) => setFilters({ runtimeMin: v === 'any' ? undefined : Number(v) })}
            />
          </Row>
          <Row label={t.settings.runtimeMax}>
            <Select
              value={String(s.filters.runtimeMax ?? 'any')}
              options={[['any', t.settings.any], ...[90, 120, 150, 180].map((m) => [String(m), t.title.runtime(m).replace(' 0m', '')])]}
              onChange={(v) => setFilters({ runtimeMax: v === 'any' ? undefined : Number(v) })}
            />
          </Row>
          <Row label={t.settings.language}>
            <Select
              value={s.filters.language ?? 'any'}
              options={[['any', t.settings.any], ...Object.entries(t.languages)]}
              onChange={(v) => setFilters({ language: v === 'any' ? undefined : v })}
            />
          </Row>
        </div>
        <button type="button" className={`${link} self-start px-2`} onClick={() => save({ filters: {} })}>
          {t.settings.reset}
        </button>
      </Section>
    </main>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="px-2">
        <h2 className="text-small font-semibold tracking-wide text-muted uppercase">{title}</h2>
        {hint && <p className="text-small text-faint">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-4 px-4 py-2">
      <div>
        <p className="text-body">{label}</p>
        {hint && <p className="text-small text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

/** iOS-style value picker: the native select, so phones show their own wheel/menu. */
function Select({ value, options, onChange }: { value: string; options: string[][]; onChange: (v: string) => void }) {
  return (
    <label className="relative flex items-center">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="appearance-none bg-transparent py-1 pr-6 text-right text-body text-muted outline-none">
        {options.map(([v, label]) => (
          <option key={v} value={v} className="bg-surface text-ink">
            {label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} strokeWidth={2.25} className="pointer-events-none absolute right-0 text-faint" aria-hidden />
    </label>
  )
}

/** From/to years, saved on blur; an inverted range is swapped rather than stored. */
function Years({ from, to, onChange }: { from?: number; to?: number; onChange: (from?: number, to?: number) => void }) {
  const [a, setA] = useState(from ? String(from) : '')
  const [b, setB] = useState(to ? String(to) : '')
  const parse = (v: string) => {
    const n = Number(v)
    return v && Number.isInteger(n) && n >= 1900 && n <= thisYear + 2 ? n : undefined
  }
  function commit() {
    let [x, y] = [parse(a), parse(b)]
    if (x && y && x > y) [x, y] = [y, x]
    setA(x ? String(x) : '')
    setB(y ? String(y) : '')
    if (x !== from || y !== to) onChange(x, y)
  }
  const box = 'h-9 w-[4.5rem] rounded-xl bg-white/10 text-center text-body tabular-nums outline-none placeholder:text-faint focus:bg-white/15'
  return (
    <div className="flex items-center gap-2">
      <input aria-label={t.settings.from} inputMode="numeric" placeholder="1900" maxLength={4} className={box} value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, ''))} onBlur={commit} />
      <span className="text-faint">–</span>
      <input aria-label={t.settings.to} inputMode="numeric" placeholder={String(thisYear)} maxLength={4} className={box} value={b} onChange={(e) => setB(e.target.value.replace(/\D/g, ''))} onBlur={commit} />
    </div>
  )
}

/** Logo grid of the region's services; reloads when the region changes. */
function Services({ region, selected, onChange }: { region: string; selected: number[]; onChange: (ids: number[]) => void }) {
  const [list, setList] = useState<{ region: string; providers: Provider[] } | 'error' | null>(null)
  const [all, setAll] = useState(false)

  useEffect(() => {
    let live = true
    fetch(`/api/providers?region=${region}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((providers: Provider[]) => live && setList({ region, providers }))
      .catch(() => live && setList('error'))
    return () => {
      live = false
    }
  }, [region])

  if (list === 'error') return <p className="px-2 text-small text-muted">{t.settings.servicesError}</p>
  const providers = list && list.region === region ? list.providers : null
  if (!providers) return <div className="glass h-40 animate-pulse rounded-2xl" />

  // Chosen services always show, even when they're past the first rows.
  const visible = all ? providers : providers.filter((p, i) => i < PROVIDERS_SHOWN || selected.includes(p.id))
  return (
    <div className="glass flex flex-col gap-3 rounded-2xl p-3">
      <ul className="grid grid-cols-5 gap-2.5">
        {visible.map((p) => {
          const on = selected.includes(p.id)
          return (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={on}
                aria-label={p.name}
                title={p.name}
                onClick={() => onChange(on ? selected.filter((id) => id !== p.id) : [...selected, p.id])}
                className={`relative block aspect-square w-full overflow-hidden rounded-[14px] transition active:scale-95 ${on ? 'ring-2 ring-white' : 'opacity-60'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- TMDB CDN logo */}
                <img src={logoSrc(p.logoPath)} alt="" className="h-full w-full object-cover" />
                {on && (
                  <span className="absolute right-1 bottom-1 flex size-4 items-center justify-center rounded-full bg-white text-black">
                    <Check size={11} strokeWidth={3.5} />
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      {providers.length > PROVIDERS_SHOWN && (
        <button type="button" className={`${link} self-center`} onClick={() => setAll((v) => !v)}>
          {all ? t.settings.showFewer : t.settings.showAll(providers.length)}
        </button>
      )}
    </div>
  )
}
