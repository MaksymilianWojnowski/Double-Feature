import { getMyPair } from '@/lib/pair'
import { t } from '@/lib/strings/en'
import { link, screen, title } from '@/components/ui/styles'
import { InviteLink } from './invite-link'
import { LeaveButton } from './leave-button'

type Stats = { my_swipes: number; partner_swipes: number; matches: number; watched: number }

export default async function PairPage() {
  const { supabase, pair, partner } = await getMyPair()
  const { data: stats } = await supabase.rpc('pair_stats').single<Stats>()

  return (
    <main className={`${screen} pb-28`}>
      <h1 className={title}>{t.pair.title}</h1>
      <p className="mt-2 text-muted">{partner?.display_name ? t.pair.with(partner.display_name) : t.pair.waiting}</p>

      {!partner && pair && <InviteLink code={pair.invite_code} />}

      {partner && stats && (
        <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8">
          {[
            [t.pair.stats.you, stats.my_swipes],
            [t.pair.stats.partner(partner.display_name ?? ''), stats.partner_swipes],
            [t.pair.stats.matches, stats.matches],
            [t.pair.stats.watched, stats.watched],
          ].map(([term, value]) => (
            <div key={String(term)}>
              <dt className="text-small text-muted">{term}</dt>
              <dd className="mt-1 font-display text-title tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-auto flex flex-col items-start gap-6 pt-16">
        <form action="/auth/signout" method="post">
          <button className={link}>{t.pair.signOut}</button>
        </form>
        <LeaveButton />
      </div>
    </main>
  )
}
