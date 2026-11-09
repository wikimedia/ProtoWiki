/**
 * Shared localStorage helpers for disposable Wikitab caches.
 *
 * Keys and TTLs stay per-module — this file only covers bypass, day keys,
 * fingerprints, and quota-safe JSON read/write.
 */

/** `YYYY-MM-DD` in UTC — the granularity of most day-keyed caches. */
export function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

/** Previous UTC calendar day as `YYYY-MM-DD`. */
export function previousUtcDay(day: string): string {
  const date = new Date(`${day}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

/** `?nocache=1` forces a refetch, for when cached content has gone stale. */
export function isCacheBypassed(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('nocache') === '1'
}

/** Stable fingerprint of article seed title keys (order-independent). */
export function buildSavedFingerprint(titleKeys: readonly string[]): string {
  return [...titleKeys].sort().join('|')
}

/** Settings toggles as a compact `01` / `10` / … string. */
export function buildSettingsFingerprint(flags: readonly boolean[]): string {
  return flags.map((flag) => (flag ? '1' : '0')).join('')
}

/** Parsed object from localStorage, or null. Does not honor `?nocache=1`. */
export function readCacheJson(key: string): unknown {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Read cache JSON, returning null when bypassed or missing/invalid.
 * Callers still validate their own schema.
 */
export function readCacheJsonUnlessBypassed(key: string): unknown {
  if (isCacheBypassed()) return null
  return readCacheJson(key)
}

/** Write JSON; returns false on quota / private mode. Never throws. */
export function writeCacheJson(key: string, value: unknown): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // A full or unavailable localStorage must never break the page.
    return false
  }
}

/** Remove a key; never throws. */
export function removeCacheJson(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

/**
 * Per-language storage key — `wikitab-feed-cache-v22:fr`.
 *
 * Every Wikitab cache holds one wiki's content, so the key always names the
 * wiki's language explicitly. A tab still on the old language (or a late write
 * just before a language-switch reload) then only ever touches its own entry.
 */
export function wikitabCacheKey(base: string, lang: string): string {
  return `${base}:${lang}`
}

/**
 * True for a per-language `base:<lang>` key. The bare `base` key predates the
 * language setting — nothing reads it any more, so it doesn't count.
 */
export function isWikitabCacheKeyFor(key: string, base: string): boolean {
  return key.startsWith(`${base}:`)
}
