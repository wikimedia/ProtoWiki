import { onUnmounted, ref, watch, type Ref } from 'vue'

import { mapWithConcurrency } from '@/lib/mapWithConcurrency'

import {
  buildRecentChangeShell,
  classifyRecentChange,
  fetchLatestRecentChanges,
  fetchLatestRevisionsForTitles,
  fetchNextActivityCandidates,
  fetchRecentChangeForItem,
  initPageActivityStates,
  type ActivityCandidate,
  type ChangeClassification,
  type ClassifyChangeOptions,
  type LatestRevision,
  type PageActivityState,
} from './data/fetchRecentChanges'
import { getCachedActivityFeed, setCachedActivityFeed } from './data/homeTabCache'
import { savedPagesListKey } from './data/cacheKeys'
import type { HomeRecentChange, HomeSavedItem } from './data/types'

/** Classified change cards resolved per loadMore call (full feed loads one at a time). */
const FULL_FEED_PAGE_SIZE = 1
/** Home preview resolves latest edits in one batch. */
const LATEST_FEED_PAGE_SIZE = 3

export type ActivityFeedMode = 'latest' | 'full'

export interface ActivityFeedOptions {
  /** Show revision metadata immediately; resolve flags in the background. */
  eagerClassify?: boolean
  /** Review changes: review flags + registered first edit (no good-faith). */
  reviewFeed?: boolean
}

/**
 * Activity feed for saved pages. `latest` returns one classified edit per page;
 * `full` paginates revision history as the user scrolls.
 */
export function useActivityFeed(
  savedItems: Ref<HomeSavedItem[]>,
  active: Ref<boolean>,
  mode: Ref<ActivityFeedMode> = ref('full'),
  options: ActivityFeedOptions = {},
) {
  const changes = ref<HomeRecentChange[]>([])
  const loading = ref(false)
  const loadingMore = ref(false)
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
    loadingMore.value = false
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

  function classifyOptions(): ClassifyChangeOptions {
    return {
      reviewFeed: options.reviewFeed,
      skipThankable: options.reviewFeed,
    }
  }

  function applyChangeClassification(revid: number, result: ChangeClassification): void {
    const index = changes.value.findIndex((change) => change.revid === revid)
    if (index < 0) return
    changes.value[index] = {
      ...changes.value[index],
      flag: result.flag,
      majorChange: result.majorChange,
      flagPending: false,
    }
    persistState()
  }

  function classifyChangeInBackground(
    item: HomeSavedItem,
    revision: LatestRevision,
    signal: AbortSignal,
  ): void {
    if (!item.enwikiTitle) return

    void classifyRecentChange(revision, item.enwikiTitle, signal, classifyOptions())
      .then((result) => {
        if (signal.aborted) return
        applyChangeClassification(revision.revid, result)
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return
        applyChangeClassification(revision.revid, { flag: 'none', majorChange: false })
      })
  }

  function pageSize(): number {
    return mode.value === 'full' ? FULL_FEED_PAGE_SIZE : LATEST_FEED_PAGE_SIZE
  }

  async function loadMore(): Promise<boolean> {
    if (!active.value || loading.value || loadingMore.value || !hasMore.value) return false

    if (!fetchAbort) {
      fetchAbort = new AbortController()
    }
    const { signal } = fetchAbort

    const isInitial = mode.value === 'full' && changes.value.length === 0
    if (isInitial) {
      loading.value = true
    } else if (mode.value === 'full') {
      loadingMore.value = true
    } else {
      loading.value = true
    }
    error.value = null

    const countBefore = changes.value.length

    try {
      if (mode.value === 'latest') {
        await loadLatest(signal)
        return changes.value.length > 0
      }

      await ensureQueue(signal)

      if (!queue.length) {
        hasMore.value = false
        persistState()
        return false
      }

      const batch = queue.splice(0, pageSize())
      if (batch.length) {
        if (options.eagerClassify) {
          for (const { item, revision } of batch) {
            const shell = buildRecentChangeShell(item, revision, latestRevidByTitle, {
              flagPending: true,
            })
            if (!shell) continue
            changes.value = [...changes.value, shell]
            classifyChangeInBackground(item, revision, signal)
          }
        } else {
          const resolved = await mapWithConcurrency(
            batch,
            pageSize(),
            ({ item, revision }) =>
              fetchRecentChangeForItem(item, signal, revision, latestRevidByTitle, classifyOptions()).catch(
                (err) => {
                  if ((err as Error).name === 'AbortError') throw err
                  return null
                },
              ),
            signal,
          )
          const fresh = resolved.filter((change): change is HomeRecentChange => change !== null)
          if (fresh.length) {
            changes.value = [...changes.value, ...fresh]
          }
        }
      }

      updateHasMore()
      persistState()
      if (!batch.length) return false
      if (options.eagerClassify) return true
      return changes.value.length > countBefore || hasMore.value
    } catch (err) {
      if ((err as Error).name === 'AbortError') return false
      error.value = 'Could not load activity.'
      hasMore.value = false
      return false
    } finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  function retry() {
    if (!active.value) return
    loadedForKey = null
    fetchAbort?.abort()
    fetchAbort = null
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
        loadingMore.value = false
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
    loadingMore,
    hasMore,
    error,
    queueReady,
    itemIdsWithoutRevisions,
    revisionLookupFailed,
    loadMore,
    retry,
  }
}
