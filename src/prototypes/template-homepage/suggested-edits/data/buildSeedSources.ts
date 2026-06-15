import type { ConfigUser } from '@/config'
import type { InterestsSettings } from './interestsFixtures'

export type SeedSourceKind = 'interests' | 'history' | 'watchlist' | 'readingList'

export interface SeedSource {
  kind: SeedSourceKind
  titles: string[]
}

export interface BuildSeedSourcesInput {
  interestsSettings: InterestsSettings
  user: ConfigUser
  editedPages: string[]
  watchlistPages: string[]
  readingListPages: string[]
}

const MAX_SERIAL_SEEDS = 9

function normalizeTitleKey(title: string): string {
  return title.trim().replace(/_/g, ' ').toLowerCase()
}

function dedupeTitles(titles: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const title of titles) {
    const trimmed = title.trim()
    if (!trimmed.length) continue
    const key = normalizeTitleKey(trimmed)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }

  return result
}

/** Selected page chips only — topic chips are ignored for fetching. */
export function getInterestPageTitles(settings: InterestsSettings): string[] {
  return dedupeTitles(
    settings.chips
      .filter((chip) => chip.kind === 'page' && chip.selected)
      .map((chip) => chip.label),
  )
}

/** Build up to four seed sources from interests + personalization toggles. */
export function buildSeedSources(input: BuildSeedSourcesInput): SeedSource[] {
  const { interestsSettings, user, editedPages, watchlistPages, readingListPages } = input
  const { personalization } = interestsSettings
  const sources: SeedSource[] = []

  const interestTitles = getInterestPageTitles(interestsSettings)
  if (interestTitles.length) {
    sources.push({ kind: 'interests', titles: interestTitles })
  }

  if (personalization.editingHistory && editedPages.length) {
    sources.push({ kind: 'history', titles: dedupeTitles(editedPages) })
  }

  if (personalization.watchlist && user !== 'real' && watchlistPages.length) {
    sources.push({ kind: 'watchlist', titles: dedupeTitles(watchlistPages) })
  }

  if (personalization.readingList && user !== 'real' && readingListPages.length) {
    sources.push({ kind: 'readingList', titles: dedupeTitles(readingListPages) })
  }

  return sources
}

/** Flatten all seed titles from sources, deduped globally. */
export function flattenSeedTitles(sources: SeedSource[]): string[] {
  return dedupeTitles(sources.flatMap((source) => source.titles))
}

/** Whether any seed source has at least one title. */
export function hasSeedTitles(sources: SeedSource[]): boolean {
  return flattenSeedTitles(sources).length > 0
}

/**
 * Sample up to 9 seeds evenly across enabled sources (round-robin).
 * Used when serial multi-call mode has too many query pages.
 */
export function sampleSeedsForSerial(sources: SeedSource[], maxSeeds = MAX_SERIAL_SEEDS): string[] {
  const nonEmpty = sources.filter((source) => source.titles.length > 0)
  if (!nonEmpty.length) return []

  const allTitles = flattenSeedTitles(nonEmpty)
  if (allTitles.length <= maxSeeds) return allTitles

  const picked: string[] = []
  const pickedKeys = new Set<string>()
  const indices = nonEmpty.map(() => 0)

  while (picked.length < maxSeeds) {
    let added = false

    for (let sourceIndex = 0; sourceIndex < nonEmpty.length; sourceIndex += 1) {
      if (picked.length >= maxSeeds) break

      const source = nonEmpty[sourceIndex]
      let index = indices[sourceIndex]

      while (index < source.titles.length) {
        const title = source.titles[index]
        index += 1
        indices[sourceIndex] = index

        const key = normalizeTitleKey(title)
        if (pickedKeys.has(key)) continue

        pickedKeys.add(key)
        picked.push(title)
        added = true
        break
      }
    }

    if (!added) break
  }

  return picked
}

/** Per-seed result limit for serial mode: 9 seeds → 1 each; 2 seeds → 5 each. */
export function serialLimitPerSeed(seedCount: number): number {
  if (seedCount <= 0) return 1
  return Math.min(5, Math.max(1, Math.ceil(9 / seedCount)))
}

/** Filter button label — always "Interests" (opens interests settings). */
export function buildTopicFilterLabel(_settings: InterestsSettings): string {
  return 'Interests'
}
