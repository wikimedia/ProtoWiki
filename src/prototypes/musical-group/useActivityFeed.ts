import { onUnmounted, ref, watch, type Ref } from 'vue'

import {
  fetchLatestRevisionsForTitles,
  fetchNextActivityCandidates,
  fetchRecentChangeForItem,
  initPageActivityStates,
  type ActivityCandidate,
  type PageActivityState,
} from './data/fetchRecentChanges'
import type { HomeRecentChange, HomeSavedItem } from './data/types'

/** How many classified change cards to resolve per loadMore call. */
const PAGE_SIZE = 3

/**
 * Paginated Activity feed: fetches revision history for saved pages in
 * chronological order, classifying edits lazily as the user scrolls.
 */
export function useActivityFeed(
  savedItems: Ref<HomeSavedItem[]>,
  active: Ref<boolean>,
) {
  const changes = ref<HomeRecentChange[]>([])
  const loading = ref(false)
  const hasMore = ref(true)
  const error = ref<string | null>(null)
  const queueReady = ref(false)

  let queue: ActivityCandidate[] = []
  let pageStates: PageActivityState[] = []
  let latestRevidByTitle = new Map<string, number>()
  const seenRevids = new Set<number>()
  let fetchAbort: AbortController | null = null
  let loadedForKey: string | null = null

  function savedKey(): string {
    return [...savedItems.value]
      .map((item) => item.id)
      .sort()
      .join(',')
  }

  function resetState() {
    changes.value = []
    loading.value = false
    error.value = null
    queueReady.value = false
    queue = []
    pageStates = []
    latestRevidByTitle = new Map()
    seenRevids.clear()
    hasMore.value = true
  }

  function updateHasMore() {
    hasMore.value = queue.length > 0 || pageStates.some((state) => !state.exhausted)
  }

  async function refillQueue(signal: AbortSignal) {
    const fresh = await fetchNextActivityCandidates(pageStates, seenRevids, signal)
    if (fresh.length) {
      queue.push(...fresh)
    }
    updateHasMore()
  }

  async function refreshLatestRevids(signal: AbortSignal) {
    const titles = savedItems.value
      .map((item) => item.enwikiTitle)
      .filter((title): title is string => Boolean(title))
    if (!titles.length) {
      latestRevidByTitle = new Map()
      return
    }

    const revisions = await fetchLatestRevisionsForTitles(titles, signal)
    latestRevidByTitle = new Map(
      [...revisions.entries()].map(([key, revision]) => [key, revision.revid]),
    )
  }

  async function ensureQueue(signal: AbortSignal) {
    if (!pageStates.length) {
      pageStates = initPageActivityStates(savedItems.value)
      await refreshLatestRevids(signal)
    }

    if (!queue.length) {
      await refillQueue(signal)
    }

    queueReady.value = true
  }

  async function loadMore() {
    if (!active.value || loading.value || !hasMore.value) return

    fetchAbort?.abort()
    fetchAbort = new AbortController()
    const { signal } = fetchAbort

    loading.value = true
    error.value = null

    try {
      await ensureQueue(signal)

      if (!queue.length) {
        hasMore.value = false
        return
      }

      const batch = queue.splice(0, PAGE_SIZE)
      if (batch.length) {
        const resolved = await Promise.all(
          batch.map(({ item, revision }) =>
            fetchRecentChangeForItem(item, signal, revision, latestRevidByTitle).catch((err) => {
              if ((err as Error).name === 'AbortError') throw err
              return null
            }),
          ),
        )
        const fresh = resolved.filter((change): change is HomeRecentChange => change !== null)
        if (fresh.length) {
          changes.value = [...changes.value, ...fresh]
        }
      }

      updateHasMore()
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      error.value = 'Could not load activity.'
      hasMore.value = false
    } finally {
      loading.value = false
    }
  }

  watch(
    () => [savedKey(), active.value] as const,
    ([key, isActive], oldValue) => {
      const prevKey = oldValue?.[0]

      if (key !== prevKey) {
        loadedForKey = null
      }

      if (!isActive) {
        fetchAbort?.abort()
        fetchAbort = null
        loading.value = false
        return
      }

      if (loadedForKey === key) return

      loadedForKey = key
      fetchAbort?.abort()
      fetchAbort = null
      resetState()
      void loadMore()
    },
    { immediate: true },
  )

  onUnmounted(() => {
    fetchAbort?.abort()
  })

  return {
    changes,
    loading,
    hasMore,
    error,
    queueReady,
    loadMore,
  }
}
