import { ref, watch } from 'vue'

import { RecentChangesHighRiskFeed } from './data/fetchWikitabRecentChangesRisky'
import {
  createReviewChangesFeed,
  createSavedArticleReviewChangesFeed,
  MergedReviewChangesFeed,
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
  isReviewChangesRiskyCacheFresh,
  isReviewChangesSavedCacheFresh,
  readCachedReviewChanges,
  utcDayKey,
  writeCachedReviewChanges,
} from './data/reviewChangesCache'
import { loadWikitabConfig, type WikitabSavedItem } from './data/wikitabConfig'
import { isWikitabFeatureAvailable } from './data/wikitabLanguageSupport'
import { articleTitleKey } from './data/wikitabHtml'
import { cloneSavedItems, uniqueArticleSeedsFromSavedItems } from './data/savedCardHelpers'
import { WIKITAB_REVIEW_CHANGES_MODULE_SPEC } from './sections'
import { useWikitabDismissedActivity } from './useWikitabDismissedActivity'

const { initialCount, pageSize } = WIKITAB_REVIEW_CHANGES_MODULE_SPEC

function seenRevidsFromItems(items: readonly WikitabSearchActivityItem[]): Set<number> {
  return new Set(items.map((item) => item.revisionId))
}

function readReviewChangesSettings(): {
  showSavedEdits: boolean
  showRecentRiskyEdits: boolean
  settingsFingerprint: string
} {
  const config = loadWikitabConfig()
  const showSavedEdits = config.reviewChangesShowSavedEdits
  const showRecentRiskyEdits =
    config.reviewChangesShowRecentRiskyEdits && isWikitabFeatureAvailable('review-changes-risky')
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
  /** Saved-articles fingerprint of the cards currently painted (last fetch / cache). */
  const fetchedSavedFingerprint = ref<string | null>(null)

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
  let feedLock: Promise<void> = Promise.resolve()
  let cacheFetchedAtSaved: number | undefined
  let cacheFetchedAtRisky: number | undefined
  let staleReviewRefreshInFlight = false

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

  function persistCache(fetchedAtOverride?: { saved?: number; risky?: number }): void {
    if (!cacheContext) return
    if (fetchedAtOverride?.saved !== undefined) cacheFetchedAtSaved = fetchedAtOverride.saved
    if (fetchedAtOverride?.risky !== undefined) cacheFetchedAtRisky = fetchedAtOverride.risky

    writeCachedReviewChanges(
      cacheContext.day,
      cacheContext.savedFingerprint,
      cacheContext.settingsFingerprint,
      items.value,
      activeFeed?.hasPending() ?? hasMore.value,
      { saved: cacheFetchedAtSaved, risky: cacheFetchedAtRisky },
    )
  }

  function applyCachedItems(
    cached: WikitabSearchActivityItem[],
    cachedHasMore: boolean,
    day: string,
    savedFingerprint: string,
    settingsFingerprint: string,
    fetchedAtSaved?: number,
    fetchedAtRisky?: number,
  ): void {
    items.value = cached
    cacheContext = { day, savedFingerprint, settingsFingerprint }
    fetchedSavedFingerprint.value = savedFingerprint
    cacheFetchedAtSaved = fetchedAtSaved
    cacheFetchedAtRisky = fetchedAtRisky
    activeFeed = null
    loading.value = false
    loadingMore.value = false
    error.value = null
    // Buffered cards past initialCount are revealed via the section's
    // bufferedHasMore — do not treat them as pending API pages.
    hasMore.value = cachedHasMore
    isLoaded.value = true
    // Do not schedule stale refresh here — callers on the ordered-load turn
    // invoke SWR after paint so lower modules do not race modules above.
  }

  async function refreshStaleReviewChangesSources(signal: AbortSignal): Promise<void> {
    if (!cacheContext) return

    const { showSavedEdits, showRecentRiskyEdits } = readReviewChangesSettings()
    const savedStale =
      showSavedEdits && !isReviewChangesSavedCacheFresh(cacheFetchedAtSaved)
    const riskyStale =
      showRecentRiskyEdits && !isReviewChangesRiskyCacheFresh(cacheFetchedAtRisky)
    if (!savedStale && !riskyStale) return

    const kept = items.value.filter((item) => {
      const src = item.reviewChangesSource ?? 'saved'
      if (savedStale && src === 'saved') return false
      if (riskyStale && src === 'risky') return false
      return !isDismissed(item.revisionId)
    })

    const seen = seenRevidsFromItems(kept)

    const savedFeed =
      savedStale && showSavedEdits
        ? await createSavedArticleReviewChangesFeed(
            savedItemsSnapshot,
            cacheContext.day,
            signal,
            seen,
          )
        : null
    const rcFeed =
      riskyStale && showRecentRiskyEdits
        ? new RecentChangesHighRiskFeed({ seenRevids: seen })
        : null

    if (!savedFeed && !rcFeed) return

    const merged = new MergedReviewChangesFeed(savedFeed, rcFeed)
    await merged.start(signal)
    prefetchMetadata(merged, signal)

    const newItems: WikitabSearchActivityItem[] = []
    while (kept.length + newItems.length < initialCount) {
      const item = await merged.takeNext(signal)
      if (!item || signal.aborted) break
      if (isDismissed(item.revisionId)) continue
      if (kept.some((existing) => existing.revisionId === item.revisionId)) continue

      const sourced: WikitabSearchActivityItem = {
        ...item,
        reviewChangesSource: merged.reviewChangesSource(item),
      }
      newItems.push(sourced)
      scheduleRevertRiskForItem(sourced, signal)
      scheduleEditorKind(merged, sourced, signal)
    }

    if (signal.aborted) return

    items.value = [...kept, ...newItems]
    const now = Date.now()
    persistCache({
      ...(savedStale ? { saved: now } : {}),
      ...(riskyStale ? { risky: now } : {}),
    })
  }

  function scheduleStaleReviewChangesRefresh(): void {
    if (staleReviewRefreshInFlight || !cacheContext) return

    const { showSavedEdits, showRecentRiskyEdits } = readReviewChangesSettings()
    const savedStale =
      showSavedEdits && !isReviewChangesSavedCacheFresh(cacheFetchedAtSaved)
    const riskyStale =
      showRecentRiskyEdits && !isReviewChangesRiskyCacheFresh(cacheFetchedAtRisky)
    if (!savedStale && !riskyStale) return

    staleReviewRefreshInFlight = true
    const local = new AbortController()
    revertRiskAbortController = new AbortController()

    void refreshStaleReviewChangesSources(local.signal)
      .catch((cause) => {
        if ((cause as Error)?.name === 'AbortError') return
      })
      .finally(() => {
        staleReviewRefreshInFlight = false
      })
  }

  function clearState(): void {
    items.value = []
    loading.value = false
    fillingInitial.value = false
    loadingMore.value = false
    hasMore.value = false
    error.value = null
    isLoaded.value = false
    fetchedSavedFingerprint.value = null
    activeFeed = null
    cacheContext = null
    savedItemsSnapshot = []
    cacheFetchedAtSaved = undefined
    cacheFetchedAtRisky = undefined
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

      const sourced: WikitabSearchActivityItem = {
        ...item,
        reviewChangesSource: activeFeed.reviewChangesSource(item),
      }
      items.value = [...items.value, sourced]
      scheduleRevertRiskForItem(sourced, signal)
      scheduleEditorKind(activeFeed, sourced, signal)
      persistCache()
      return sourced
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

    // Same UTC day + settings with cards already painted — keep them even if
    // the saved fingerprint changed. Do not overwrite cacheContext (that would
    // hide the title refresh) or snapshot (Show more continues the last fetch).
    if (
      !force &&
      !isCacheBypassed() &&
      cacheContext?.day === day &&
      cacheContext.settingsFingerprint === settingsFingerprint &&
      items.value.length > 0
    ) {
      hasMore.value = activeFeed?.hasPending() ?? hasMore.value
      error.value = null
      fetchedSavedFingerprint.value = cacheContext.savedFingerprint
      isLoaded.value = true
      // Ordered-load turn with cards already painted — SWR if TTL expired.
      scheduleStaleReviewChangesRefresh()
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

    if (!force) {
      const cached = readCachedReviewChanges(day, settingsFingerprint)
      // Empty cache is a miss — otherwise overlay-close non-force refresh can
      // re-settle an aborted force fetch onto a persisted [].
      if (cached && cached.items.length > 0) {
        applyCachedItems(
          cached.items,
          cached.hasMore,
          day,
          cached.savedFingerprint,
          settingsFingerprint,
          cached.fetchedAtSaved,
          cached.fetchedAtRisky,
        )
        scheduleStaleReviewChangesRefresh()
        return
      }
    }

    loading.value = true
    loadingMore.value = false
    error.value = null
    items.value = []
    cacheContext = { day, savedFingerprint, settingsFingerprint }
    fetchedSavedFingerprint.value = savedFingerprint
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
      const now = Date.now()
      const { showSavedEdits, showRecentRiskyEdits } = readReviewChangesSettings()
      persistCache({
        ...(showSavedEdits ? { saved: now } : {}),
        ...(showRecentRiskyEdits ? { risky: now } : {}),
      })
      isLoaded.value = true
    } catch (cause) {
      if (signal.aborted || (cause as Error)?.name === 'AbortError') return
      error.value = 'Could not load recent edits.'
      items.value = []
      fetchedSavedFingerprint.value = null
      cacheContext = null
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
    fetchedSavedFingerprint,
    refresh,
    loadMore,
    dismissActivity,
    abort,
  }
}
