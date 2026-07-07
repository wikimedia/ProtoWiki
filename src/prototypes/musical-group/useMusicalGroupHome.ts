import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { listBookmarks } from './data/bookmarks'
import { bookmarksKey, utcDayKey } from './data/cacheKeys'
import { fetchFeaturedTabContent, isUsableFeaturedTab } from './data/fetchFeaturedFeed'
import { fetchHelpWanted } from './data/fetchHelpWanted'
import { fetchRecentChanges } from './data/fetchRecentChanges'
import { fetchSavedItemSummaries } from './data/fetchSavedItemSummaries'
import { fetchTrendingFeed, isTrendingSummaryIncomplete } from './data/fetchTrending'
import { clearFeaturedFeedSessionCache } from './data/fetchEnwikiFeaturedFeedDay'
import { clearFeaturedTabSessionCache } from './data/fetchFeaturedFeed'
import { clearTrendingSessionCache } from './data/fetchTrending'
import {
  clearCachedFeaturedTab,
  clearCachedTrendingFeed,
  getCachedFeaturedTab,
  getCachedHelpWanted,
  getCachedRecentChangesPreview,
  getCachedRelatedFeed,
  getCachedSavedSummaries,
  getCachedTrendingFeed,
} from './data/homeTabCache'
import { loadRelatedFeedInitialBatch } from './loadRelatedFeedInitialBatch'
import type {
  HomeFeaturedTab,
  HomeHelpWanted,
  HomeRecentChange,
  HomeRelated,
  HomeSavedItem,
  HomeTrending,
} from './data/types'

const DAY_MS = 24 * 60 * 60 * 1000
const MIN_RECENTLY_SAVED = 2
const MAX_RECENTLY_SAVED = 5

const EMPTY_FEATURED_TAB: HomeFeaturedTab = {
  didYouKnow: [],
  bornOnThisDay: [],
}

function isAbort(err: unknown): boolean {
  return (err as Error)?.name === 'AbortError'
}

