/**
 * Day-keyed cache for Home module data, in localStorage. Cache only: clearing it
 * must only ever cost a refetch. One entry per slot, replaced on write. Empty
 * results are never cached, so they're retried next load. A read can also cap
 * an entry's age, for data that goes stale within the day.
 */

/* Its own prefix, so this template's state doesn't leak into other prototypes'. */
const CACHE_PREFIX = 'protowiki-template-home-cache-v1:'

/** `YYYY-MM-DD` in UTC, so a module's cards stay put for the day. */
export function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

export function readDayCache<T>(slot: string, key: string, maxAgeMs?: number): T[] | null {
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + slot)
    if (!raw) return null
    const entry = JSON.parse(raw) as { key?: string; value?: T[]; at?: number }
    if (entry.key !== key || !Array.isArray(entry.value)) return null
    if (maxAgeMs != null && Date.now() - (entry.at ?? 0) > maxAgeMs) return null
    return entry.value
  } catch {
    return null
  }
}

export function writeDayCache<T>(slot: string, key: string, value: T[]): void {
  if (!value.length) return
  try {
    window.localStorage.setItem(
      CACHE_PREFIX + slot,
      JSON.stringify({ key, value, at: Date.now() }),
    )
  } catch {
    // Full or unavailable storage must never break the page.
  }
}
