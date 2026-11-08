import { onScopeDispose, ref } from 'vue'

import {
  buildActiveDiscussionsSavedFingerprint,
  buildActiveDiscussionsSettingsFingerprint,
  isActiveDiscussionsNoticeboardsCacheFresh,
  isActiveDiscussionsSavedTalkCacheFresh,
  isCacheBypassed,
  readCachedActiveDiscussions,
  utcDayKey,
  writeCachedActiveDiscussions,
} from './data/activeDiscussionsCache'
import { DISCUSSIONS_NOTICEBOARDS_TTL_MS } from './data/wikitabCacheTtl'
import {
  ACTIVE_DISCUSSIONS_SEED_BATCH,
  fetchActiveDiscussionsArticleBatch,
  fetchActiveDiscussionsFeed,
  mergeDiscussionCardsChronologically,
  shuffledActiveDiscussionArticleSeeds,
} from './data/fetchActiveDiscussions'
import { loadWikitabConfig, type WikitabSavedItem } from './data/wikitabConfig'
import { isWikitabFeatureAvailable } from './data/wikitabLanguageSupport'
import { cloneSavedItems, uniqueArticleSeedsFromSavedItems } from './data/savedCardHelpers'
import type { WikitabCardData } from './sections'

function readActiveDiscussionsSettings(): {
  showNoticeboards: boolean
  showSavedTalk: boolean
  settingsFingerprint: string
} {
  const config = loadWikitabConfig()
  const showNoticeboards =
    config.discussionsShowNoticeboards && isWikitabFeatureAvailable('discussions-noticeboards')
  const showSavedTalk = config.discussionsShowSavedTalk
  return {
    showNoticeboards,
    showSavedTalk,
    settingsFingerprint: buildActiveDiscussionsSettingsFingerprint({
      showNoticeboards,
      showSavedTalk,
    }),
  }
}

