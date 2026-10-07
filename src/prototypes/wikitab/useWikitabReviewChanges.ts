import { ref, watch } from 'vue'

import {
  createReviewChangesFeed,
  type ReviewChangesFeed,
} from './data/fetchWikitabReviewChanges'
import type { WikitabSearchActivityItem } from './data/fetchWikitabSearchActivity'
import {
  fetchHighRevertRisk,
  getCachedHighRevertRisk,
} from './data/fetchRevertRiskLanguageAgnostic'
import {
  buildReviewChangesSavedFingerprint,
  isCacheBypassed,
  readCachedReviewChanges,
  utcDayKey,
  writeCachedReviewChanges,
} from './data/reviewChangesCache'
import type { WikitabSavedItem } from './data/wikitabConfig'
import { articleTitleKey } from './data/wikitabHtml'
import { cloneSavedItems, uniqueArticleSeedsFromSavedItems } from './data/savedCardHelpers'
import { WIKITAB_REVIEW_CHANGES_MODULE_SPEC } from './sections'
import { useWikitabDismissedActivity } from './useWikitabDismissedActivity'

const { initialCount, pageSize } = WIKITAB_REVIEW_CHANGES_MODULE_SPEC

function seenRevidsFromItems(items: readonly WikitabSearchActivityItem[]): Set<number> {
  return new Set(items.map((item) => item.revid))
}

function sessionCacheKey(day: string, savedFingerprint: string): string {
  return `${day}:${savedFingerprint}`
}

