import { listBookmarks } from './bookmarks'
import { getCachedMusicalGroup } from './musicalGroupCache'
import type { HomeSavedItem } from './types'

function normalizeDisplayTitle(title: string): string {
  return title.trim().toLowerCase()
}

export function isSavedPageTitle(
  title: string,
  savedItems: Pick<HomeSavedItem, 'title'>[],
): boolean {
  const key = normalizeDisplayTitle(title)
  return savedItems.some((item) => normalizeDisplayTitle(item.title) === key)
}

/** Show "Related to …" only when the seed page is not in the user's saved library. */
export function formatRelatedToLabel(
  relatedToTitle: string,
  savedItems: Pick<HomeSavedItem, 'title'>[],
  options?: { alwaysShow?: boolean },
): string {
  if (!relatedToTitle) return ''
  if (!options?.alwaysShow && isSavedPageTitle(relatedToTitle, savedItems)) return ''
  return `Related to ${relatedToTitle}`
}

/** "Related to …" for edit suggestions seeded from a saved page onto a different article. */
export function formatEditSuggestionRelatedToLabel(
  suggestion: Pick<HomeSavedItem, 'id'> & { relatedToTitle: string },
  savedItems: Pick<HomeSavedItem, 'id' | 'title'>[],
): string {
  const isSavedPageSuggestion = savedItems.some((item) => item.id === suggestion.itemId)
  if (isSavedPageSuggestion) return ''
  return formatRelatedToLabel(suggestion.relatedToTitle, savedItems, { alwaysShow: true })
}

/** Saved page titles from the local entity cache (for views outside the home feed). */
export function getCachedSavedPageTitles(): Pick<HomeSavedItem, 'title'>[] {
  return listBookmarks()
    .map((entry) => {
      const cached = getCachedMusicalGroup(entry.id)
      return cached ? { title: cached.data.label } : null
    })
    .filter((item): item is Pick<HomeSavedItem, 'title'> => item !== null)
}
