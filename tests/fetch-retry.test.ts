import { afterEach, describe, expect, it, vi } from 'vitest'
import { TmdbError, fetchWithRetry } from '@/lib/tmdb/fetch-retry'

const res = (status: number, headers: Record<string, string> = {}) => new Response('{}', { status, headers })

afterEach(() => vi.unstubAllGlobals())

describe('fetchWithRetry', () => {
  it('retries a 429 and honours Retry-After', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(res(429, { 'Retry-After': '2' })).mockResolvedValueOnce(res(200))
    vi.stubGlobal('fetch', fetch)
    const sleep = vi.fn().mockResolvedValue(undefined)
    const r = await fetchWithRetry('https://x', {}, { sleep })
    expect(r.status).toBe(200)
    expect(sleep).toHaveBeenCalledWith(2000)
  })

  it('gives up after three 503s with a TmdbError', async () => {
    const fetch = vi.fn().mockResolvedValue(res(503))
    vi.stubGlobal('fetch', fetch)
    const err = await fetchWithRetry('https://x', {}, { sleep: async () => {} }).catch((e) => e)
    expect(err).toBeInstanceOf(TmdbError)
    expect(err.status).toBe(503)
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('does not retry a 404', async () => {
    const fetch = vi.fn().mockResolvedValue(res(404))
    vi.stubGlobal('fetch', fetch)
    await expect(fetchWithRetry('https://x', {}, { sleep: async () => {} })).rejects.toMatchObject({ status: 404 })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('retries a network error', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(res(200))
    vi.stubGlobal('fetch', fetch)
    const r = await fetchWithRetry('https://x', {}, { sleep: async () => {} })
    expect(r.status).toBe(200)
  })
})
