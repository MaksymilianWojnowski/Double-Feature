import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { preconnect } from 'react-dom'
import { Analytics } from '@vercel/analytics/next'
import { LocaleProvider } from '@/lib/i18n/client'
import { getT } from '@/lib/i18n/server'
import { isLocale, LOCALE_TAGS, LOCALES } from '@/lib/i18n/locales'
import '../globals.css'

// No webfonts: system-ui renders SF Pro on Apple devices, which is the look we want.

// URLs carry no language: proxy.ts rewrites /matches to /pl/matches (saved choice, else the browser's).
export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }))

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return {
    title: t.app.name,
    description: t.app.tagline,
    applicationName: t.app.name,
    // iPhone "Add to Home Screen": full screen, status bar over the dark UI.
    appleWebApp: { capable: true, title: t.app.name, statusBarStyle: 'black-translucent' },
  }
}

export const viewport: Viewport = {
  themeColor: '#000000',
  viewportFit: 'cover',
}

export default async function RootLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  preconnect('https://image.tmdb.org') // every screen shows posters from TMDB's CDN
  return (
    <html lang={LOCALE_TAGS[lang]}>
      <body className="text-body">
        <LocaleProvider locale={lang}>{children}</LocaleProvider>
        <Analytics /> {/* Vercel Web Analytics: page views, no cookies. Off until enabled in the Vercel dashboard. */}
      </body>
    </html>
  )
}
