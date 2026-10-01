import { getUiLang, intlLocale } from '@/i18n'

/**
 * Locale-aware labels in the interface language (`getUiLang()`). English
 * callers keep their hand-rolled compact strings ("5m ago", "12.3k"); other
 * languages go through `Intl` so French reads "il y a 5 min", "12,3 k".
 */

/** True when labels should use `Intl` rather than the English compact forms. */
export function usesLocalizedFormat(): boolean {
  return getUiLang() !== 'en'
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "il y a 5 min" / "hier" for an elapsed duration in the interface language. */
export function formatElapsed(diffMs: number, lang = getUiLang()): string {
  const rtf = new Intl.RelativeTimeFormat(intlLocale(lang), { numeric: 'auto', style: 'short' })
  const elapsed = Math.max(0, diffMs)
  if (elapsed < MINUTE) return rtf.format(0, 'second')
  if (elapsed < HOUR) return rtf.format(-Math.floor(elapsed / MINUTE), 'minute')
  if (elapsed < DAY) return rtf.format(-Math.floor(elapsed / HOUR), 'hour')
  if (elapsed < 30 * DAY) return rtf.format(-Math.floor(elapsed / DAY), 'day')
  return rtf.format(-Math.floor(elapsed / (30 * DAY)), 'month')
}

/** "12,3 k" — compact count in the interface language. */
export function formatCompactNumber(value: number, lang = getUiLang()): string {
  return new Intl.NumberFormat(intlLocale(lang), { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

/** "1 oct." — short UTC date in the interface language. */
export function formatShortDate(date: Date, lang = getUiLang()): string {
  return date.toLocaleDateString(intlLocale(lang), { month: 'short', day: 'numeric', timeZone: 'UTC' })
}
