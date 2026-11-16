// App icon artwork for ImageResponse (Satori): two stacked cards, the front one in the like-orange
// with a heart. `inset` shrinks the art for maskable icons, whose outer 10% may be cropped.
export function IconArt({ size, inset = 1 }: { size: number; inset?: number }) {
  const s = size * inset
  const card = { position: 'absolute', width: s * 0.38, height: s * 0.54, borderRadius: s * 0.075, display: 'flex' } as const
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(155deg, #3d2406 0%, #140a02 48%, #000 100%)',
      }}
    >
      <div style={{ position: 'relative', width: s * 0.62, height: s * 0.66, display: 'flex' }}>
        <div
          style={{
            ...card,
            left: s * 0.02,
            top: s * 0.05,
            background: 'rgba(255,255,255,0.18)',
            border: `${Math.max(1, s * 0.008)}px solid rgba(255,255,255,0.4)`,
            transform: 'rotate(-12deg)',
          }}
        />
        <div
          style={{
            ...card,
            right: s * 0.02,
            top: s * 0.06,
            background: 'linear-gradient(160deg, #ffb84d 0%, #ff9f0a 55%, #f07c00 100%)',
            transform: 'rotate(8deg)',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 ${s * 0.03}px ${s * 0.08}px rgba(0,0,0,0.5)`,
          }}
        >
          <svg width={s * 0.17} height={s * 0.17} viewBox="0 0 24 24">
            <path
              fill="#000"
              d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}
