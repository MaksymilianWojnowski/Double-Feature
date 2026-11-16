import { ImageResponse } from 'next/og'
import { IconArt } from './icon-art'

// Generated at build time: /icon/192, /icon/512 and /icon/maskable (used by the manifest).
export function generateImageMetadata() {
  return [
    { id: '192', size: { width: 192, height: 192 }, contentType: 'image/png' },
    { id: '512', size: { width: 512, height: 512 }, contentType: 'image/png' },
    { id: 'maskable', size: { width: 512, height: 512 }, contentType: 'image/png' },
  ]
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const which = await id
  const size = which === '192' ? 192 : 512
  return new ImageResponse(<IconArt size={size} inset={which === 'maskable' ? 0.8 : 1} />, { width: size, height: size })
}