export function useWikitabReviewChanges() {
  const {
    dismissedRevids,
    isDismissed,
    dismissActivity: persistDismissedActivity,
  } = useWikitabDismissedActivity()

  const items = ref<WikitabSearchActivityItem[]>([])
  const loading = ref(false)
  const fillingInitial = ref(false)
  const loadingMore = ref(false)
  const hasMore = ref(false)
  const error = ref<string | null>(null)
  /** True once a refresh has settled for the current saved snapshot. */
  const isLoaded = ref(false)

  let controller: AbortController | null = null
  let revertRiskAbortController: AbortController | null = null
  let revertRiskQueue: Promise<void> = Promise.resolve()
  let activeFeed: ReviewChangesFeed | null = null
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

  function abortRevertRiskFetches(): void {
    revertRiskAbortController?.abort()
    revertRiskAbortController = null
    revertRiskQueue = Promise.resolve()
  }

  function patchItem(revid: number, patch: Partial<WikitabSearchActivityItem>): void {
    items.value = items.value.map((item) => {
      if (item.revid !== revid) return item
      return { ...item, ...patch }
    })
  }

  function patchThumbnails(thumbnailMap: Map<string, string>): void {
    if (!thumbnailMap.size) return

    items.value = items.value.map((item) => {
      const url = thumbnailMap.get(articleTitleKey(item.title))
      if (!url) return item
      return { ...item, thumbnailUrl: url }
    })
    persistCache()
  }

  function applyCachedRevertRisk(item: WikitabSearchActivityItem): void {
    if (getCachedHighRevertRisk(item.revid) === true) {
      item.highRevertRisk = true
    }
  }

  function enqueueRevertRiskLookup(revid: number, signal: AbortSignal | undefined): void {
    if (isDismissed(revid)) return
    if (getCachedHighRevertRisk(revid) !== undefined) return

    revertRiskQueue = revertRiskQueue.then(async () => {
      if (isDismissed(revid)) return

      const cached = getCachedHighRevertRisk(revid)
      if (cached !== undefined) {
        patchItem(revid, { highRevertRisk: cached })
        return
      }

      try {
        const highRisk = await fetchHighRevertRisk(revid, signal)
        if (signal?.aborted) return
        if (highRisk) patchItem(revid, { highRevertRisk: true })
        persistCache()
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
      }
    })
  }

  function scheduleRevertRiskForItem(item: WikitabSearchActivityItem, signal: AbortSignal): void {
    applyCachedRevertRisk(item)
    enqueueRevertRiskLookup(item.revid, signal)
  }

  function persistCache(): void {
    if (!cacheContext) return
    writeCachedReviewChanges(
      cacheContext.day,
      cacheContext.savedFingerprint,
      items.value,
      activeFeed?.hasPending() ?? hasMore.value,
    )
  }

  function applyCachedItems(
    cached: WikitabSearchActivityItem[],
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

  async function ensureActiveFeed(signal: AbortSignal): Promise<boolean> {
    if (activeFeed) return true
    if (!cacheContext || !savedItemsSnapshot.length) return false

    activeFeed = await createReviewChangesFeed(
      savedItemsSnapshot,
      cacheContext.day,
      signal,
      seenRevidsFromItems(items.value),
    )
    if (!activeFeed) return false

    void activeFeed
      .prefetchMetadata(signal)
      .then((fetchedThumbnails) => {
        if (signal.aborted) return
        patchThumbnails(fetchedThumbnails)
      })
      .catch((cause) => {
        if ((cause as Error)?.name === 'AbortError') return
      })

    await activeFeed.start(signal)
    return !signal.aborted
  }

  function isDuplicateItem(item: WikitabSearchActivityItem): boolean {
    return items.value.some((existing) => existing.revid === item.revid)
  }

  async function appendOne(signal: AbortSignal): Promise<WikitabSearchActivityItem | null> {
    if (!activeFeed) return null

    const maxAttempts = 48
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const item = await activeFeed.takeNext(signal)
      if (!item) return null
      if (isDismissed(item.revid)) continue
      if (isDuplicateItem(item)) continue

      items.value = [...items.value, item]
      scheduleRevertRiskForItem(item, signal)
      persistCache()
      return item
    }

    return null
  }

  async function appendMany(count: number, signal: AbortSignal): Promise<void> {
    for (let i = 0; i < count; i++) {
      const item = await appendOne(signal)
      if (!item) break
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
      abortRevertRiskFetches()
      clearState()
      return
    }

    const force = options?.force === true
    const day = utcDayKey()
    const articleSeeds = uniqueArticleSeedsFromSavedItems(savedItems)
    const savedFingerprint = buildReviewChangesSavedFingerprint(
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
    abortRevertRiskFetches()
    const local = new AbortController()
    controller = local
    revertRiskAbortController = new AbortController()
    const { signal } = local

    activeFeed = null
    savedItemsSnapshot = cloneSavedItems(savedItems)
    cacheContext = { day, savedFingerprint }

    if (!force) {
      const cached = readCachedReviewChanges(day, savedFingerprint)
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
        activeFeed = await createReviewChangesFeed(savedItemsSnapshot, day, signal)
        if (!activeFeed) return

        void activeFeed
          .prefetchMetadata(signal)
          .then((fetchedThumbnails) => {
            if (signal.aborted) return
            patchThumbnails(fetchedThumbnails)
          })
          .catch((cause) => {
            if ((cause as Error)?.name === 'AbortError') return
          })

        await activeFeed.start(signal)
        if (signal.aborted) return

        loading.value = false
        await fillInitialSlots(signal)
      })

      if (signal.aborted) return

      hasMore.value = activeFeed?.hasPending() ?? false
      persistCache()
      isLoaded.value = true
    } catch (cause) {
      if (signal.aborted || (cause as Error)?.name === 'AbortError') return
      error.value = 'Could not load recent edits.'
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
      revertRiskAbortController = new AbortController()
      signal = local.signal
    }

    try {
      await withFeedLock(async () => {
        if (!signal || !(await ensureActiveFeed(signal))) {
          hasMore.value = false
          return
        }

        // Do not gate on hasPending() here — a recreated feed has empty queues
        // until start/refill; appendMany waits via takeNext().
        await appendMany(pageSize, signal)
        if (signal.aborted) return

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

  function dismissActivity(revid: number): void {
    persistDismissedActivity(revid)
    items.value = items.value.filter((item) => item.revid !== revid)
    persistCache()

    if (
      activeFeed?.hasPending() &&
      !loading.value &&
      !fillingInitial.value &&
      !loadingMore.value &&
      controller?.signal
    ) {
      void withFeedLock(async () => {
        const signal = controller?.signal
        if (!signal || !activeFeed) return
        await appendOne(signal)
        hasMore.value = activeFeed?.hasPending() ?? false
        persistCache()
      })
    }
  }

  function abort(): void {
    controller?.abort()
    abortRevertRiskFetches()
    loading.value = false
    fillingInitial.value = false
    loadingMore.value = false
  }

  watch(dismissedRevids, () => {
    items.value = items.value.filter((item) => !isDismissed(item.revid))
    persistCache()
  })

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
    dismissActivity,
    abort,
  }
}
