import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getMyPair } from '@/lib/pair'
import { MatchProvider } from '@/components/match/match-provider'
import { Nav } from './nav'

// Every screen in this group needs a name and a pair; anything missing goes through onboarding.
export default function AppLayout({ children }: LayoutProps<'/[lang]'>) {
  return (
    <Suspense>
      <RequirePair>{children}</RequirePair>
    </Suspense>
  )
}

async function RequirePair({ children }: { children: React.ReactNode }) {
  const { me, pair } = await getMyPair()
  if (!me.display_name || !pair) redirect('/onboarding')
  return (
    <MatchProvider pairId={pair.id}>
      {children}
      <Nav />
    </MatchProvider>
  )
}
