export class TmdbError extends Error {
  constructor(public status: number) {
    super(`TMDB request failed with status ${status}`)
  }
}

const retryable = (status: number) => status === 429 || status >= 500

/** fetch with up to `tries` attempts on 429/5xx/network errors; waits Retry-After or 300ms·2^attempt. */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  { tries = 3, sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)) } = {},
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const last = attempt === tries - 1
    let res: Response
    try {
      res = await fetch(url, init)
    } catch {
      if (last) throw new TmdbError(0)
      await sleep(300 * 2 ** attempt)
      continue
    }
    if (res.ok) return res
    if (!retryable(res.status) || last) throw new TmdbError(res.status)
    const retryAfter = Number(res.headers.get('Retry-After'))
    await sleep(retryAfter > 0 ? retryAfter * 1000 : 300 * 2 ** attempt)
  }
}
