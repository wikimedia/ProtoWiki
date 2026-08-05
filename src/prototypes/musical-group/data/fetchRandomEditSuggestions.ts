import { contributeRandomCacheKey } from './cacheKeys'
import { normalizeEnwikiTitle } from './enwikiTitle'
import { fetchEditSuggestionForPage } from './fetchEditSuggestion'
import { fetchRandomTitles, randomPageItemId } from './fetchRandomPageItems'
import { getCachedHelpWanted, setCachedHelpWanted } from './homeTabCache'
import { fetchPageSummary } from './pageSummary'
import type { HomeHelpWanted } from './types'

const MAX_REFILL_ATTEMPTS = 24
/** Prefetch a few titles per random API call; still resolve and render one suggestion at a time. */
const TITLES_PER_REFILL = 3

export interface RandomEditSuggestionsFeed {
  cacheKey: string
  items: HomeHelpWanted[]
  seenTitles: Set<string>
  seenIds: Set<string>
  pendingTitles: string[]
  refillAttempts: number
  exhausted: boolean
}

function trackTitle(feed: RandomEditSuggestionsFeed, title: string): void {
  feed.seenTitles.add(normalizeEnwikiTitle(title).toLowerCase())
}

function trackSuggestion(feed: RandomEditSuggestionsFeed, suggestion: HomeHelpWanted): void {
  feed.seenIds.add(suggestion.itemId)
  if (suggestion.enwikiTitle) {
    trackTitle(feed, suggestion.enwikiTitle)
  }
}

export function createRandomEditSuggestionsFeed(
  initialItems: HomeHelpWanted[] = [],
): RandomEditSuggestionsFeed {
  const feed: RandomEditSuggestionsFeed = {
    cacheKey: contributeRandomCacheKey(),
    items: [...initialItems],
    seenTitles: new Set<string>(),
    seenIds: new Set<string>(),
    pendingTitles: [],
    refillAttempts: 0,
    exhausted: false,
  }

  for (const item of initialItems) {
    trackSuggestion(feed, item)
  }

  return feed
}

export function restoreRandomEditSuggestionsFeed(): RandomEditSuggestionsFeed {
  const cacheKey = contributeRandomCacheKey()
  const cached = getCachedHelpWanted(cacheKey) ?? []
  return createRandomEditSuggestionsFeed(cached)
}

export function persistRandomEditSuggestionsFeed(feed: RandomEditSuggestionsFeed): void {
  if (!feed.items.length) return
  setCachedHelpWanted(feed.cacheKey, feed.items)
}

async function refillRandomTitles(
  feed: RandomEditSuggestionsFeed,
  signal?: AbortSignal,
): Promise<boolean> {
  if (feed.exhausted) return false

  feed.refillAttempts += 1
  const titles = await fetchRandomTitles(TITLES_PER_REFILL, signal)

  let added = 0
  for (const title of titles) {
    const key = normalizeEnwikiTitle(title).toLowerCase()
    if (feed.seenTitles.has(key)) continue
    trackTitle(feed, title)
    feed.pendingTitles.push(title)
    added++
  }

  if (!added && feed.refillAttempts >= MAX_REFILL_ATTEMPTS) {
    feed.exhausted = true
  }

  return added > 0
}

/** Resolve and append the next random-page edit suggestion, one card at a time. */
export async function loadNextRandomEditSuggestion(
  feed: RandomEditSuggestionsFeed,
  signal?: AbortSignal,
): Promise<HomeHelpWanted | null> {
  if (feed.exhausted) return null

  while (!feed.pendingTitles.length) {
    const refilled = await refillRandomTitles(feed, signal)
    if (!refilled) {
      feed.exhausted = true
      return null
    }
  }

  while (feed.pendingTitles.length) {
    const title = feed.pendingTitles.shift()
    if (!title) return null

    const summary = await fetchPageSummary(title, signal, 'wikita-lite-random-edit-suggestion')
    if (!summary?.title && !summary?.normalizedtitle) continue

    const enwikiTitle = summary.normalizedtitle ?? summary.title ?? title
    const displayTitle = summary.normalizedtitle ?? summary.title ?? title
    const itemId = randomPageItemId(enwikiTitle)

    if (feed.seenIds.has(itemId)) continue
    feed.seenIds.add(itemId)

    const suggestion = await fetchEditSuggestionForPage(
      {
        itemId,
        title: displayTitle,
        enwikiTitle,
        description: summary.description,
        thumbnailUrl: summary.thumbnail?.source,
      },
      displayTitle,
      signal,
      'wikita-lite-random-edit-suggestion',
    )

    if (!suggestion) continue

    feed.items.push(suggestion)
    persistRandomEditSuggestionsFeed(feed)
    return suggestion
  }

  feed.exhausted = true
  return null
}
