'use client'

import { useT } from '@/lib/i18n/client'

// Shown instantly while a signed-in screen (Matches, Pair, Settings…) loads its data, so switching tabs
// never blocks. Also what Next's instant-navigation validation asks for.
export default function Loading() {
  const t = useT()
  return (
    <div role="status" aria-label={t.app.loading} className="flex min-h-dvh items-center justify-center">
      <span className="size-7 animate-spin rounded-full border-[2.5px] border-white/20 border-t-white/80" />
    </div>
  )
}
