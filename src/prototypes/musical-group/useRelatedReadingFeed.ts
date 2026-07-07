import { onUnmounted, ref, watch, type Ref } from 'vue'

import { bookmarksKey, listsKey } from './data/cacheKeys'
import type { UserList } from './data/lists'
import {
  createListRelatedFeedState,
  createRelatedFeedState,
  loadRelatedFeedBatch,
  persistRelatedFeedState,
  relatedFeedStateFromCache,
  type RelatedFeedRuntimeState,
} from './loadRelatedFeedInitialBatch'
import {
  getCachedRelatedFeed,
  type RelatedFeedTabId,
} from './data/homeTabCache'
import type { HomeRelated, HomeSavedItem } from './data/types'

export type RelatedFeedSeedMode = 'bookmarks' | 'lists'

/**
 * A paginated "Related reading" feed: each page draws morelike results from
 * saved pages (and later from related cards), resolves them to cards, and
 * dedupes against the saved set and everything already shown. Seeds keep
 * paginating via sroffset; related items become new seeds as the feed grows.
 */
export function useRelatedReadingFeed(
  sourceItems: Ref<HomeSavedItem[] | UserList[]>,
  active: Ref<boolean>,
  feedTabId: RelatedFeedTabId = 'saved',
  seedMode: RelatedFeedSeedMode = 'bookmarks',
) {
  const related = ref<HomeRelated[]>([])
  const loading = ref(false)
  const hasMore = ref(true)
  const error = ref<string | null>(null)

  let state: RelatedFeedRuntimeState | null = null
  let fetchAbort: AbortController | null = null
  let loadedForKey: string | null = null

  function dependencyKey(): string {
    return seedMode === 'lists' ? listsKey() : bookmarksKey()
  }

  function sourceKey(): string {
    if (seedMode === 'lists') {
      return listsKey()
    }
    return [...(sourceItems.value as HomeSavedItem[])]
      .map((item) => item.id)
      .sort()
      .join(',')
  }

  function createState(): RelatedFeedRuntimeState {
    if (seedMode === 'lists') {
      return createListRelatedFeedState(sourceItems.value as UserList[])
    }
    return createRelatedFeedState(sourceItems.value as HomeSavedItem[])
  }

  function applyState(runtime: RelatedFeedRuntimeState) {
    state = runtime
    related.value = runtime.items
    hasMore.value = runtime.hasMore
  }

  function reset() {
    fetchAbort?.abort()
    fetchAbort = null

    related.value = []
    loading.value = false
    error.value = null

    applyState(createState())
  }

  function restoreFromCache(key: string): boolean {
    const cached = getCachedRelatedFeed(feedTabId, key)
    if (!cached) return false

    applyState(relatedFeedStateFromCache(cached))
    loading.value = false
    error.value = null
    return true
  }

  async function loadMore() {
    if (!active.value || loading.value || !hasMore.value) return

    fetchAbort?.abort()
    fetchAbort = new AbortController()
    const { signal } = fetchAbort

    loading.value = true
    error.value = null

    const key = dependencyKey()

    try {
      if (!state) {
        applyState(createState())
      }

      await loadRelatedFeedBatch(state!, signal)
      related.value = state!.items
      hasMore.value = state!.hasMore
      persistRelatedFeedState(feedTabId, key, state!)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      error.value = 'Could not load more related reading.'
      hasMore.value = false
    } finally {
      loading.value = false
    }
  }

  watch(
    () => [sourceKey(), active.value] as const,
    ([key, isActive], oldValue) => {
      const prevKey = oldValue?.[0]

      if (key !== prevKey) {
        loadedForKey = null
        state = null
      }

      if (!isActive) {
        fetchAbort?.abort()
        fetchAbort = null
        loading.value = false
        return
      }

      if (loadedForKey === key) return

      loadedForKey = key
      const depKey = dependencyKey()
      if (restoreFromCache(depKey)) return

      reset()
      void loadMore()
    },
    { immediate: true },
  )

  onUnmounted(() => {
    fetchAbort?.abort()
  })

  return {
    related,
    loading,
    hasMore,
    error,
    loadMore,
  }
}
