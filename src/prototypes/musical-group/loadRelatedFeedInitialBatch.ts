import { mapWithConcurrency } from '@/lib/mapWithConcurrency'

import { normalizeEnwikiTitle } from './data/enwikiTitle'
import { fetchMorelikeTitles, resolveRelatedSummary } from './data/fetchRelatedReading'
import {
  getCachedRelatedFeed,
  setCachedRelatedFeed,
  type CachedRelatedFeedState,
  type RelatedFeedTabId,
} from './data/homeTabCache'
import type { UserList } from './data/lists'
import { getCachedMusicalGroup } from './data/musicalGroupCache'
import type { HomeRelated, HomeSavedItem } from './data/types'

/** How many related cards to resolve per loadMore call. */
export const RELATED_FEED_PAGE_SIZE = 5
/** Refill the title pool from another seed once it drops below this. */
const REFILL_THRESHOLD = RELATED_FEED_PAGE_SIZE
/** Titles fetched per morelike API call. */
const MORELIKE_BATCH = 20
/** Max titles to add from one saved page per refill round. */
const TITLES_PER_SEED = 2
const SUMMARY_CONCURRENCY = 2

export interface RelatedFeedSeedCursor {
  searchTitle: string
  displayTitle: string
  listId?: string
  offset: number
}

export interface RelatedFeedPoolTitle {
  title: string
  relatedToTitle: string
  relatedToListId?: string
}

export interface RelatedFeedRuntimeState {
  items: HomeRelated[]
  seen: Set<string>
  seedTitles: Set<string>
  seeds: RelatedFeedSeedCursor[]
  titlePool: RelatedFeedPoolTitle[]
  nextSeedIndex: number
  hasMore: boolean
}

function titleKey(title: string): string {
  return normalizeEnwikiTitle(title).toLowerCase()
}

function shuffleSeeds(seeds: RelatedFeedSeedCursor[]): void {
  for (let i = seeds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[seeds[i], seeds[j]] = [seeds[j], seeds[i]]
  }
}

export function createRelatedFeedState(savedItems: HomeSavedItem[]): RelatedFeedRuntimeState {
  const seen = new Set<string>()
  const seedTitles = new Set<string>()
  const seeds: RelatedFeedSeedCursor[] = []

  for (const item of savedItems) {
    if (!item.enwikiTitle) continue
    const key = titleKey(item.enwikiTitle)
    seen.add(key)
    if (seedTitles.has(key)) continue
    seedTitles.add(key)
    seeds.push({ searchTitle: item.enwikiTitle, displayTitle: item.title, offset: 0 })
  }

  shuffleSeeds(seeds)

  return {
    items: [],
    seen,
    seedTitles,
    seeds,
    titlePool: [],
    nextSeedIndex: 0,
    hasMore: seeds.length > 0,
  }
}

/** Seeds from list membership; displayTitle is the list name for "Related to …" labels. */
export function createListRelatedFeedState(lists: UserList[]): RelatedFeedRuntimeState {
  const seen = new Set<string>()
  const seedTitles = new Set<string>()
  const seedKeys = new Set<string>()
  const seeds: RelatedFeedSeedCursor[] = []

  for (const list of lists) {
    for (const itemId of list.itemIds) {
      const cached = getCachedMusicalGroup(itemId)
      const enwikiTitle = cached?.data.enwikiTitle
      if (!enwikiTitle) continue

      const articleKey = titleKey(enwikiTitle)
      seen.add(articleKey)

      const compositeKey = `${list.id}|${articleKey}`
      if (seedKeys.has(compositeKey)) continue
      seedKeys.add(compositeKey)
      seedTitles.add(articleKey)

      seeds.push({
        searchTitle: enwikiTitle,
        displayTitle: list.name,
        listId: list.id,
        offset: 0,
      })
    }
  }

  shuffleSeeds(seeds)

  return {
    items: [],
    seen,
    seedTitles,
    seeds,
    titlePool: [],
    nextSeedIndex: 0,
    hasMore: seeds.length > 0,
  }
}

export function relatedFeedStateFromCache(cached: CachedRelatedFeedState): RelatedFeedRuntimeState {
  return {
    items: cached.items,
    seen: new Set(cached.seen),
    seedTitles: new Set(cached.seedTitles),
    seeds: cached.seeds,
    titlePool: cached.titlePool,
    nextSeedIndex: cached.nextSeedIndex,
    hasMore: cached.hasMore,
  }
}

export function persistRelatedFeedState(
  feedTabId: RelatedFeedTabId,
  dependencyKey: string,
  state: RelatedFeedRuntimeState,
): void {
  setCachedRelatedFeed(feedTabId, {
    dependencyKey,
    items: state.items,
    seen: [...state.seen],
    seedTitles: [...state.seedTitles],
    seeds: state.seeds,
    titlePool: state.titlePool,
    nextSeedIndex: state.nextSeedIndex,
    hasMore: state.hasMore,
    fetchedAt: Date.now(),
  })
}

function promoteRelatedSeed(state: RelatedFeedRuntimeState, item: HomeRelated): void {
  const key = titleKey(item.title)
  if (state.seedTitles.has(key)) return
  state.seedTitles.add(key)
  state.seeds.push({ searchTitle: item.title, displayTitle: item.title, offset: 0 })
}

