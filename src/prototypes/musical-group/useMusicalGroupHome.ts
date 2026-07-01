import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { listBookmarks } from './data/bookmarks'
import { bookmarksKey, utcDayKey } from './data/cacheKeys'
import { fetchFeaturedTabContent } from './data/fetchFeaturedFeed'
import { fetchHelpWanted } from './data/fetchHelpWanted'
import { fetchRecentChanges } from './data/fetchRecentChanges'
import { fetchSavedItemSummaries } from './data/fetchSavedItemSummaries'
import { fetchTrendingFeed } from './data/fetchTrending'
import {
  getCachedFeaturedTab,
  getCachedHelpWanted,
  getCachedRecentChangesPreview,
  getCachedSavedSummaries,
  getCachedTrendingFeed,
} from './data/homeTabCache'
import type {
  HomeFeaturedTab,
  HomeHelpWanted,
  HomeRecentChange,
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
  const trendingItems = ref<HomeTrending[]>([])
  const trendingLoading = ref(true)
  const hasSavedPages = ref(listBookmarks().length > 0)
  const savedItems = ref<HomeSavedItem[]>([])
  const helpWanted = ref<HomeHelpWanted[]>([])
  const recentChanges = ref<HomeRecentChange[]>([])

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

  function hydrateBookmarksFromCache(): boolean {
    const dependencyKey = bookmarksKey()
    const cachedSummaries = getCachedSavedSummaries(dependencyKey)
    if (!cachedSummaries) return false

    savedItems.value = cachedSummaries

    const cachedHelp = getCachedHelpWanted(dependencyKey)
    if (cachedHelp) helpWanted.value = cachedHelp

    const cachedRecent = getCachedRecentChangesPreview(dependencyKey)
    if (cachedRecent) recentChanges.value = cachedRecent

    return true
  }

  function reloadBookmarks(): void {
    bookmarkAbort?.abort()
    bookmarkAbort = new AbortController()
    const { signal } = bookmarkAbort

    const entries = listBookmarks()
    hasSavedPages.value = entries.length > 0
    if (!entries.length) {
      savedItems.value = []
      helpWanted.value = []
      recentChanges.value = []
      return
    }

    if (hydrateBookmarksFromCache()) return

    fetchSavedItemSummaries(entries, signal)
      .then((items) => {
        savedItems.value = items
        if (!items.length) return

        fetchHelpWanted(items, signal)
          .then((value) => {
            helpWanted.value = value
          })
          .catch(() => {})

        fetchRecentChanges(items, signal)
          .then((value) => {
            recentChanges.value = value
          })
          .catch(() => {})
      })
      .catch((err) => {
        if (isAbort(err)) return
        savedItems.value = []
      })
  }

  async function loadFeatured(signal: AbortSignal): Promise<void> {
    const dayKey = utcDayKey()
    const cached = getCachedFeaturedTab(dayKey)
    if (cached) {
      featuredTab.value = cached
      featuredTabLoading.value = false
      return
    }

    featuredTab.value = EMPTY_FEATURED_TAB
    featuredTabLoading.value = true
    try {
      featuredTab.value = await fetchFeaturedTabContent(signal)
    } catch {
      // Keep empty state.
    } finally {
      featuredTabLoading.value = false
    }
  }

  async function loadTrending(signal: AbortSignal): Promise<void> {
    const dayKey = utcDayKey()
    const cached = getCachedTrendingFeed(dayKey)
    if (cached) {
      trendingItems.value = cached
      trendingLoading.value = false
      return
    }

    trendingItems.value = []
    trendingLoading.value = true
    try {
      trendingItems.value = await fetchTrendingFeed(signal)
    } catch {
      trendingItems.value = []
    } finally {
      trendingLoading.value = false
    }
  }

  function load(): void {
    abort?.abort()
    abort = new AbortController()
    const { signal } = abort

    const dayKey = utcDayKey()
    const featuredCached = getCachedFeaturedTab(dayKey)
    const trendingCached = getCachedTrendingFeed(dayKey)

    if (featuredCached) {
      featuredTab.value = featuredCached
      featuredTabLoading.value = false
    } else {
      featuredTab.value = EMPTY_FEATURED_TAB
      featuredTabLoading.value = true
    }

    if (trendingCached) {
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

      if (!trendingCached) {
        await loadTrending(signal)
      }
      if (signal.aborted) return

      reloadBookmarks()
    })()
  }

  watch(
    () => [route.query.item, route.query.tab] as const,
    () => {
      reloadBookmarks()
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
    trendingItems,
    trendingLoading,
    hasSavedPages,
    savedSorted,
    recentlySaved,
    helpWanted,
    recentChanges,
    reloadBookmarks,
  }
}
