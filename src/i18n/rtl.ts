/** Text direction per language — no imports, so `@/i18n` and `./direction` can share it. */

export type TextDirection = 'ltr' | 'rtl'

/** Languages written right-to-left (Wikipedia language codes). */
const RTL_LANGS = new Set([
  'ar', 'arc', 'arz', 'azb', 'bcc', 'bqi', 'ckb', 'dv', 'fa', 'glk', 'he', 'khw',
  'ks', 'lrc', 'mzn', 'nqo', 'pnb', 'ps', 'sd', 'skr', 'ug', 'ur', 'yi',
])

export function directionForLang(lang: string): TextDirection {
  return RTL_LANGS.has(lang.split('-')[0]) ? 'rtl' : 'ltr'
}
