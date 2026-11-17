import { describe, expect, it } from 'vitest'
import { pickLocale } from '@/lib/i18n/locales'

describe('pickLocale', () => {
  it('prefers the saved choice', () => {
    expect(pickLocale('pl', 'de-DE,de;q=0.9')).toBe('pl')
  })

  it('ignores a saved value that is not a supported language', () => {
    expect(pickLocale('xx', 'fr-FR')).toBe('fr')
  })

  it('takes the first supported browser language by weight', () => {
    expect(pickLocale(undefined, 'nl-NL,nl;q=0.9,pt-BR;q=0.8,en;q=0.7')).toBe('pt')
    expect(pickLocale(undefined, 'en;q=0.5,it;q=0.9')).toBe('it')
  })

  it('falls back to English', () => {
    expect(pickLocale(undefined, null)).toBe('en')
    expect(pickLocale(undefined, 'ja,ko;q=0.8')).toBe('en')
    expect(pickLocale(undefined, 'pl;q=0')).toBe('en')
  })
})
