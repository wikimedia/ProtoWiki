import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'

import { listBookmarks } from '../../musical-group/data/bookmarks'
import { bookmarksKey } from '../../musical-group/data/cacheKeys'
import {
  loadNextRandomRecentChange,
  restoreRandomRecentChangesFeed,
  type RandomRecentChangesFeed,
} from '../../musical-group/data/fetchRandomRecentChanges'
import { fetchSavedItemSummaries } from '../../musical-group/data/fetchSavedItemSummaries'
import { getCachedSavedSummaries } from '../../musical-group/data/homeTabCache'
import type { HomeRecentChange, HomeSavedItem } from '../../musical-group/data/types'
import {
  isSentinelNearViewport,
  useViewportInfiniteScroll,
} from './useViewportInfiniteScroll'

function useSavedRecentActivityPage(bookmarkEntries: ReturnType<typeof listBookmarks>) {
  const dependencyKey = bookmarksKey()
  const cachedSummaries = getCachedSavedSummaries(dependencyKey)

  const savedItems = ref<HomeSavedItem[]>(cachedSummaries ?? [])
  const savedItemsLoading = ref(Boolean(!cachedSummaries?.length))

  onMounted(async () => {
    try {
      savedItems.value = await fetchSavedItemSummaries(bookmarkEntries)
    } catch {
      if (!savedItems.value.length) savedItems.value = []
    }
    savedItemsLoading.value = false
  })

  return {
    mode: 'saved' as const,
    savedItems,
    savedItemsLoading,
    recentChanges: ref<HomeRecentChange[]>([]),
    recentChangesLoading: computed(() => false),
    recentChangesLoadingMore: computed(() => false),
    loadSentinel: ref<HTMLElement | null>(null),
  }
}

function useRandomRecentActivityPage() {
  const pageActive = ref(true)
  const loadSentinel = ref<HTMLElement | null>(null)
  const recentChanges = ref<HomeRecentChange[]>([])
  const loading = ref(true)
  const loadingMore = ref(false)
  const hasMore = ref(true)

  let feed: RandomRecentChangesFeed | null = null
  let abort: AbortController | null = null
  let fillingViewport = false

  function syncFromFeed(): void {
    if (!feed) {
      recentChanges.value = []
      hasMore.value = false
      return
    }
    recentChanges.value = [...feed.items]
    hasMore.value = !feed.exhausted
  }

  function initializeFeed(): void {
    abort?.abort()
    abort = new AbortController()
    feed = restoreRandomRecentChangesFeed()
    syncFromFeed()
    if (recentChanges.value.length) {
      loading.value = false
    }
  }

  async function loadNext(): Promise<boolean> {
    if (!feed || !hasMore.value || loading.value || loadingMore.value) return false

    const isInitial = recentChanges.value.length === 0
    if (isInitial) {
      loading.value = true
    } else {
      loadingMore.value = true
    }

    try {
      const change = await loadNextRandomRecentChange(feed, abort?.signal)
      syncFromFeed()
      return Boolean(change)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return false
      hasMore.value = false
      return false
    } finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  async function fillViewport(): Promise<void> {
    if (fillingViewport) return
    fillingViewport = true
    try {
      while (pageActive.value && hasMore.value && !loadingMore.value) {
        const added = await loadNext()
        if (!added) break
        await nextTick()
        if (!isSentinelNearViewport(loadSentinel.value)) break
      }
    } finally {
      fillingViewport = false
    }
  }

  const feedLoading = computed(() => loading.value || loadingMore.value)

  const recentChangesLoading = computed(
    () => feedLoading.value && recentChanges.value.length === 0,
  )

  const recentChangesLoadingMore = computed(
    () => recentChanges.value.length > 0 && feedLoading.value,
  )

  useViewportInfiniteScroll({
    sentinel: loadSentinel,
    active: pageActive,
    hasMore,
    loading: feedLoading,
    loadMore: loadNext,
  })

  onMounted(async () => {
    initializeFeed()
    await fillViewport()
  })

  onUnmounted(() => {
    abort?.abort()
  })

  return {
    mode: 'random' as const,
    savedItems: ref<HomeSavedItem[]>([]),
    savedItemsLoading: ref(false),
    recentChanges,
    recentChangesLoading,
    recentChangesLoadingMore,
    loadSentinel,
  }
}

export function useWikitaLiteRecentActivityPage() {
  const bookmarkEntries = listBookmarks()
  if (bookmarkEntries.length) {
    return useSavedRecentActivityPage(bookmarkEntries)
  }
  return useRandomRecentActivityPage()
}
