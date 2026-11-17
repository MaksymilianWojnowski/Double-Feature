'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { GalleryVerticalEnd, Heart, Search, UsersRound } from 'lucide-react'
import { useT } from '@/lib/i18n/client'

const items = [
  { href: '/', key: 'deck', Icon: GalleryVerticalEnd },
  { href: '/matches', key: 'matches', Icon: Heart },
  { href: '/search', key: 'search', Icon: Search },
  { href: '/pair', key: 'pair', Icon: UsersRound },
] as const

// Floating glass capsule, like iOS 26's tab bar. The active tab sits on a lighter glass pill.
export function Nav() {
  const path = usePathname()
  const t = useT()
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <ul className="glass pointer-events-auto flex gap-1 rounded-full p-1">
        {items.map(({ href, key, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={path === href ? 'page' : undefined}
              className="flex min-w-[4.5rem] flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-caption text-muted transition-colors aria-[current=page]:bg-white/15 aria-[current=page]:text-ink"
            >
              <Icon size={22} strokeWidth={2} aria-hidden />
              {t.nav[key]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
