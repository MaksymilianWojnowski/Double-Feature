// UI languages. Shared by the proxy, route handlers, server and client components.

export const LOCALES = ['en', 'pl', 'pt', 'es', 'de', 'fr', 'it'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'

/** Set by the language picker; otherwise the browser's languages decide. */
export const LOCALE_COOKIE = 'df-lang'

export const isLocale = (x: unknown): x is Locale => LOCALES.includes(x as Locale)

/** Each language in itself, for the picker. Portuguese is Brazilian. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  pl: 'Polski',
  pt: 'Português (Brasil)',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
  it: 'Italiano',
}

/** BCP 47 tag for <html lang>, Intl and TMDB's `language` parameter. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: 'en-US',
  pl: 'pl-PL',
  pt: 'pt-BR',
  es: 'es-ES',
  de: 'de-DE',
  fr: 'fr-FR',
  it: 'it-IT',
}

/** The saved choice if valid, else the first supported language the browser asks for (by q), else English. */
export function pickLocale(cookie: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookie)) return cookie
  const wanted = (acceptLanguage ?? '')
    .split(',')
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(';')
      const q = Number(params.find((p) => p.trim().startsWith('q='))?.trim().slice(2) ?? 1)
      return { lang: tag.split('-')[0].toLowerCase(), q: Number.isFinite(q) ? q : 0, i }
    })
    .filter((x) => x.lang && x.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i)
  return wanted.find((x) => isLocale(x.lang))?.lang as Locale | undefined ?? DEFAULT_LOCALE
}

/** Locale of an incoming request (route handlers can't read the [lang] segment). */
export const requestLocale = (req: { cookies: { get(name: string): { value: string } | undefined }; headers: Headers }) =>
  pickLocale(req.cookies.get(LOCALE_COOKIE)?.value, req.headers.get('accept-language'))