export function useMusicalGroupHome() {
  const route = useRoute()
  const featuredTab = ref<HomeFeaturedTab>(EMPTY_FEATURED_TAB)
  const featuredTabLoading = ref(true)
  const featuredTabError = ref<string | null>(null)
  const trendingItems = ref<HomeTrending[]>([])
  const trendingLoading = ref(true)
  const trendingTabError = ref<string | null>(null)
  const hasSavedPages = ref(listBookmarks().length > 0)
  const savedItems = ref<HomeSavedItem[]>([])
  const savedItemsLoading = ref(false)
  const homeRelatedItems = ref<HomeRelated[]>([])
  const homeRelatedLoading = ref(false)
  const helpWanted = ref<HomeHelpWanted[]>([])
  const recentChanges = ref<HomeRecentChange[]>([])
  const helpWantedLoading = ref(false)
  const recentChangesLoading = ref(false)

  const featuredArticle = computed(() => featuredTab.value.article)
  const didYouKnow = computed(() => featuredTab.value.didYouKnow)
  const bornOnThisDay = computed(() => featuredTab.value.bornOnThisDay)

  const savedSorted = computed<HomeSavedItem[]>(() =>
    [...savedItems.value].sort((a, b) => b.savedAt - a.savedAt),
  )

  const recentlySaved = computed<HomeSavedItem[]>(() => {
    if (!savedSorted.value.length) return []
    const now = Date.now()
    const withinDay = savedSorted.value.filter((item) => now - item.savedAt <= DAY_MS).length
    const count = Math.min(MAX_RECENTLY_SAVED, Math.max(MIN_RECENTLY_SAVED, withinDay))
    return savedSorted.value.slice(0, count)
  })

  let abort: AbortController | null = null
  let bookmarkAbort: AbortController | null = null

  function hydrateBookmarksFromCache(): void {
    const dependencyKey = bookmarksKey()
    const cachedSummaries = getCachedSavedSummaries(dependencyKey)
    if (cachedSummaries) {
      savedItems.value = cachedSummaries
    }

    const cachedRelated = getCachedRelatedFeed('home', dependencyKey)
    if (cachedRelated) {
      homeRelatedItems.value = cachedRelated.items
    }

    const cachedHelp = getCachedHelpWanted(dependencyKey)
    if (cachedHelp) helpWanted.value = cachedHelp

    const cachedRecent = getCachedRecentChangesPreview(dependencyKey)
    if (cachedRecent) recentChanges.value = cachedRecent
  }

  function clearPersonalizedFeeds(): void {
    savedItems.value = []
    homeRelatedItems.value = []
    helpWanted.value = []
    recentChanges.value = []
    savedItemsLoading.value = false
    homeRelatedLoading.value = false
    helpWantedLoading.value = false
    recentChangesLoading.value = false
  }

  async function reloadBookmarks(): Promise<void> {
    bookmarkAbort?.abort()
    bookmarkAbort = new AbortController()
    const { signal } = bookmarkAbort

    const entries = listBookmarks()
    hasSavedPages.value = entries.length > 0
    if (!entries.length) {
      clearPersonalizedFeeds()
      return
    }

    hydrateBookmarksFromCache()
    const dependencyKey = bookmarksKey()

    if (!getCachedSavedSummaries(dependencyKey)) {
      savedItemsLoading.value = true
    }

    let items: HomeSavedItem[]
    try {
      items = await fetchSavedItemSummaries(entries, signal)
      if (signal.aborted) return
      savedItems.value = items
    } catch (err) {
      if (isAbort(err)) return
      clearPersonalizedFeeds()
      return
    } finally {
      savedItemsLoading.value = false
    }

    if (!items.length) {
      homeRelatedItems.value = []
      helpWanted.value = []
      recentChanges.value = []
      return
    }

    if (!getCachedRelatedFeed('home', dependencyKey)) {
      homeRelatedLoading.value = true
    }
    try {
      homeRelatedItems.value = await loadRelatedFeedInitialBatch(
        'home',
        items,
        dependencyKey,
        signal,
      )
      if (signal.aborted) return
    } catch (err) {
      if (isAbort(err)) return
      homeRelatedItems.value = []
    } finally {
      homeRelatedLoading.value = false
    }

    if (!getCachedHelpWanted(dependencyKey)) {
      helpWantedLoading.value = true
    }
    try {
      helpWanted.value = await fetchHelpWanted(items, signal)
      if (signal.aborted) return
    } catch (err) {
      if (isAbort(err)) return
    } finally {
      helpWantedLoading.value = false
    }

    if (!getCachedRecentChangesPreview(dependencyKey)) {
      recentChangesLoading.value = true
    }
    try {
      recentChanges.value = await fetchRecentChanges(items, signal)
    } catch (err) {
      if (isAbort(err)) return
    } finally {
      recentChangesLoading.value = false
    }
  }

  async function loadFeatured(signal: AbortSignal): Promise<void> {
    const dayKey = utcDayKey()
    featuredTabError.value = null

    const cached = getCachedFeaturedTab(dayKey)
    if (cached && isUsableFeaturedTab(cached)) {
      featuredTab.value = cached
      featuredTabLoading.value = false
      return
    }

    featuredTab.value = EMPTY_FEATURED_TAB
    featuredTabLoading.value = true
    try {
      featuredTab.value = await fetchFeaturedTabContent(signal)
      if (!isUsableFeaturedTab(featuredTab.value)) {
        featuredTabError.value = 'No featured content is available right now.'
      }
    } catch (err) {
      if (isAbort(err)) return
      featuredTab.value = EMPTY_FEATURED_TAB
      featuredTabError.value =
        err instanceof Error ? err.message : 'Could not load featured content.'
    } finally {
      featuredTabLoading.value = false
    }
  }

  async function loadTrending(signal: AbortSignal, options?: { background?: boolean }): Promise<void> {
    trendingTabError.value = null

    if (!options?.background && !trendingItems.value.length) {
      trendingLoading.value = true
    }

    try {
      trendingItems.value = await fetchTrendingFeed(signal)
    } catch (err) {
      if (isAbort(err)) return
      if (!trendingItems.value.length) {
        trendingItems.value = []
      }
      trendingTabError.value =
        err instanceof Error ? err.message : 'Could not load trending articles.'
    } finally {
      trendingLoading.value = false
    }
  }

  async function refreshIncompleteTrending(signal?: AbortSignal): Promise<void> {
    if (!trendingItems.value.some(isTrendingSummaryIncomplete)) return
    if (!signal) {
      abort?.abort()
      abort = new AbortController()
      signal = abort.signal
    }
    try {
      trendingItems.value = await fetchTrendingFeed(signal)
    } catch (err) {
      if (isAbort(err)) return
    }
  }

  async function retryFeaturedFeed(): Promise<void> {
    const dayKey = utcDayKey()
    clearFeaturedTabSessionCache()
    clearFeaturedFeedSessionCache()
    clearCachedFeaturedTab(dayKey)

    abort?.abort()
    abort = new AbortController()
    await loadFeatured(abort.signal)
  }

  async function retryTrendingFeed(): Promise<void> {
    const dayKey = utcDayKey()
    clearTrendingSessionCache()
    clearCachedTrendingFeed(dayKey)

    abort?.abort()
    abort = new AbortController()
    await loadTrending(abort.signal)
  }

  function load(): void {
    abort?.abort()
    abort = new AbortController()
    const { signal } = abort

    const dayKey = utcDayKey()
    const featuredCached = getCachedFeaturedTab(dayKey)
    const trendingCached = getCachedTrendingFeed(dayKey)

    if (featuredCached && isUsableFeaturedTab(featuredCached)) {
      featuredTab.value = featuredCached
      featuredTabLoading.value = false
    } else {
      featuredTab.value = EMPTY_FEATURED_TAB
      featuredTabLoading.value = true
    }

    if (trendingCached?.length) {
      trendingItems.value = trendingCached
      trendingLoading.value = false
    } else {
      trendingItems.value = []
      trendingLoading.value = true
    }

    void (async () => {
      if (!featuredCached) {
        await loadFeatured(signal)
      }
      if (signal.aborted) return

      await loadTrending(signal, { background: Boolean(trendingCached?.length) })
      if (signal.aborted) return

      await reloadBookmarks()
    })()
  }

  watch(
    () => route.query.tab,
    (tab) => {
      if (tab !== 'trending') return
      void refreshIncompleteTrending()
    },
  )

  watch(
    () => [route.query.item, route.query.tab] as const,
    () => {
      void reloadBookmarks()
    },
  )

  onMounted(load)
  onBeforeUnmount(() => {
    abort?.abort()
    bookmarkAbort?.abort()
  })

  return {
    featuredArticle,
    didYouKnow,
    bornOnThisDay,
    featuredTabLoading,
    featuredTabError,
    retryFeaturedFeed,
    trendingItems,
    trendingLoading,
    trendingTabError,
    retryTrendingFeed,
    hasSavedPages,
    savedSorted,
    recentlySaved,
    savedItemsLoading,
    homeRelatedItems,
    homeRelatedLoading,
    helpWanted,
    recentChanges,
    helpWantedLoading,
    recentChangesLoading,
    reloadBookmarks,
  }
}
