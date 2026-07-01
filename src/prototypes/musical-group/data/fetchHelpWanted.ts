import { mapWithConcurrency } from '@/lib/mapWithConcurrency'

import { bookmarksKey } from './cacheKeys'
import { normalizeEnwikiTitle } from './enwikiTitle'
import {
  fetchEditSuggestionForPage,
  fetchEditSuggestionForSavedItem,
} from './fetchEditSuggestion'
import { fetchMorelikeTitles, resolveRelatedSummary } from './fetchRelatedReading'
import { getCachedHelpWanted, setCachedHelpWanted } from './homeTabCache'
import type { HomeHelpWanted, HomeSavedItem } from './types'

const MAX_SAVED_HELP_WANTED = 2
const MAX_UNSAVED_HELP_WANTED = 1

async function fetchUnsavedSuggestion(
  items: HomeSavedItem[],
  signal?: AbortSignal,
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

/** Up to two edit suggestions from saved pages, plus up to one from an unsaved page. */
export async function fetchHelpWanted(
  items: HomeSavedItem[],
  signal?: AbortSignal,
): Promise<HomeHelpWanted[]> {
  const dependencyKey = bookmarksKey()
  const cached = getCachedHelpWanted(dependencyKey)
  if (cached) return cached

  const candidates = items.filter((item) => item.enwikiTitle).slice(0, MAX_SAVED_HELP_WANTED)
  const savedSuggestions = await mapWithConcurrency(
    candidates,
    2,
    (item) => fetchEditSuggestionForSavedItem(item, signal, 'musical-group-help-wanted'),
    signal,
  )
  const suggestions = savedSuggestions.filter((entry): entry is HomeHelpWanted => entry !== null)

  const unsavedSuggestion = await fetchUnsavedSuggestion(items, signal)
  if (unsavedSuggestion) {
    suggestions.push(unsavedSuggestion)
  }

  setCachedHelpWanted(dependencyKey, suggestions)
  return suggestions
}
