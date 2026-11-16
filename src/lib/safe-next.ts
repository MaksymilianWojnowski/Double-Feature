/** A post-login destination on our own origin, or '/'. Accepts relative paths and same-origin absolute URLs. */
export function safeNext(next: string | null | undefined, origin: string): string {
  if (!next) return '/'
  try {
    const url = new URL(next, origin)
    return url.origin === origin ? url.pathname + url.search : '/'
  } catch {
    return '/'
  }
}
