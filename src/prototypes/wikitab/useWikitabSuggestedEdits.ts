import { ref } from 'vue'

import {
  createSuggestedEditsFeed,
  type SuggestedEditsFeed,
} from './data/fetchWikitabSuggestedEdits'
import { fetchWikitabPageSummary } from './data/fetchWikitabPageSummary'
import {
  buildSuggestedEditsSavedFingerprint,
  isCacheBypassed,
  readCachedSuggestedEdits,
  utcDayKey,
  writeCachedSuggestedEdits,
} from './data/suggestedEditsCache'
import type { WikitabSavedItem } from './data/wikitabConfig'
import { cloneSavedItems, uniqueArticleSeedsFromSavedItems } from './data/savedCardHelpers'
import { WIKITAB_SUGGESTED_EDITS_MODULE_SPEC, type WikitabCardData } from './sections'

const { initialCount, pageSize } = WIKITAB_SUGGESTED_EDITS_MODULE_SPEC

function cardPageid(card: WikitabCardData): number | null {
  const match = card.key.match(/^suggested-edits:(\d+)$/)
  return match ? Number(match[1]) : null
}

function seenPageidsFromCards(cards: readonly WikitabCardData[]): Set<number> {
  const seen = new Set<number>()
  for (const card of cards) {
    const pageid = cardPageid(card)
    if (pageid !== null) seen.add(pageid)
  }
  return seen
}

function sessionCacheKey(day: string, savedFingerprint: string): string {
  return `${day}:${savedFingerprint}`
}

