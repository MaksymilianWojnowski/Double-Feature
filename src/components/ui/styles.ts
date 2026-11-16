// Shared class strings, Apple-style. Accent is deliberately absent: it belongs to "like" and the match moment.
export const screen =
  'mx-auto flex min-h-dvh w-full max-w-sm flex-col px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]'

const pill = 'inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-full px-6 text-body font-semibold transition active:scale-[0.98] disabled:opacity-40'

/** Prominent: solid white capsule. */
export const button = `${pill} bg-ink text-bg`

/** Secondary: glass capsule. */
export const buttonQuiet = `glass ${pill} text-ink`

export const link = 'text-small font-medium text-muted transition-colors hover:text-ink'

export const label = 'px-1 text-small text-muted'

/** iOS filled text field. */
export const field =
  'h-[50px] w-full rounded-2xl bg-white/10 px-4 text-body text-ink placeholder:text-faint outline-none transition focus:bg-white/15 focus:ring-1 focus:ring-white/30'

export const title = 'text-title'

export const iconButton = 'glass flex items-center justify-center rounded-full text-ink transition active:scale-95 disabled:opacity-30'
