/**
 * Wikipedia language the new tab page reads from.
 *
 * Read once at module load so every fetcher shares one host. Changing it
 * writes storage, clears feed caches and reloads the page — simpler and safer
 * than re-wiring every module-level URL builder for a live switch.
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

/** Large Wikipedias, labelled by autonym. */
export const WIKITAB_LANGUAGE_OPTIONS: readonly WikitabLanguageOption[] = [
  { value: 'ar', label: 'العربية' },
  { value: 'ca', label: 'Català' },
  { value: 'cs', label: 'Čeština' },
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'eu', label: 'Euskara' },
  { value: 'fa', label: 'فارسی' },
  { value: 'fr', label: 'Français' },
  { value: 'he', label: 'עברית' },
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'it', label: 'Italiano' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'pl', label: 'Polski' },
  { value: 'pt', label: 'Português' },
  { value: 'ru', label: 'Русский' },
  { value: 'sv', label: 'Svenska' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'uk', label: 'Українська' },
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'zh', label: '中文' },
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
export function setWikitabLanguage(lang: string, beforeReload?: () => void): boolean {
  const next = normalizeLang(lang)
  if (next === WIKITAB_LANGUAGE) return true
  try {
    window.localStorage.setItem(WIKITAB_LANGUAGE_STORAGE_KEY, next)
  } catch {
    return false
  }
  beforeReload?.()
  window.location.reload()
  return true
}
