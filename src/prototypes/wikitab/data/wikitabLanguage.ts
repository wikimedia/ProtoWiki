/**
 * Wikipedia language the new tab page reads from.
 *
 * Read once at module load so every fetcher shares one host. Changing it
 * writes storage and reloads the page — simpler and safer than re-wiring every
 * module-level URL builder for a live switch. Other open tabs keep the language
 * they loaded with: every cache key names its language explicitly.
 *
 * Stored under a `protowiki-` key on purpose: `migrateWikitabStorage()` deletes
 * any unregistered `wikitab-*` key on load.
 */
import { normalizeLang } from '@/config'

export const WIKITAB_LANGUAGE_STORAGE_KEY = 'protowiki-wikitab-language'
export const DEFAULT_WIKITAB_LANGUAGE = 'en'

export interface WikitabLanguageOption {
  value: string
  label: string
}

/** Large Wikipedias, each labelled with its own name for itself (e.g. `Wikipédia en français`). */
export const WIKITAB_LANGUAGE_OPTIONS: readonly WikitabLanguageOption[] = [
  { value: 'ar', label: 'ويكيبيديا العربية' },
  { value: 'ca', label: 'Viquipèdia en català' },
  { value: 'cs', label: 'Česká Wikipedie' },
  { value: 'de', label: 'Deutschsprachige Wikipedia' },
  { value: 'en', label: 'English Wikipedia' },
  { value: 'es', label: 'Wikipedia en español' },
  { value: 'eu', label: 'Euskarazko Wikipedia' },
  { value: 'fa', label: 'ویکی‌پدیای فارسی' },
  { value: 'fr', label: 'Wikipédia en français' },
  { value: 'he', label: 'ויקיפדיה העברית' },
  { value: 'id', label: 'Wikipedia bahasa Indonesia' },
  { value: 'it', label: 'Wikipedia in italiano' },
  { value: 'ja', label: 'ウィキペディア日本語版' },
  { value: 'ko', label: '한국어 위키백과' },
  { value: 'nl', label: 'Nederlandstalige Wikipedia' },
  { value: 'pl', label: 'Polska Wikipedia' },
  { value: 'pt', label: 'Wikipédia em português' },
  { value: 'ru', label: 'Русская Википедия' },
  { value: 'sv', label: 'Svenskspråkiga Wikipedia' },
  { value: 'tr', label: 'Türkçe Vikipedi' },
  { value: 'uk', label: 'Українська Вікіпедія' },
  { value: 'vi', label: 'Wikipedia tiếng Việt' },
  { value: 'zh', label: '中文维基百科' },
]

function readStoredLanguage(): string {
  if (typeof window === 'undefined') return DEFAULT_WIKITAB_LANGUAGE
  try {
    const raw = window.localStorage.getItem(WIKITAB_LANGUAGE_STORAGE_KEY)
    return raw ? normalizeLang(raw) : DEFAULT_WIKITAB_LANGUAGE
  } catch {
    return DEFAULT_WIKITAB_LANGUAGE
  }
}

/** Language code for this page load (e.g. `en`, `es`). */
export const WIKITAB_LANGUAGE = readStoredLanguage()

/** Host for a sister project in the current language (e.g. `wiktionary` → `es.wiktionary.org`). */
export function wikitabSisterHost(project: 'wiktionary' | 'wikiquote'): string {
  return `${WIKITAB_LANGUAGE}.${project}.org`
}

/**
 * Persist a new language and reload. Returns false when storage is blocked
 * (the page would just come back in the old language).
 */
export function setWikitabLanguage(lang: string): boolean {
  const next = normalizeLang(lang)
  if (next === WIKITAB_LANGUAGE) return true
  try {
    window.localStorage.setItem(WIKITAB_LANGUAGE_STORAGE_KEY, next)
  } catch {
    return false
  }
  window.location.reload()
  return true
}

/** English name of a language (`fr` → `French`), for UI copy. Falls back to the code. */
export function wikitabLanguageName(lang: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(lang) ?? lang
  } catch {
    return lang
  }
}

const PROJECT_BY_HOST = /\.(wikipedia|wiktionary|wikiquote)\.org$/i

const PROJECT_NAMES: Record<string, string> = {
  wikipedia: 'Wikipedia',
  wiktionary: 'Wiktionary',
  wikiquote: 'Wikiquote',
}

/**
 * "French Wikipedia" — shown with the language icon on saved cards from a wiki
 * other than this page load's. The project comes from the item's URL (Wiktionary / Wikiquote
 * saves), defaulting to Wikipedia.
 */
export function wikitabSavedFromWikiName(lang: string, url?: string): string {
  let project = 'Wikipedia'
  try {
    const match = url ? new URL(url).hostname.match(PROJECT_BY_HOST) : null
    if (match) project = PROJECT_NAMES[match[1].toLowerCase()] ?? project
  } catch {
    // Not a URL — keep Wikipedia.
  }
  return `${wikitabLanguageName(lang)} ${project}`
}

/** Right-to-left scripts among the picker's wikis (`WIKITAB_LANGUAGE_OPTIONS`). */
export const WIKITAB_RTL_LANGS: ReadonlySet<string> = new Set(['ar', 'fa', 'he'])

/**
 * Text direction for content from `lang`'s wiki. Wikitab's own UI copy stays
 * English / LTR, so this goes on wiki-text elements only — never the page root.
 */
export function wikitabDir(lang: string): 'ltr' | 'rtl' {
  return WIKITAB_RTL_LANGS.has(lang) ? 'rtl' : 'ltr'
}
