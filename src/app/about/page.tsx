import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { t } from '@/lib/strings/en'
import { iconButton } from '@/components/ui/styles'
import { PosterBackdrop } from '@/components/ui/poster-backdrop'

// TMDB's official logo, served from their own logos page (themoviedb.org/about/logos-attribution).
const TMDB_LOGO =
  'https://www.themoviedb.org/assets/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg'

export const metadata = { title: `${t.about.title} · ${t.app.name}` }

export default function AboutPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-7 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <PosterBackdrop />
      <Link href="/" aria-label={t.about.back} className={`${iconButton} size-10`}>
        <ChevronLeft size={22} strokeWidth={2.25} />
      </Link>

      <header className="px-2">
        <h1 className="text-hero">{t.app.name}</h1>
        <p className="mt-2 text-muted">{t.about.body}</p>
      </header>

      <section className="flex flex-col gap-2.5">
        <h2 className="px-2 text-small font-semibold tracking-wide text-muted uppercase">{t.about.dataTitle}</h2>
        <div className="glass divide-y divide-white/10 overflow-hidden rounded-2xl">
          <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" className="flex flex-col gap-3 px-5 py-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- TMDB's own hosted logo */}
            <img src={TMDB_LOGO} alt={t.about.tmdbLogoAlt} width={150} height={20} className="h-5 w-auto self-start" />
            <span className="text-small text-muted">{t.about.tmdbNotice}</span>
          </a>
          <a href="https://www.justwatch.com" target="_blank" rel="noreferrer" className="block px-5 py-4 text-small text-muted">
            {t.about.justWatch}
          </a>
        </div>
      </section>
    </main>
  )
}
