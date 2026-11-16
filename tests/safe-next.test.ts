import { describe, expect, it } from 'vitest'
import { safeNext } from '@/lib/safe-next'

const origin = 'https://df.example'

describe('safeNext', () => {
  it.each([
    ['/join/ABCD2345', '/join/ABCD2345'],
    ['/pair?x=1', '/pair?x=1'],
    ['https://df.example/join/AB', '/join/AB'],
    [null, '/'],
    ['', '/'],
    ['https://evil.com', '/'],
    ['//evil.com', '/'],
    ['/\\evil.com', '/'],
    ['javascript:alert(1)', '/'],
  ])('%s → %s', (input, expected) => {
    expect(safeNext(input, origin)).toBe(expected)
  })
})
