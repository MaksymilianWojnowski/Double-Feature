import { ImageResponse } from 'next/og'
import { IconArt } from './icon-art'

// Home-screen icon on iPhone; iOS rounds the corners itself, so the art is full-bleed.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(<IconArt size={180} />, size)
}
