import { listBookmarks } from './bookmarks'
import { getCachedMusicalGroup } from './musicalGroupCache'
import type { HomeSavedItem } from './types'

function normalizeDisplayTitle(title: string): string {
  return title.trim().toLowerCase()
}

export function isSavedPageTitle(
  title: string,
  savedItems?: Pick<HomeSavedItem, 'title'>[] | null,
): boolean {
  const saved = savedItems ?? []
  const key = normalizeDisplayTitle(title)
  return saved.some((item) => normalizeDisplayTitle(item.title) === key)
}

/** Show "Related to …" only when the seed page is not in the user's saved library. */
export function formatRelatedToLabel(
  relatedToTitle: string,
  savedItems?: Pick<HomeSavedItem, 'title'>[] | null,
  options?: { alwaysShow?: boolean },
): string {
  const saved = savedItems ?? []
  if (!relatedToTitle) return ''
  if (!options?.alwaysShow && isSavedPageTitle(relatedToTitle, saved)) return ''
  return `Related to ${relatedToTitle}`
}

/** "Related to …" for edit suggestions seeded from a saved page onto a different article. */
export function formatEditSuggestionRelatedToLabel(
  suggestion: { itemId: string; relatedToTitle: string },
  savedItems?: Pick<HomeSavedItem, 'id' | 'title'>[] | null,
): string {
  const saved = savedItems ?? []
  const isSavedPageSuggestion = saved.some((item) => item.id === suggestion.itemId)
  if (isSavedPageSuggestion) return ''
  return formatRelatedToLabel(suggestion.relatedToTitle, saved, { alwaysShow: true })
}

/** "Related to …" for recommendations seeded from a list on the Saved tab. */
export function formatRelatedToListLabel(listName: string): string {
  if (!listName) return ''
  return `Related to ${listName}`
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

/** Saved page id + title from the local entity cache (for edit-suggestion labels). */
export function getCachedSavedPagesForLabels(): Pick<HomeSavedItem, 'id' | 'title'>[] {
  return listBookmarks()
    .map((entry) => {
      const cached = getCachedMusicalGroup(entry.id)
      return cached ? { id: entry.id, title: cached.data.label } : null
    })
    .filter((item): item is Pick<HomeSavedItem, 'id' | 'title'> => item !== null)
}
