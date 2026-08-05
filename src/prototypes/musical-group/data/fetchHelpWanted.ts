import { bookmarksKey } from './cacheKeys'
import { normalizeEnwikiTitle } from './enwikiTitle'
import {
  fetchEditSuggestionForPage,
  fetchEditSuggestionForSavedItem,
} from './fetchEditSuggestion'
import { fetchMorelikeTitles, resolveRelatedSummary } from './fetchRelatedReading'
import { getCachedHelpWanted, setCachedHelpWanted } from './homeTabCache'
import type { HomeHelpWanted, HomeSavedItem } from './types'

const DEFAULT_HELP_WANTED_LIMIT = 2

async function fetchUnsavedSuggestion(
  items: HomeSavedItem[],
  signal?: AbortSignal,
  existing: HomeHelpWanted[] = [],
): Promise<HomeHelpWanted | null> {
  const seeds = items.filter((item) => item.enwikiTitle)
  if (!seeds.length) return null

  const excludedTitles = new Set<string>()
  const excludedIds = new Set<string>()
  for (const item of items) {
    excludedIds.add(item.id)
    if (item.enwikiTitle) {
      excludedTitles.add(normalizeEnwikiTitle(item.enwikiTitle).toLowerCase())
    }
  }
  for (const suggestion of existing) {
    excludedIds.add(suggestion.itemId)
    if (suggestion.enwikiTitle) {
      excludedTitles.add(normalizeEnwikiTitle(suggestion.enwikiTitle).toLowerCase())
    }
  }

  const shuffledSeeds = [...seeds].sort(() => Math.random() - 0.5)

  for (const seed of shuffledSeeds) {
    const titles = await fetchMorelikeTitles(seed.enwikiTitle as string, signal, 8)

    for (const title of titles) {
      const titleKey = normalizeEnwikiTitle(title).toLowerCase()
      if (excludedTitles.has(titleKey)) continue

      const summary = await resolveRelatedSummary(title, seed.title, signal)
      if (!summary?.itemId) continue
      if (excludedIds.has(summary.itemId)) continue

      excludedTitles.add(titleKey)
      excludedIds.add(summary.itemId)

      const suggestion = await fetchEditSuggestionForPage(
        {
          itemId: summary.itemId,
          title: summary.title,
          enwikiTitle: title,
          description: summary.description,
          thumbnailUrl: summary.thumbnailUrl,
        },
        seed.title,
        signal,
        'musical-group-help-wanted',
      )
      if (suggestion) return suggestion
    }
  }

  return null
}

/** Edit suggestions for saved pages and related articles. */
export async function fetchHelpWanted(
  seedItems: HomeSavedItem[],
  signal?: AbortSignal,
  limit = DEFAULT_HELP_WANTED_LIMIT,
  options?: {
    onEach?: (suggestion: HomeHelpWanted) => void
    dependencyKey?: string
    /** When false, skip direct edit suggestions on saved pages. Default true. */
    includeSavedSuggestions?: boolean
    /** Saved bookmark summaries for the direct-suggestion leg. Defaults to seedItems. */
    savedItems?: HomeSavedItem[]
  },
): Promise<HomeHelpWanted[]> {
  const dependencyKey = options?.dependencyKey ?? bookmarksKey()
  const cached = getCachedHelpWanted(dependencyKey)
  if (cached?.length >= limit) {
    return cached.slice(0, limit)
  }

  const includeSaved = options?.includeSavedSuggestions !== false
  const savedForDirect = options?.savedItems ?? seedItems

  const suggestions: HomeHelpWanted[] = []

  if (includeSaved) {
    const savedCandidates = savedForDirect.filter((item) => item.enwikiTitle)

    for (const item of savedCandidates) {
      if (suggestions.length >= limit) break
      const suggestion = await fetchEditSuggestionForSavedItem(
        item,
        signal,
        'musical-group-help-wanted',
      )
      if (suggestion) {
        suggestions.push(suggestion)
        options?.onEach?.(suggestion)
      }
    }
  }

  while (suggestions.length < limit) {
    const unsavedSuggestion = await fetchUnsavedSuggestion(seedItems, signal, suggestions)
    if (!unsavedSuggestion) break
    suggestions.push(unsavedSuggestion)
    options?.onEach?.(unsavedSuggestion)
  }

  if (suggestions.length) {
    setCachedHelpWanted(dependencyKey, suggestions)
  }
  return suggestions
}
