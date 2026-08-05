import { listBookmarks } from './bookmarks'
import { interestsKey } from './interests'
import { listUserLists } from './lists'
import { loadSuggestionPreferences } from './suggestionPreferences'
import type { HomeSavedItem } from './types'

/** Stable fingerprint of the saved-pages library. Changes on add/remove/re-save. */
export function bookmarksKey(): string {
  return listBookmarks()
    .map((entry) => `${entry.id}:${entry.savedAt}`)
    .sort()
    .join('|')
}

/** Stable fingerprint of user lists and their item membership. */
export function listsKey(): string {
  return listUserLists()
    .map((list) => `${list.id}:${list.itemIds.join(',')}`)
    .join('|')
}

/** Feed dependency key from saved item ids — changes only on add/remove. */
export function savedPagesListKey(items: HomeSavedItem[]): string {
  return [...items]
    .map((item) => item.id)
    .sort()
    .join(',')
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

/** Daily cache key for contribute-tab feeds seeded from random pages. */
export function contributeRandomCacheKey(date = new Date()): string {
  return `contribute-random:${utcDayKey(date)}`
}

/** Fingerprint of suggestion preference toggles. */
export function suggestionPrefsKey(): string {
  const prefs = loadSuggestionPreferences()
  return `prefs:s${prefs.useSavedPages ? 1 : 0}i${prefs.useInterests ? 1 : 0}`
}

/** Combined dependency key for personalized suggestion feeds. */
export function suggestionFeedsKey(savedItems: HomeSavedItem[] = []): string {
  return `${savedPagesListKey(savedItems)}|${interestsKey()}|${suggestionPrefsKey()}`
}
