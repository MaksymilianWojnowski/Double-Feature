import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getMyPair, pairErrorKey, type PairErrorKey } from '@/lib/pair'
import { t } from '@/lib/strings/en'
import { button, link, screen, title } from '@/components/ui/styles'

async function joinPair(code: string) {
  'use server'
  const { supabase } = await getMyPair()
  const { error } = await supabase.rpc('join_pair', { code })
  if (error) redirect(`/join/${encodeURIComponent(code)}?error=${pairErrorKey(error.message)}`)
  redirect('/')
}

export default function JoinPage(props: PageProps<'/join/[code]'>) {
  return (
    <main className={screen}>
      <Suspense>
        <Join {...props} />
      </Suspense>
    </main>
  )
}

// Joining is a button press, not a side effect of opening the link (link previews and prefetches must not join).
async function Join({ params, searchParams }: PageProps<'/join/[code]'>) {
  const { code } = await params
  const { pair } = await getMyPair()
  if (pair?.invite_code === code.toUpperCase()) redirect('/pair') // your own invite link

  const error: PairErrorKey | undefined = pair
    ? 'already_paired'
    : ((await searchParams).error as PairErrorKey | undefined)

  return (
    <div className="flex flex-1 flex-col">
      <h1 className={title}>{t.join.title}</h1>
      <p className="mt-3 text-muted">{t.join.body}</p>
      <div className="mt-auto flex flex-col gap-6 pt-16">
        {error && (
          <p role="alert" className="text-ink">
            {t.join.errors[error] ?? t.join.errors.generic}
          </p>
        )}
        {pair ? (
          <Link href="/pair" className={link}>
            {t.pair.title}
          </Link>
        ) : (
          <form action={joinPair.bind(null, code)}>
            <button className={button}>{t.join.accept}</button>
          </form>
        )}
      </div>
    </div>
  )
}
