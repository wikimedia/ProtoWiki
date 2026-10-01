import { wikiHostFromLang } from '@/config'

/**
 * Content wiki language for prototypes that follow `?lang=` (wikita-lite and
 * the musical-group data layer it shares). Read from the URL on every call so
 * it always matches the current route; English when the param is absent.
 */
export const DEFAULT_CONTENT_LANG = 'en'

const LANG_PATTERN = /^[a-z]{2,3}(-[a-z0-9]+)*$/

export function parseContentLang(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return LANG_PATTERN.test(value) ? value : DEFAULT_CONTENT_LANG
}

export function getContentLang(): string {
  if (typeof window === 'undefined') return DEFAULT_CONTENT_LANG
  return parseContentLang(new URLSearchParams(window.location.search).get('lang'))
}

export function isDefaultContentLang(lang = getContentLang()): boolean {
  return lang === DEFAULT_CONTENT_LANG
}

/** `fr.wikipedia.org` when `?lang=fr`, else `en.wikipedia.org`. */
export function contentWikiHost(): string {
  return wikiHostFromLang(getContentLang())
}

/**
 * localStorage key scoped to the content language. English keeps the bare key
 * so existing caches stay valid.
 */
export function langScopedStorageKey(base: string): string {
  const lang = getContentLang()
  return isDefaultContentLang(lang) ? base : `${base}:${lang}`
}
