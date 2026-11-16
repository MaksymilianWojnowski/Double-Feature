import type { MetadataRoute } from 'next'
import { t } from '@/lib/strings/en'

// Installable PWA: standalone, black chrome, icons from ./icon.tsx.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: t.app.name,
    short_name: t.app.name,
    description: t.app.tagline,
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      { src: '/icon/192', sizes: '192x192', type: 'image/png' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png' },
      { src: '/icon/maskable', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
