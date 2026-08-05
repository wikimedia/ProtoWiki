import { contributeRandomCacheKey } from './cacheKeys'
import { normalizeEnwikiTitle } from './enwikiTitle'
import { fetchRecentChangeForItem } from './fetchRecentChanges'
import { fetchRandomTitles, randomPageItemId } from './fetchRandomPageItems'
import {
  getCachedRecentChangesPreview,
  setCachedRecentChangesPreview,
} from './homeTabCache'
import { fetchPageSummary } from './pageSummary'
import type { HomeRecentChange, HomeSavedItem } from './types'

const MAX_REFILL_ATTEMPTS = 24
/** Prefetch a few titles per random API call; still resolve and render one change at a time. */
const TITLES_PER_REFILL = 3

const REVIEW_FEED_OPTIONS = { reviewFeed: true, skipThankable: true } as const

export interface RandomRecentChangesFeed {
  cacheKey: string
  items: HomeRecentChange[]
  seenTitles: Set<string>
  seenRevids: Set<number>
  pendingTitles: string[]
  refillAttempts: number
  exhausted: boolean
}

function trackTitle(feed: RandomRecentChangesFeed, title: string): void {
  feed.seenTitles.add(normalizeEnwikiTitle(title).toLowerCase())
}

function trackChange(feed: RandomRecentChangesFeed, change: HomeRecentChange): void {
  feed.seenRevids.add(change.revid)
  if (change.enwikiTitle) {
    trackTitle(feed, change.enwikiTitle)
  }
}

export function createRandomRecentChangesFeed(
  initialItems: HomeRecentChange[] = [],
): RandomRecentChangesFeed {
  const feed: RandomRecentChangesFeed = {
    cacheKey: contributeRandomCacheKey(),
    items: [...initialItems],
    seenTitles: new Set<string>(),
    seenRevids: new Set<number>(),
    pendingTitles: [],
    refillAttempts: 0,
    exhausted: false,
  }

  for (const item of initialItems) {
    trackChange(feed, item)
  }

  return feed
}

export function restoreRandomRecentChangesFeed(): RandomRecentChangesFeed {
  const cacheKey = contributeRandomCacheKey()
  const cached = getCachedRecentChangesPreview(cacheKey) ?? []
  return createRandomRecentChangesFeed(cached)
}

export function persistRandomRecentChangesFeed(feed: RandomRecentChangesFeed): void {
  if (!feed.items.length) return
  setCachedRecentChangesPreview(feed.cacheKey, feed.items)
}

async function refillRandomTitles(
  feed: RandomRecentChangesFeed,
  signal?: AbortSignal,
): Promise<boolean> {
  if (feed.exhausted) return false

  feed.refillAttempts += 1
  const titles = await fetchRandomTitles(TITLES_PER_REFILL, signal)

  let added = 0
  for (const title of titles) {
    const key = normalizeEnwikiTitle(title).toLowerCase()
    if (feed.seenTitles.has(key)) continue
    if (
      feed.pendingTitles.some((pending) => normalizeEnwikiTitle(pending).toLowerCase() === key)
    ) {
      continue
    }
    feed.pendingTitles.push(title)
    added++
  }

  if (!added && feed.refillAttempts >= MAX_REFILL_ATTEMPTS) {
    feed.exhausted = true
  }

  return added > 0
}

/** Resolve and append the latest classified edit on a random page, one card at a time. */
export async function loadNextRandomRecentChange(
  feed: RandomRecentChangesFeed,
  signal?: AbortSignal,
): Promise<HomeRecentChange | null> {
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

    const summary = await fetchPageSummary(title, signal, 'wikita-lite-random-recent-change')
    if (!summary?.title && !summary?.normalizedtitle) continue

    const enwikiTitle = summary.normalizedtitle ?? summary.title ?? title
    const displayTitle = summary.normalizedtitle ?? summary.title ?? title

    const savedItem: HomeSavedItem = {
      id: randomPageItemId(enwikiTitle),
      title: displayTitle,
      enwikiTitle,
      description: summary.description ?? '',
      thumbnailUrl: summary.thumbnail?.source,
      savedAt: 0,
    }

    const change = await fetchRecentChangeForItem(
      savedItem,
      signal,
      undefined,
      undefined,
      REVIEW_FEED_OPTIONS,
    )

    if (!change || feed.seenRevids.has(change.revid)) continue

    feed.items.push(change)
    trackChange(feed, change)
    persistRandomRecentChangesFeed(feed)
    return change
  }

  feed.exhausted = true
  return null
}
