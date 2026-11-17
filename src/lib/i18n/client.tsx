'use client'

import { createContext, useContext } from 'react'
import { STRINGS } from '@/lib/strings'
import { DEFAULT_LOCALE, type Locale } from './locales'

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE)

/** Set once in the root layout from the [lang] segment. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>
}

export const useLocale = () => useContext(LocaleContext)

/** Strings in the current UI language. */
export const useT = () => STRINGS[useLocale()]
