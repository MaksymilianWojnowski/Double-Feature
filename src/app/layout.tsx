import type { Metadata, Viewport } from 'next'
import { Geist, Instrument_Serif } from 'next/font/google'
import { t } from '@/lib/strings/en'
import './globals.css'

const geist = Geist({ variable: '--font-geist', subsets: ['latin', 'latin-ext'] })
const instrument = Instrument_Serif({
  variable: '--font-instrument',
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin', 'latin-ext'],
})

export const metadata: Metadata = {
  title: t.app.name,
  description: t.app.tagline,
}

export const viewport: Viewport = {
  themeColor: '#0d0d0c',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geist.variable} ${instrument.variable}`}>
      <body className="text-body">{children}</body>
    </html>
  )
}