export function useWikitabActiveDiscussions() {
  const noticeboardItems = ref<WikitabCardData[]>([])
  const articleItems = ref<WikitabCardData[]>([])
  const loading = ref(false)
  const loadingMore = ref(false)
  /** More saved-talk seed batches remain (noticeboards are always fetched complete). */
  const hasMore = ref(false)
  const error = ref<string | null>(null)
  /** True once a refresh has settled for the current settings / snapshot. */
  const isLoaded = ref(false)
  /** Saved-articles fingerprint of the cards currently painted (last fetch / cache). */
  const fetchedSavedFingerprint = ref<string | null>(null)

  let controller: AbortController | null = null
  let cacheContext: {
    day: string
    savedFingerprint: string
    settingsFingerprint: string
  } | null = null
  let savedItemsSnapshot: WikitabSavedItem[] = []
  let articleSeedOffset = 0
  let articleSeedTotal = 0
  let cacheFetchedAtNoticeboards: number | undefined
  let cacheFetchedAtArticles: number | undefined
  let staleRefreshInFlight = false
  let loadMoreLock: Promise<void> = Promise.resolve()
  /** While the home page is mounted, poll so stale sources soft-refresh on their TTLs. */
  let periodicTimer: ReturnType<typeof setInterval> | null = null
  const PERIODIC_CHECK_MS = Math.min(30_000, DISCUSSIONS_NOTICEBOARDS_TTL_MS)

  function withLoadMoreLock(operation: () => Promise<void>): Promise<void> {
    const run = loadMoreLock.then(operation, operation)
    loadMoreLock = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  function syncHasMore(showSavedTalk: boolean): void {
    hasMore.value = showSavedTalk && articleSeedOffset < articleSeedTotal
  }

  function clearState(): void {
    noticeboardItems.value = []
    articleItems.value = []
    loading.value = false
    loadingMore.value = false
    hasMore.value = false
    error.value = null
    isLoaded.value = false
    fetchedSavedFingerprint.value = null
    cacheContext = null
    savedItemsSnapshot = []
    articleSeedOffset = 0
    articleSeedTotal = 0
    cacheFetchedAtNoticeboards = undefined
    cacheFetchedAtArticles = undefined
  }

  function persistCache(fetchedAtOverride?: {
    noticeboards?: number
    articles?: number
  }): void {
    if (!cacheContext) return
    if (fetchedAtOverride?.noticeboards !== undefined) {
      cacheFetchedAtNoticeboards = fetchedAtOverride.noticeboards
    }
    if (fetchedAtOverride?.articles !== undefined) {
      cacheFetchedAtArticles = fetchedAtOverride.articles
    }

    writeCachedActiveDiscussions(
      cacheContext.day,
      cacheContext.savedFingerprint,
      cacheContext.settingsFingerprint,
      noticeboardItems.value,
      articleItems.value,
      articleSeedOffset,
      {
        noticeboards: cacheFetchedAtNoticeboards,
        articles: cacheFetchedAtArticles,
      },
    )
  }

  function applyCachedItems(
    noticeboards: WikitabCardData[],
    articles: WikitabCardData[],
    seedOffset: number,
    day: string,
    savedFingerprint: string,
    settingsFingerprint: string,
    fetchedAtNoticeboards?: number,
    fetchedAtArticles?: number,
  ): void {
    noticeboardItems.value = noticeboards
    articleItems.value = articles
    articleSeedOffset = seedOffset
    const { showSavedTalk } = readActiveDiscussionsSettings()
    articleSeedTotal = showSavedTalk
      ? shuffledActiveDiscussionArticleSeeds(savedItemsSnapshot, day).length
      : 0
    cacheContext = { day, savedFingerprint, settingsFingerprint }
    fetchedSavedFingerprint.value = savedFingerprint
    cacheFetchedAtNoticeboards = fetchedAtNoticeboards
    cacheFetchedAtArticles = fetchedAtArticles
    loading.value = false
    loadingMore.value = false
    error.value = null
    isLoaded.value = true
    syncHasMore(showSavedTalk)
    // Do not schedule stale refresh here — hydrate/cache paint must stay
    // network-free so lower modules do not steal host slots from modules above.
  }

  function hydrateFromStorage(): void {
    try {
      if (isCacheBypassed()) return

      const { showNoticeboards, showSavedTalk, settingsFingerprint } =
        readActiveDiscussionsSettings()
      if (!showNoticeboards && !showSavedTalk) {
        isLoaded.value = true
        return
      }

      const day = utcDayKey()
      const cached = readCachedActiveDiscussions(day, settingsFingerprint)
      if (!cached) return

      savedItemsSnapshot = cloneSavedItems(loadWikitabConfig().savedItems)
      applyCachedItems(
        cached.noticeboards,
        cached.articles,
        cached.articleSeedOffset,
        day,
        cached.savedFingerprint,
        settingsFingerprint,
        cached.fetchedAtNoticeboards,
        cached.fetchedAtArticles,
      )
    } catch {
      // Corrupt cache / storage must never block the page — refresh will refill.
    }
  }

  async function refreshStaleInBackground(signal: AbortSignal): Promise<void> {
    if (!cacheContext) return

    const { showNoticeboards, showSavedTalk } = readActiveDiscussionsSettings()
    const noticeboardsStale =
      showNoticeboards && !isActiveDiscussionsNoticeboardsCacheFresh(cacheFetchedAtNoticeboards)
    const articlesStale =
      showSavedTalk && !isActiveDiscussionsSavedTalkCacheFresh(cacheFetchedAtArticles)
    if (!noticeboardsStale && !articlesStale) return

    const seedLimit = Math.max(articleSeedOffset, ACTIVE_DISCUSSIONS_SEED_BATCH)
    const pools = await fetchActiveDiscussionsFeed(
      {
        showNoticeboards: noticeboardsStale,
        showSavedTalk: articlesStale,
        savedItems: savedItemsSnapshot,
        day: cacheContext.day,
        seedOffset: 0,
        seedLimit,
      },
      signal,
    )

    if (signal.aborted || pools === null) return

    const now = Date.now()
    if (noticeboardsStale) {
      noticeboardItems.value = pools.noticeboards
    }
    if (articlesStale) {
      articleItems.value = pools.articles
      articleSeedOffset = showSavedTalk ? seedLimit : 0
      articleSeedTotal = showSavedTalk
        ? shuffledActiveDiscussionArticleSeeds(savedItemsSnapshot, cacheContext.day).length
        : 0
      syncHasMore(showSavedTalk)
    }

    persistCache({
      ...(noticeboardsStale ? { noticeboards: now } : {}),
      ...(articlesStale ? { articles: now } : {}),
    })
  }

  function scheduleStaleRefresh(): void {
    if (staleRefreshInFlight || !cacheContext) return

    const { showNoticeboards, showSavedTalk } = readActiveDiscussionsSettings()
    const noticeboardsStale =
      showNoticeboards && !isActiveDiscussionsNoticeboardsCacheFresh(cacheFetchedAtNoticeboards)
    const articlesStale =
      showSavedTalk && !isActiveDiscussionsSavedTalkCacheFresh(cacheFetchedAtArticles)
    if (!noticeboardsStale && !articlesStale) return

    staleRefreshInFlight = true
    const local = new AbortController()

    void refreshStaleInBackground(local.signal)
      .catch((cause) => {
        if ((cause as Error)?.name === 'AbortError') return
      })
      .finally(() => {
        staleRefreshInFlight = false
      })
  }

  function stopPeriodicRefresh(): void {
    if (periodicTimer == null) return
    clearInterval(periodicTimer)
    periodicTimer = null
  }

  /** Soft-refresh stale sources on their own TTLs while home is mounted. */
  function startPeriodicRefresh(): void {
    stopPeriodicRefresh()
    periodicTimer = setInterval(() => {
      scheduleStaleRefresh()
    }, PERIODIC_CHECK_MS)
  }

  async function refresh(
    savedItems: readonly WikitabSavedItem[] = [],
    options?: { force?: boolean },
  ): Promise<void> {
    const { showNoticeboards, showSavedTalk, settingsFingerprint } =
      readActiveDiscussionsSettings()

    if (!showNoticeboards && !showSavedTalk) {
      controller?.abort()
      clearState()
      isLoaded.value = true
      return
    }

    const force = options?.force === true
    const day = utcDayKey()
    const articleSeeds = showSavedTalk ? uniqueArticleSeedsFromSavedItems(savedItems) : []
    const savedFingerprint = buildActiveDiscussionsSavedFingerprint(
      articleSeeds.map((seed) => seed.titleKey),
    )

    // Same UTC day + settings with cards already painted — keep them even if
    // the saved fingerprint changed. Do not overwrite cacheContext (that would
    // hide the title refresh).
    if (
      !force &&
      !isCacheBypassed() &&
      cacheContext?.day === day &&
      cacheContext.settingsFingerprint === settingsFingerprint &&
      (noticeboardItems.value.length > 0 || articleItems.value.length > 0)
    ) {
      error.value = null
      fetchedSavedFingerprint.value = cacheContext.savedFingerprint
      isLoaded.value = true
      articleSeedTotal = showSavedTalk
        ? shuffledActiveDiscussionArticleSeeds(savedItemsSnapshot, day).length
        : 0
      syncHasMore(showSavedTalk)
      scheduleStaleRefresh()
      return
    }

    savedItemsSnapshot = cloneSavedItems(savedItems)
    articleSeedTotal = showSavedTalk
      ? shuffledActiveDiscussionArticleSeeds(savedItemsSnapshot, day).length
      : 0

    if (!force && !isCacheBypassed()) {
      const cached = readCachedActiveDiscussions(day, settingsFingerprint)
      if (cached) {
        controller?.abort()
        applyCachedItems(
          cached.noticeboards,
          cached.articles,
          cached.articleSeedOffset,
          day,
          cached.savedFingerprint,
          settingsFingerprint,
          cached.fetchedAtNoticeboards,
          cached.fetchedAtArticles,
        )
        // Ordered-load turn: paint from cache, then SWR if TTL expired.
        scheduleStaleRefresh()
        return
      }
    }

    controller?.abort()
    const local = new AbortController()
    controller = local
    const { signal } = local

    loading.value = true
    loadingMore.value = false
    error.value = null
    noticeboardItems.value = []
    articleItems.value = []
    articleSeedOffset = 0
    hasMore.value = false
    cacheContext = { day, savedFingerprint, settingsFingerprint }
    fetchedSavedFingerprint.value = savedFingerprint
    isLoaded.value = false

    try {
      const pools = await fetchActiveDiscussionsFeed(
        {
          showNoticeboards,
          showSavedTalk,
          savedItems: savedItemsSnapshot,
          day,
          seedOffset: 0,
          seedLimit: ACTIVE_DISCUSSIONS_SEED_BATCH,
        },
        signal,
      )

      if (signal.aborted) return

      if (pools === null) {
        clearState()
        isLoaded.value = true
        return
      }

      noticeboardItems.value = pools.noticeboards
      articleItems.value = pools.articles
      articleSeedOffset = showSavedTalk
        ? Math.min(ACTIVE_DISCUSSIONS_SEED_BATCH, articleSeedTotal)
        : 0
      syncHasMore(showSavedTalk)
      const now = Date.now()
      persistCache({
        ...(showNoticeboards ? { noticeboards: now } : {}),
        ...(showSavedTalk ? { articles: now } : {}),
      })
      isLoaded.value = true
    } catch (cause) {
      if (signal.aborted || (cause as Error)?.name === 'AbortError') return
      error.value = 'Could not load active discussions.'
      noticeboardItems.value = []
      articleItems.value = []
      articleSeedOffset = 0
      hasMore.value = false
      fetchedSavedFingerprint.value = null
      cacheContext = null
      isLoaded.value = true
    } finally {
      if (controller === local) loading.value = false
    }
  }

  /**
   * Next saved-talk seed batch. Merges chronologically into `articleItems`
   * (newest-first). Noticeboards are already complete after the first fetch.
   */
  async function loadMore(): Promise<void> {
    return withLoadMoreLock(async () => {
      const { showSavedTalk } = readActiveDiscussionsSettings()
      if (!showSavedTalk || !cacheContext || articleSeedOffset >= articleSeedTotal) {
        hasMore.value = false
        return
      }
      if (loadingMore.value || loading.value) return

      const local = new AbortController()
      controller?.abort()
      controller = local
      const { signal } = local
      const offset = articleSeedOffset

      loadingMore.value = true
      error.value = null

      try {
        const batch = await fetchActiveDiscussionsArticleBatch(
          {
            savedItems: savedItemsSnapshot,
            day: cacheContext.day,
            seedOffset: offset,
            seedLimit: ACTIVE_DISCUSSIONS_SEED_BATCH,
          },
          signal,
        )

        if (signal.aborted) return

        articleItems.value = mergeDiscussionCardsChronologically(articleItems.value, batch)
        articleSeedOffset = Math.min(
          offset + ACTIVE_DISCUSSIONS_SEED_BATCH,
          articleSeedTotal,
        )
        syncHasMore(true)
        // Keep both TTL clocks — Show more must not postpone soft-refresh.
        persistCache()
      } catch (cause) {
        if (signal.aborted || (cause as Error)?.name === 'AbortError') return
        error.value = 'Could not load more discussions.'
        syncHasMore(true)
      } finally {
        if (controller === local) {
          loadingMore.value = false
          controller = null
        }
      }
    })
  }

  function abort(): void {
    stopPeriodicRefresh()
    controller?.abort()
    controller = null
  }

  hydrateFromStorage()
  startPeriodicRefresh()
  onScopeDispose(abort)

  return {
    noticeboardItems,
    articleItems,
    loading,
    loadingMore,
    hasMore,
    error,
    isLoaded,
    fetchedSavedFingerprint,
    refresh,
    loadMore,
    abort,
  }
}
