import type { Metadata, Viewport } from 'next'
import { preconnect } from 'react-dom'
import { t } from '@/lib/strings/en'
import './globals.css'

// No webfonts: system-ui renders SF Pro on Apple devices, which is the look we want.

export const metadata: Metadata = {
  title: t.app.name,
  description: t.app.tagline,
  applicationName: t.app.name,
  // iPhone "Add to Home Screen": full screen, status bar over the dark UI.
  appleWebApp: { capable: true, title: t.app.name, statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  preconnect('https://image.tmdb.org') // every screen shows posters from TMDB's CDN
  return (
    <html lang="en">
      <body className="text-body">{children}</body>
    </html>
  )
}
