import { listBookmarks } from './bookmarks'

/** Stable fingerprint of the saved-pages library. Changes on add/remove/re-save. */
export function bookmarksKey(): string {
  return listBookmarks()
    .map((entry) => `${entry.id}:${entry.savedAt}`)
    .sort()
    .join('|')
}

/** UTC calendar day for daily feeds, e.g. `20260701`. */
export function utcDayKey(date = new Date()): string {
  const yyyy = String(date.getUTCFullYear())
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}

export function utcDayParts(date = new Date()): { yyyy: string; mm: string; dd: string; key: string } {
  const yyyy = String(date.getUTCFullYear())
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return { yyyy, mm, dd, key: `${yyyy}${mm}${dd}` }
}