async function refillPool(state: RelatedFeedRuntimeState, signal: AbortSignal): Promise<void> {
  if (!state.seeds.length) {
    state.hasMore = false
    return
  }

  let passes = 0
  const maxPasses = Math.max(state.seeds.length * 2, 4)

  while (state.titlePool.length < REFILL_THRESHOLD && passes < maxPasses) {
    const start = state.nextSeedIndex

    for (let i = 0; i < state.seeds.length && state.titlePool.length < REFILL_THRESHOLD; i++) {
      const seed = state.seeds[(start + i) % state.seeds.length]
      const titles = await fetchMorelikeTitles(
        seed.searchTitle,
        signal,
        MORELIKE_BATCH,
        seed.offset,
      )
      seed.offset += MORELIKE_BATCH

      let added = 0
      for (const title of titles) {
        if (added >= TITLES_PER_SEED) break

        const key = titleKey(title)
        if (state.seen.has(key)) continue
        state.seen.add(key)
        state.titlePool.push({
          title,
          relatedToTitle: seed.displayTitle,
          relatedToListId: seed.listId,
        })
        added++
      }
    }

    state.nextSeedIndex = (start + state.seeds.length) % state.seeds.length
    passes++
  }

  state.hasMore = state.seeds.length > 0
}

/** Resolve and append one page of related cards, mutating `state`. */
export async function loadRelatedFeedBatch(
  state: RelatedFeedRuntimeState,
  signal: AbortSignal,
): Promise<void> {
  await refillPool(state, signal)

  const batchTitles = state.titlePool.splice(0, RELATED_FEED_PAGE_SIZE)
  if (batchTitles.length) {
    const resolved = await mapWithConcurrency(
      batchTitles,
      SUMMARY_CONCURRENCY,
      ({ title, relatedToTitle }) => resolveRelatedSummary(title, relatedToTitle, signal),
      signal,
    )
    const fresh = resolved
      .map((item, index) => {
        if (!item) return null
        const relatedToListId = batchTitles[index]?.relatedToListId
        return relatedToListId ? { ...item, relatedToListId } : item
      })
      .filter((item): item is HomeRelated => item !== null)
    if (fresh.length) {
      for (const item of fresh) {
        promoteRelatedSeed(state, item)
      }
      state.items = [...state.items, ...fresh]
    }
  }

  state.hasMore = state.seeds.length > 0
}

function previewSeedTitlesFromItems(savedItems: HomeSavedItem[]): string[] {
  const titles: string[] = []
  const seen = new Set<string>()

  for (const item of savedItems) {
    if (!item.enwikiTitle) continue
    const key = item.title.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    titles.push(item.title)
  }

  return titles
}

function previewSeedQuotaMet(
  state: RelatedFeedRuntimeState,
  minPerSeed: number,
  seedTitles: string[],
): boolean {
  if (seedTitles.length === 0) return true

  const counts = new Map<string, number>()
  for (const item of state.items) {
    const key = item.relatedToTitle.trim().toLowerCase()
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  for (const title of seedTitles) {
    const key = title.trim().toLowerCase()
    if ((counts.get(key) ?? 0) < minPerSeed) return false
  }

  return true
}

export function relatedFeedPreviewQuotaMet(
  feedTabId: RelatedFeedTabId,
  dependencyKey: string,
  seedItems: HomeSavedItem[],
  minPerSeed: number,
): boolean {
  const cached = getCachedRelatedFeed(feedTabId, dependencyKey)
  if (!cached) return false

  const state = relatedFeedStateFromCache(cached)
  return previewSeedQuotaMet(state, minPerSeed, previewSeedTitlesFromItems(seedItems))
}

export interface LoadRelatedFeedInitialBatchOptions {
  /** Keep loading batches until each seed has at least this many cards (preview tabs). */
  minItemsPerSeed?: number
  maxExtraBatches?: number
}

/** Load the first batch for a feed tab, using cache when available. */
export async function loadRelatedFeedInitialBatch(
  feedTabId: RelatedFeedTabId,
  savedItems: HomeSavedItem[],
  dependencyKey: string,
  signal: AbortSignal,
  options?: LoadRelatedFeedInitialBatchOptions,
): Promise<HomeRelated[]> {
  const minPerSeed = options?.minItemsPerSeed ?? 0
  const maxExtra = options?.maxExtraBatches ?? 8
  const previewSeedTitles = previewSeedTitlesFromItems(savedItems)

  const cached = getCachedRelatedFeed(feedTabId, dependencyKey)
  const state = cached
    ? relatedFeedStateFromCache(cached)
    : createRelatedFeedState(savedItems)

  if (
    cached &&
    (minPerSeed === 0 || previewSeedQuotaMet(state, minPerSeed, previewSeedTitles))
  ) {
    return cached.items
  }

  if (!cached) {
    await loadRelatedFeedBatch(state, signal)
  }

  if (minPerSeed > 0) {
    let extra = 0
    while (
      extra < maxExtra &&
      state.hasMore &&
      !previewSeedQuotaMet(state, minPerSeed, previewSeedTitles)
    ) {
      await loadRelatedFeedBatch(state, signal)
      extra++
    }
  }

  persistRelatedFeedState(feedTabId, dependencyKey, state)
  return state.items
}
