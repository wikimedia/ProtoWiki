import { loadConfig } from '@/config'

import { listBookmarks } from './bookmarks'
import { interestsKey, interestsKeyFrom } from './interests'
import { listUserLists } from './lists'
import {
  loadSuggestionPreferences,
  type SuggestionPreferences,
} from './suggestionPreferences'
import type { HomeSavedItem } from './types'

/** Stable fingerprint of the active user's edited page titles. */
export function editedPagesKey(): string {
  const config = loadConfig()
  return (config.userPageLists[config.user]?.editedPages ?? [])
    .map((title) => title.toLowerCase())
    .sort()
    .join('|')
}

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
export function suggestionPrefsKeyFrom(prefs: SuggestionPreferences): string {
  return `prefs:s${prefs.useSavedPages ? 1 : 0}e${prefs.useEditingHistory ? 1 : 0}i${prefs.useInterests ? 1 : 0}`
}

export function suggestionPrefsKey(): string {
  return suggestionPrefsKeyFrom(loadSuggestionPreferences())
}

/** Combined dependency key for personalized suggestion feeds (global prefs). */
export function suggestionFeedsKey(savedItems: HomeSavedItem[] = []): string {
  return `${savedPagesListKey(savedItems)}|${editedPagesKey()}|${interestsKey()}|${suggestionPrefsKey()}`
}

/** Dependency key for Suggested edits when module-specific prefs may differ from global. */
export function helpWantedFeedsKey(
  savedItems: HomeSavedItem[] = [],
  prefs: SuggestionPreferences = loadSuggestionPreferences(),
  interestTitles?: string[],
): string {
  const interestFingerprint =
    interestTitles !== undefined ? interestsKeyFrom(interestTitles) : interestsKey()
  return `${savedPagesListKey(savedItems)}|${editedPagesKey()}|${interestFingerprint}|${suggestionPrefsKeyFrom(prefs)}`
}
