import { ref, watch } from 'vue'

import {
  createReviewChangesFeed,
  type MergedReviewChangesFeed,
} from './data/fetchWikitabReviewChanges'
import type { WikitabSearchActivityItem } from './data/fetchWikitabSearchActivity'
import {
  fetchHighRevertRisk,
  getCachedHighRevertRisk,
} from './data/fetchRevertRiskLanguageAgnostic'
import {
  buildReviewChangesSavedFingerprint,
  buildReviewChangesSettingsFingerprint,
  isCacheBypassed,
  readCachedReviewChanges,
  utcDayKey,
  writeCachedReviewChanges,
} from './data/reviewChangesCache'
import { loadWikitabConfig, type WikitabSavedItem } from './data/wikitabConfig'
import { articleTitleKey } from './data/wikitabHtml'
import { cloneSavedItems, uniqueArticleSeedsFromSavedItems } from './data/savedCardHelpers'
import { WIKITAB_REVIEW_CHANGES_MODULE_SPEC } from './sections'
import { useWikitabDismissedActivity } from './useWikitabDismissedActivity'

const { initialCount, pageSize } = WIKITAB_REVIEW_CHANGES_MODULE_SPEC

function seenRevidsFromItems(items: readonly WikitabSearchActivityItem[]): Set<number> {
  return new Set(items.map((item) => item.revisionId))
}

function sessionCacheKey(
  day: string,
  savedFingerprint: string,
  settingsFingerprint: string,
): string {
  return `${day}:${savedFingerprint}:${settingsFingerprint}`
}

function readReviewChangesSettings(): {
  showSavedEdits: boolean
  showRecentRiskyEdits: boolean
  settingsFingerprint: string
} {
  const config = loadWikitabConfig()
  const showSavedEdits = config.reviewChangesShowSavedEdits
  const showRecentRiskyEdits = config.reviewChangesShowRecentRiskyEdits
  return {
    showSavedEdits,
    showRecentRiskyEdits,
    settingsFingerprint: buildReviewChangesSettingsFingerprint({
      showSavedEdits,
      showRecentRiskyEdits,
    }),
  }
}

