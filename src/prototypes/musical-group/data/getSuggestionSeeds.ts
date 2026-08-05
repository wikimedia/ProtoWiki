import { listInterests } from './interests'
import {
  loadSuggestionPreferences,
  type SuggestionPreferences,
} from './suggestionPreferences'
import type { HomeSavedItem } from './types'

/** Enwiki titles to use as morelike / suggestion seeds. */
export function getSuggestionSeedTitles(
  savedItems: HomeSavedItem[],
  prefs: SuggestionPreferences = loadSuggestionPreferences(),
  interests: string[] = listInterests(),
): string[] {
  const seeds: string[] = []

  if (prefs.useSavedPages) {
    for (const item of savedItems) {
      if (item.enwikiTitle) seeds.push(item.enwikiTitle)
    }
  }

  if (prefs.useInterests) {
    seeds.push(...interests)
  }

  const seen = new Set<string>()
  const unique: string[] = []
  for (const title of seeds) {
    const key = title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(title)
  }
  return unique
}

/** Synthetic saved items for feed loaders that expect `HomeSavedItem[]`. */
export function suggestionSeedItems(
  savedItems: HomeSavedItem[],
  prefs?: SuggestionPreferences,
  interests?: string[],
): HomeSavedItem[] {
  const titles = getSuggestionSeedTitles(savedItems, prefs, interests)
  return titles.map((title, index) => ({
    id: `seed:${title.toLowerCase()}`,
    title,
    enwikiTitle: title,
    savedAt: index,
  }))
}

export function hasSuggestionSeeds(
  savedItems: HomeSavedItem[],
  prefs?: SuggestionPreferences,
  interests?: string[],
): boolean {
  return getSuggestionSeedTitles(savedItems, prefs, interests).length > 0
}
