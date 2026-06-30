import type { BookmarkEntry } from './bookmarks'
import { getCachedMusicalGroup } from './musicalGroupCache'
import type { HomeSavedItem } from './types'
import { commonsFileUrl, fetchEntityClaims } from './wikidataApi'

async function resolveSavedItem(
  entry: BookmarkEntry,
  signal?: AbortSignal,
): Promise<HomeSavedItem | null> {
  const cached = getCachedMusicalGroup(entry.id)
  if (cached) {
    const { data } = cached
    const thumbnailUrl =
      data.images[0]?.url ??
      (data.imageFilename ? commonsFileUrl(data.imageFilename, 256) : undefined)
    return {
      id: entry.id,
      title: data.label,
      enwikiTitle: data.enwikiTitle,
      description: data.description ?? '',
      thumbnailUrl,
      savedAt: entry.savedAt,
    }
  }

  try {
    const claims = await fetchEntityClaims(entry.id, signal)
    return {
      id: entry.id,
      title: claims.label,
      enwikiTitle: claims.enwikiTitle,
      description: claims.description ?? '',
      thumbnailUrl: claims.imageFilename
        ? commonsFileUrl(claims.imageFilename, 256)
        : undefined,
      savedAt: entry.savedAt,
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    return null
  }
}

/** Resolve each bookmarked QID to display + lookup metadata (cache-first). */
export async function fetchSavedItemSummaries(
  entries: BookmarkEntry[],
  signal?: AbortSignal,
): Promise<HomeSavedItem[]> {
  const resolved = await Promise.all(entries.map((entry) => resolveSavedItem(entry, signal)))
  return resolved.filter((item): item is HomeSavedItem => item !== null)
}
