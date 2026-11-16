import type { Metadata, Viewport } from 'next'
import { t } from '@/lib/strings/en'
import './globals.css'

// No webfonts: system-ui renders SF Pro on Apple devices, which is the look we want.

export const metadata: Metadata = {
  title: t.app.name,
  description: t.app.tagline,
}

export const viewport: Viewport = {
  themeColor: '#000000',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body className="text-body">{children}</body>
    </html>
  )
}