export function useWikitabSuggestedEdits() {
  const items = ref<WikitabCardData[]>([])
  const loading = ref(false)
  const fillingInitial = ref(false)
  const loadingMore = ref(false)
  const hasMore = ref(false)
  const error = ref<string | null>(null)
  /** True once a refresh has settled for the current saved snapshot. */
  const isLoaded = ref(false)

  let controller: AbortController | null = null
  let activeFeed: SuggestedEditsFeed | null = null
  let cacheContext: { day: string; savedFingerprint: string } | null = null
  let savedItemsSnapshot: WikitabSavedItem[] = []
  let loadedSessionKey: string | null = null
  let feedLock: Promise<void> = Promise.resolve()

  function withFeedLock<T>(operation: () => Promise<T>): Promise<T> {
    const run = feedLock.then(operation, operation)
    feedLock = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  function patchCard(pageid: number, patch: Partial<WikitabCardData>): void {
    items.value = items.value.map((card) => {
      if (cardPageid(card) !== pageid) return card
      return { ...card, ...patch }
    })
  }

  function scheduleThumbnailBackfill(card: WikitabCardData, signal: AbortSignal): void {
    if (card.thumbnailUrl) return

    const title = card.title ?? card.linkTitle
    if (!title) return

    void fetchWikitabPageSummary(title, signal, 'wikitab-suggested-edits-thumbnail')
      .then((summary) => {
        if (signal.aborted || !summary?.thumbnailUrl) return
        const pageid = cardPageid(card)
        if (pageid === null) return
        patchCard(pageid, { thumbnailUrl: summary.thumbnailUrl })
        persistCache()
      })
      .catch((cause) => {
        if (signal.aborted || (cause as Error)?.name === 'AbortError') return
      })
  }

  function persistCache(): void {
    if (!cacheContext) return
    writeCachedSuggestedEdits(
      cacheContext.day,
      cacheContext.savedFingerprint,
      items.value,
      activeFeed?.hasPending() ?? hasMore.value,
    )
  }

  function applyCachedItems(
    cached: WikitabCardData[],
    cachedHasMore: boolean,
    day: string,
    savedFingerprint: string,
  ): void {
    items.value = cached
    loadedSessionKey = sessionCacheKey(day, savedFingerprint)
    cacheContext = { day, savedFingerprint }
    activeFeed = null
    loading.value = false
    loadingMore.value = false
    error.value = null
    hasMore.value = cachedHasMore || cached.length > initialCount
    isLoaded.value = true
  }

  function clearState(): void {
    items.value = []
    loading.value = false
    fillingInitial.value = false
    loadingMore.value = false
    hasMore.value = false
    error.value = null
    isLoaded.value = false
    activeFeed = null
    cacheContext = null
    savedItemsSnapshot = []
    loadedSessionKey = null
  }

  async function ensureActiveFeed(signal: AbortSignal | undefined): Promise<boolean> {
    if (activeFeed) return true
    if (!cacheContext || !savedItemsSnapshot.length) return false

    activeFeed = createSuggestedEditsFeed(
      savedItemsSnapshot,
      cacheContext.day,
      signal,
      seenPageidsFromCards(items.value),
    )
    return activeFeed !== null
  }

  function isDuplicateCard(card: WikitabCardData): boolean {
    const pageid = cardPageid(card)
    if (pageid === null) return false
    return items.value.some((existing) => cardPageid(existing) === pageid)
  }

  async function appendOne(signal: AbortSignal | undefined): Promise<WikitabCardData | null> {
    if (!activeFeed) return null

    const maxAttempts = 24
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const card = await activeFeed.takeNext(signal)
      if (!card) return null
      if (isDuplicateCard(card)) continue

      items.value = [...items.value, card]
      scheduleThumbnailBackfill(card, signal ?? new AbortController().signal)
      persistCache()
      return card
    }

    return null
  }

  async function appendMany(count: number, signal: AbortSignal | undefined): Promise<void> {
    for (let i = 0; i < count; i++) {
      const card = await appendOne(signal)
      if (!card) break
    }
  }

  async function fillInitialSlots(signal: AbortSignal): Promise<void> {
    fillingInitial.value = true

    try {
      await appendMany(initialCount, signal)
    } finally {
      fillingInitial.value = false
    }
  }

  async function refresh(
    savedItems: readonly WikitabSavedItem[] = [],
    options?: { force?: boolean },
  ): Promise<void> {
    if (!savedItems.length) {
      controller?.abort()
      clearState()
      return
    }

    const force = options?.force === true
    const day = utcDayKey()
    const articleSeeds = uniqueArticleSeedsFromSavedItems(savedItems)
    const savedFingerprint = buildSuggestedEditsSavedFingerprint(
      articleSeeds.map((seed) => seed.titleKey),
    )
    const key = sessionCacheKey(day, savedFingerprint)

    if (
      !force &&
      !isCacheBypassed() &&
      loadedSessionKey === key &&
      items.value.length > 0
    ) {
      hasMore.value = activeFeed?.hasPending() ?? hasMore.value
      error.value = null
      isLoaded.value = true
      return
    }

    controller?.abort()
    const local = new AbortController()
    controller = local
    const { signal } = local

    activeFeed = null
    savedItemsSnapshot = cloneSavedItems(savedItems)
    cacheContext = { day, savedFingerprint }

    if (!force) {
      const cached = readCachedSuggestedEdits(day, savedFingerprint)
      if (cached) {
        applyCachedItems(cached.items, cached.hasMore, day, savedFingerprint)
        return
      }
    }

    loading.value = true
    loadingMore.value = false
    error.value = null
    items.value = []
    loadedSessionKey = key
    hasMore.value = false
    isLoaded.value = false

    try {
      await withFeedLock(async () => {
        activeFeed = createSuggestedEditsFeed(savedItemsSnapshot, day, signal)
        if (!activeFeed) return

        loading.value = false
        await fillInitialSlots(signal)
      })

      if (signal.aborted) return

      hasMore.value = activeFeed?.hasPending() ?? false
      persistCache()
      isLoaded.value = true
    } catch (cause) {
      if (signal.aborted || (cause as Error)?.name === 'AbortError') return
      error.value = 'Could not load suggestions.'
      items.value = []
      loadedSessionKey = null
      activeFeed = null
      isLoaded.value = true
    } finally {
      if (controller === local) loading.value = false
    }
  }

  async function loadMore(): Promise<void> {
    if (loadingMore.value || loading.value || fillingInitial.value) return
    if (!savedItemsSnapshot.length || !cacheContext) {
      hasMore.value = false
      return
    }

    loadingMore.value = true

    let signal = controller?.signal
    if (!controller) {
      const local = new AbortController()
      controller = local
      signal = local.signal
    }

    try {
      await withFeedLock(async () => {
        if (!(await ensureActiveFeed(signal))) {
          hasMore.value = false
          return
        }

        // Do not gate on hasPending() here — a recreated feed has empty queues
        // until start/refill; appendMany waits via takeNext().
        await appendMany(pageSize, signal)
        if (signal?.aborted) return

        hasMore.value = activeFeed?.hasPending() ?? false
        if (!activeFeed?.hasPending()) activeFeed = null
        persistCache()
      })
    } catch (cause) {
      if (signal?.aborted || (cause as Error)?.name === 'AbortError') return
    } finally {
      if (!signal?.aborted) loadingMore.value = false
    }
  }

  function abort(): void {
    controller?.abort()
    loading.value = false
    fillingInitial.value = false
    loadingMore.value = false
  }

  return {
    items,
    loading,
    fillingInitial,
    loadingMore,
    hasMore,
    error,
    isLoaded,
    refresh,
    loadMore,
    abort,
  }
}