export function useWikitabReviewChanges() {
  const {
    dismissedRevids,
    isDismissed,
    dismissActivity: persistDismissedActivity,
  } = useWikitabDismissedActivity()

  const items = ref<WikitabSearchActivityItem[]>([])
  /** Revids whose editor kind (supporting line icon) is still being looked up. */
  const editorKindPending = ref(new Set<number>())
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
  let editorKindQueue: Promise<void> = Promise.resolve()
  let activeFeed: MergedReviewChangesFeed | null = null
  let cacheContext: {
    day: string
    savedFingerprint: string
    settingsFingerprint: string
  } | null = null
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

  function resetEditorKindLookups(): void {
    editorKindQueue = Promise.resolve()
    editorKindPending.value = new Set()
  }

  function patchItem(revid: number, patch: Partial<WikitabSearchActivityItem>): void {
    items.value = items.value.map((item) => {
      if (item.revisionId !== revid) return item
      return { ...item, ...patch }
    })
  }

  function patchMetadata(feed: MergedReviewChangesFeed, thumbnailMap: Map<string, string>): void {
    items.value = items.value.map((item) => {
      const url = thumbnailMap.get(articleTitleKey(item.articleTitle))
      const isLatestRevision = feed.isLatestRevision(item) ?? item.isLatestRevision
      if (!url && isLatestRevision === item.isLatestRevision) return item
      return { ...item, ...(url ? { thumbnailUrl: url } : {}), isLatestRevision }
    })
    persistCache()
  }

  function prefetchMetadata(feed: MergedReviewChangesFeed, signal: AbortSignal): void {
    void feed
      .prefetchMetadata(signal)
      .then((fetchedThumbnails) => {
        if (signal.aborted) return
        patchMetadata(feed, fetchedThumbnails)
      })
      .catch((cause) => {
        if ((cause as Error)?.name === 'AbortError') return
      })
  }

  function setEditorKindPending(revid: number, pending: boolean): void {
    const next = new Set(editorKindPending.value)
    if (pending) next.add(revid)
    else next.delete(revid)
    editorKindPending.value = next
  }

  /** One `list=users` lookup at a time, behind the revision fetches. */
  function scheduleEditorKind(
    feed: MergedReviewChangesFeed,
    item: WikitabSearchActivityItem,
    signal: AbortSignal,
  ): void {
    if (feed.isEditorKindKnown(item)) return

    const revid = item.revisionId
    setEditorKindPending(revid, true)
    editorKindQueue = editorKindQueue.then(async () => {
      try {
        const editorKind = await feed.resolveEditorKind(item, signal)
        if (signal.aborted) return
        patchItem(revid, { editorKind })
        persistCache()
      } catch (cause) {
        if ((cause as Error)?.name === 'AbortError') return
      } finally {
        if (!signal.aborted) setEditorKindPending(revid, false)
      }
    })
  }

  function applyCachedRevertRisk(item: WikitabSearchActivityItem): void {
    if (item.highRevertRisk === true) return
    if (getCachedHighRevertRisk(item.revisionId) === true) {
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
    if (item.highRevertRisk === true) return
    enqueueRevertRiskLookup(item.revisionId, signal)
  }

  function persistCache(): void {
    if (!cacheContext) return
    writeCachedReviewChanges(
      cacheContext.day,
      cacheContext.savedFingerprint,
      cacheContext.settingsFingerprint,
      items.value,
      activeFeed?.hasPending() ?? hasMore.value,
    )
  }

  function applyCachedItems(
    cached: WikitabSearchActivityItem[],
    cachedHasMore: boolean,
    day: string,
    savedFingerprint: string,
    settingsFingerprint: string,
  ): void {
    items.value = cached
    loadedSessionKey = sessionCacheKey(day, savedFingerprint, settingsFingerprint)
    cacheContext = { day, savedFingerprint, settingsFingerprint }
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

  async function buildFeed(signal: AbortSignal): Promise<MergedReviewChangesFeed | null> {
    if (!cacheContext) return null
    const { showSavedEdits, showRecentRiskyEdits } = readReviewChangesSettings()

    return createReviewChangesFeed(
      {
        showSavedEdits,
        showRecentRiskyEdits,
        savedItems: savedItemsSnapshot,
        day: cacheContext.day,
        seenRevids: seenRevidsFromItems(items.value),
      },
      signal,
    )
  }

  async function ensureActiveFeed(signal: AbortSignal): Promise<boolean> {
    if (activeFeed) return true
    if (!cacheContext) return false

    activeFeed = await buildFeed(signal)
    if (!activeFeed) return false

    prefetchMetadata(activeFeed, signal)

    await activeFeed.start(signal)
    return !signal.aborted
  }

  function isDuplicateItem(item: WikitabSearchActivityItem): boolean {
    return items.value.some((existing) => existing.revisionId === item.revisionId)
  }

  async function appendOne(signal: AbortSignal): Promise<WikitabSearchActivityItem | null> {
    if (!activeFeed) return null

    const maxAttempts = 48
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const item = await activeFeed.takeNext(signal)
      if (!item) return null
      if (isDismissed(item.revisionId)) continue
      if (isDuplicateItem(item)) continue

      items.value = [...items.value, item]
      scheduleRevertRiskForItem(item, signal)
      scheduleEditorKind(activeFeed, item, signal)
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
    const { showSavedEdits, showRecentRiskyEdits, settingsFingerprint } =
      readReviewChangesSettings()

    if (!showSavedEdits && !showRecentRiskyEdits) {
      controller?.abort()
      abortRevertRiskFetches()
      resetEditorKindLookups()
      clearState()
      isLoaded.value = true
      return
    }

    const force = options?.force === true
    const day = utcDayKey()
    const articleSeeds = uniqueArticleSeedsFromSavedItems(savedItems)
    const savedFingerprint = buildReviewChangesSavedFingerprint(
      articleSeeds.map((seed) => seed.titleKey),
    )
    const key = sessionCacheKey(day, savedFingerprint, settingsFingerprint)

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
    resetEditorKindLookups()
    const local = new AbortController()
    controller = local
    revertRiskAbortController = new AbortController()
    const { signal } = local

    activeFeed = null
    savedItemsSnapshot = cloneSavedItems(savedItems)
    cacheContext = { day, savedFingerprint, settingsFingerprint }

    if (!force) {
      const cached = readCachedReviewChanges(day, savedFingerprint, settingsFingerprint)
      if (cached) {
        applyCachedItems(
          cached.items,
          cached.hasMore,
          day,
          savedFingerprint,
          settingsFingerprint,
        )
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
        activeFeed = await buildFeed(signal)
        if (!activeFeed) {
          loading.value = false
          isLoaded.value = true
          return
        }

        prefetchMetadata(activeFeed, signal)

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
    if (!cacheContext) {
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
    items.value = items.value.filter((item) => item.revisionId !== revid)
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
    resetEditorKindLookups()
    loading.value = false
    fillingInitial.value = false
    loadingMore.value = false
  }

  watch(dismissedRevids, () => {
    items.value = items.value.filter((item) => !isDismissed(item.revisionId))
    persistCache()
  })

  return {
    items,
    editorKindPending,
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
