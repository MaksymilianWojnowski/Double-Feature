import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { getMyPair } from '@/lib/pair'
import { getT } from '@/lib/i18n/server'
import { PosterBackdrop } from '@/components/ui/poster-backdrop'
import { InviteLink } from './invite-link'
import { LeaveButton } from './leave-button'
import { LanguagePicker } from './language-picker'

type Stats = { my_swipes: number; partner_swipes: number; matches: number; watched: number }

export default async function PairPage() {
  const t = await getT()
  const { supabase, pair, partner } = await getMyPair()
  const { data: stats } = await supabase.rpc('pair_stats').single<Stats>()

  return (
    // Not `screen`: bottom padding has to clear the floating tab bar, and two pb-* classes would fight.
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-8 px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <PosterBackdrop />
      <header>
        <h1 className="text-hero">{t.pair.title}</h1>
        <p className="mt-1 text-muted">{partner?.display_name ? t.pair.with(partner.display_name) : t.pair.waiting}</p>
      </header>

      {!partner && pair && <InviteLink code={pair.invite_code} />}

      {partner && stats && (
        <dl className="glass grid grid-cols-2 gap-px overflow-hidden rounded-3xl">
          {[
            [t.pair.stats.you, stats.my_swipes],
            [t.pair.stats.partner(partner.display_name ?? ''), stats.partner_swipes],
            [t.pair.stats.matches, stats.matches],
            [t.pair.stats.watched, stats.watched],
          ].map(([term, value]) => (
            <div key={String(term)} className="px-5 py-4">
              <dt className="text-small text-muted">{term}</dt>
              <dd className="mt-0.5 text-title tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* iOS grouped list: account actions at the bottom, destructive last. */}
      <div className="mt-auto flex flex-col gap-3">
        <div className="glass divide-y divide-white/10 overflow-hidden rounded-2xl">
          {[
            ['/swipes', t.swipes.open],
            ['/settings', t.settings.open],
            ['/about', t.about.title],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="flex items-center justify-between px-5 py-3.5 transition-colors active:bg-white/10">
              {label}
              <ChevronRight size={18} strokeWidth={2.25} className="text-faint" aria-hidden />
            </Link>
          ))}
          <LanguagePicker />
        </div>
        <form action="/auth/signout" method="post" className="glass overflow-hidden rounded-2xl">
          <button className="w-full px-5 py-3.5 text-left text-body transition-colors active:bg-white/10">{t.pair.signOut}</button>
        </form>
        <LeaveButton />
      </div>
    </main>
  )
}
