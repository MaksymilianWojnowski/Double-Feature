'use client'

import { ChevronDown } from 'lucide-react'
import { useLocale, useT } from '@/lib/i18n/client'
import { LOCALE_COOKIE, LOCALE_NAMES, LOCALES } from '@/lib/i18n/locales'

/** Personal, not shared with the pair: a cookie the proxy reads. A reload re-renders everything in the new language. */
export function LanguagePicker() {
  const t = useT()
  const locale = useLocale()
  return (
    <label className="flex items-center justify-between gap-4 px-5 py-3.5">
      {t.pair.language}
      <span className="relative flex items-center">
        <select
          value={locale}
          onChange={(e) => {
            document.cookie = `${LOCALE_COOKIE}=${e.target.value}; path=/; max-age=31536000; samesite=lax`
            location.reload()
          }}
          className="appearance-none bg-transparent pr-6 text-right text-body text-muted"
        >
          {LOCALES.map((l) => (
            <option key={l} value={l} className="bg-surface text-ink">
              {LOCALE_NAMES[l]}
            </option>
          ))}
        </select>
        <ChevronDown size={16} strokeWidth={2.25} className="pointer-events-none absolute right-0 text-faint" aria-hidden />
      </span>
    </label>
  )
}
