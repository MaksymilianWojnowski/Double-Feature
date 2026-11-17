import { lang } from 'next/root-params'
import { STRINGS } from '@/lib/strings'
import { DEFAULT_LOCALE, isLocale, type Locale } from './locales'

/** The UI language of this page (the [lang] segment the proxy rewrote to). Server Components only. */
export async function getLocale(): Promise<Locale> {
  const l = await lang()
  return isLocale(l) ? l : DEFAULT_LOCALE
}

/** Strings in this page's language. Server Components only. */
export const getT = async () => STRINGS[await getLocale()]
