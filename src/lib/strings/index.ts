import type { Locale } from '@/lib/i18n/locales'
import { t as en, type Strings } from './en'
import { pl } from './pl'
import { pt } from './pt'
import { es } from './es'
import { de } from './de'
import { fr } from './fr'
import { it } from './it'

export type { Strings }

/** Every UI string, per language. English is the source; the others must match its shape. */
export const STRINGS: Record<Locale, Strings> = { en, pl, pt, es, de, fr, it }
