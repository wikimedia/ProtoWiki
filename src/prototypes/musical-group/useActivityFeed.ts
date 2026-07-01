import { onUnmounted, ref, watch, type Ref } from 'vue'

import { mapWithConcurrency } from '@/lib/mapWithConcurrency'

import {
  fetchLatestRecentChanges,
  fetchLatestRevisionsForTitles,
  fetchNextActivityCandidates,
  fetchRecentChangeForItem,
  initPageActivityStates,
  type ActivityCandidate,
  type LatestRevision,
  type PageActivityState,
} from './data/fetchRecentChanges'
import { getCachedActivityFeed, setCachedActivityFeed } from './data/homeTabCache'
import { savedPagesListKey } from './data/cacheKeys'
import type { HomeRecentChange, HomeSavedItem } from './data/types'

/** How many classified change cards to resolve per loadMore call. */
const PAGE_SIZE = 3

export type ActivityFeedMode = 'latest' | 'full'

/**
 * Activity feed for saved pages. `latest` returns one classified edit per page;
 * `full` paginates revision history as the user scrolls.
 */
export function useActivityFeed(
  savedItems: Ref<HomeSavedItem[]>,
  active: Ref<boolean>,
  mode: Ref<ActivityFeedMode> = ref('full'),
) {
  const changes = ref<HomeRecentChange[]>([])
  const loading = ref(false)
  const hasMore = ref(true)
  const error = ref<string | null>(null)
  const queueReady = ref(false)
  const itemIdsWithoutRevisions = ref<string[]>([])
  const revisionLookupFailed = ref(false)

  let queue: ActivityCandidate[] = []
  let pageStates: PageActivityState[] = []
  let latestRevidByTitle = new Map<string, number>()
  const seenRevids = new Set<number>()
  let fetchAbort: AbortController | null = null
  let loadedForKey: string | null = null

  function savedKey(): string {
    return savedPagesListKey(savedItems.value)
  }

  function feedCacheKey(listKey: string): string {
    return `${mode.value}:${listKey}`
  }

  function resetState() {
    changes.value = []
    loading.value = false
    error.value = null
    queueReady.value = false
    itemIdsWithoutRevisions.value = []
    revisionLookupFailed.value = false
    queue = []
    pageStates = []
    latestRevidByTitle = new Map()
    seenRevids.clear()
    hasMore.value = true
  }

  function persistState() {
    const listKey = savedKey()
    setCachedActivityFeed({
      dependencyKey: feedCacheKey(listKey),
      changes: changes.value,
      seenRevids: [...seenRevids],
      pageStates: pageStates.map((state) => ({
        itemId: state.item.id,
        itemTitle: state.item.title,
        enwikiTitle: state.item.enwikiTitle,
        thumbnailUrl: state.item.thumbnailUrl,
        savedAt: state.item.savedAt,
        oldestRevid: state.oldestRevid,
        exhausted: state.exhausted,
      })),
      latestRevidByTitle: [...latestRevidByTitle.entries()],
      queue: queue.map(({ item, revision }) => ({
        itemId: item.id,
        itemTitle: item.title,
        enwikiTitle: item.enwikiTitle,
        thumbnailUrl: item.thumbnailUrl,
        savedAt: item.savedAt,
        revision,
      })),
      hasMore: hasMore.value,
      fetchedAt: Date.now(),
    })
  }

  function restoreFromCache(listKey: string): boolean {
    const cached = getCachedActivityFeed(feedCacheKey(listKey))
    if (!cached) return false

    changes.value = cached.changes
    hasMore.value = cached.hasMore
    queueReady.value = true
    seenRevids.clear()
    for (const revid of cached.seenRevids) seenRevids.add(revid)

    pageStates = cached.pageStates.map((state) => ({
      item: {
        id: state.itemId,
        title: state.itemTitle,
        enwikiTitle: state.enwikiTitle,
        description: '',
        thumbnailUrl: state.thumbnailUrl,
        savedAt: state.savedAt,
      },
      oldestRevid: state.oldestRevid,
      exhausted: state.exhausted,
    }))

    latestRevidByTitle = new Map(cached.latestRevidByTitle)
    queue = cached.queue.map((entry) => ({
      item: {
        id: entry.itemId,
        title: entry.itemTitle,
        enwikiTitle: entry.enwikiTitle,
        description: '',
        thumbnailUrl: entry.thumbnailUrl,
        savedAt: entry.savedAt,
      },
      revision: entry.revision as LatestRevision,
    }))

    loading.value = false
    error.value = null
    return true
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

    const { revisions } = await fetchLatestRevisionsForTitles(titles, signal)
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

  async function loadLatest(signal: AbortSignal) {
    const { changes: fresh, itemIdsWithoutRevisions: missing, revisionLookupFailed: lookupFailed } =
      await fetchLatestRecentChanges(savedItems.value, signal)
    changes.value = fresh
    itemIdsWithoutRevisions.value = missing
    revisionLookupFailed.value = lookupFailed
    hasMore.value = false
    queueReady.value = true
    persistState()
  }

  async function loadMore() {
    if (!active.value || loading.value || !hasMore.value) return

    fetchAbort?.abort()
    fetchAbort = new AbortController()
    const { signal } = fetchAbort

    loading.value = true
    error.value = null

    try {
      if (mode.value === 'latest') {
        await loadLatest(signal)
        return
      }

      await ensureQueue(signal)

      if (!queue.length) {
        hasMore.value = false
        persistState()
        return
      }

      const batch = queue.splice(0, PAGE_SIZE)
      if (batch.length) {
        const resolved = await mapWithConcurrency(
          batch,
          PAGE_SIZE,
          ({ item, revision }) =>
            fetchRecentChangeForItem(item, signal, revision, latestRevidByTitle).catch((err) => {
              if ((err as Error).name === 'AbortError') throw err
              return null
            }),
          signal,
        )
        const fresh = resolved.filter((change): change is HomeRecentChange => change !== null)
        if (fresh.length) {
          changes.value = [...changes.value, ...fresh]
        }
      }

      updateHasMore()
      persistState()
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      error.value = 'Could not load activity.'
      hasMore.value = false
    } finally {
      loading.value = false
    }
  }

  function retry() {
    if (!active.value) return
    loadedForKey = null
    resetState()
    void loadMore()
  }

  watch(
    () => [savedKey(), active.value, mode.value] as const,
    ([key, isActive, feedMode], oldValue) => {
      const prevKey = oldValue?.[0]
      const prevMode = oldValue?.[2]

      if (key !== prevKey || feedMode !== prevMode) {
        loadedForKey = null
      }

      if (!isActive) {
        fetchAbort?.abort()
        fetchAbort = null
        loading.value = false
        return
      }

      const loadKey = `${key}:${feedMode}`
      if (loadedForKey === loadKey) return

      loadedForKey = loadKey
      fetchAbort?.abort()
      fetchAbort = null

      if (restoreFromCache(key)) return

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
    itemIdsWithoutRevisions,
    revisionLookupFailed,
    loadMore,
    retry,
  }
}
