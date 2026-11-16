'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { t } from '@/lib/strings/en'

const items = [
  { href: '/', label: t.nav.deck },
  { href: '/pair', label: t.nav.pair },
] as const

// Words, not icons: there are few enough destinations that labels are clearer.
export function Nav() {
  const path = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-sm justify-around">
        {items.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={path === href ? 'page' : undefined}
              className="block px-4 py-4 text-small text-muted aria-[current=page]:text-ink"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
