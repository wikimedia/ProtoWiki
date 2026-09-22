import { computed, ref, watch, type Ref } from 'vue'

import {
  createWikitabSearchActivityFeed,
  type WikitabSearchActivityFeed,
  type WikitabSearchActivityItem,
  type WikitabSearchTopTitle,
} from './data/fetchWikitabSearchActivity'

export type ActivitySlot =
  | { kind: 'loading'; id: string }
  | { kind: 'resolved'; item: WikitabSearchActivityItem }

const INITIAL_LOADING_SLOTS = 3

export function useWikitabSearchActivity(
  searchQuery: Ref<string>,
  knownTitles: Ref<WikitabSearchTopTitle[]>,
  articlesLoading: Ref<boolean>,
  enabled: Ref<boolean>,
) {
  const slots = ref<ActivitySlot[]>([])
  const loading = ref(false)
  const fillingInitial = ref(false)
  const loadingMore = ref(false)
  const hasMore = ref(false)

  let feed: WikitabSearchActivityFeed | null = null
  let abortController: AbortController | null = null
  let loadedForQuery = ''

  function reset(): void {
    slots.value = []
    loading.value = false
    fillingInitial.value = false
    loadingMore.value = false
    hasMore.value = false
    feed = null
  }

  function syncHasMore(): void {
    hasMore.value = Boolean(feed?.hasMore)
  }

  async function appendNext(): Promise<boolean> {
    if (!feed) return false

    try {
      const item = await feed.takeNext(abortController?.signal)
      syncHasMore()

      if (!item) return false

      slots.value.push({ kind: 'resolved', item })
      return true
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return false
      hasMore.value = false
      return false
    }
  }

  async function fillInitialSlots(): Promise<void> {
    fillingInitial.value = true

    try {
      for (let index = 0; index < INITIAL_LOADING_SLOTS; index++) {
        if (!feed?.hasMore) break
        const added = await appendNext()
        if (!added) break
      }
    } finally {
      fillingInitial.value = false
      syncHasMore()
    }
  }

  function shouldWaitForArticlesTitles(): boolean {
    return !knownTitles.value.length && articlesLoading.value
  }

  async function loadInitial(query: string): Promise<void> {
    if (shouldWaitForArticlesTitles()) {
      loading.value = true
      return
    }

    abortController?.abort()
    abortController = new AbortController()
    const { signal } = abortController

    loading.value = true
    reset()
    loading.value = true

    try {
      const titles = knownTitles.value.slice(0, 6)
      feed = await createWikitabSearchActivityFeed(query, {
        signal,
        knownTitles: titles.length ? titles : undefined,
      })

      if (signal.aborted) return

      if (!feed) {
        reset()
        return
      }

      syncHasMore()

      void feed.prefetchMetadata(signal).catch((err) => {
        if ((err as Error)?.name === 'AbortError') return
      })

      await feed.start(signal)
      if (signal.aborted) return

      loading.value = false
      await fillInitialSlots()
      loadedForQuery = query
    } catch (err) {
      if (signal.aborted || (err as Error)?.name === 'AbortError') return
      reset()
      loadedForQuery = ''
    } finally {
      if (!signal.aborted) loading.value = false
      syncHasMore()
    }
  }

  async function loadMore(): Promise<void> {
    if (!feed || loading.value || fillingInitial.value || loadingMore.value || !hasMore.value) {
      return
    }

    loadingMore.value = true

    try {
      for (let index = 0; index < INITIAL_LOADING_SLOTS; index++) {
        if (!feed?.hasMore) break
        const added = await appendNext()
        if (!added) break
      }
    } finally {
      loadingMore.value = false
      syncHasMore()
    }
  }

  const resolvedCount = computed(() =>
    slots.value.filter((slot) => slot.kind === 'resolved').length,
  )

  const loadingTail = computed(
    () => fillingInitial.value && resolvedCount.value > 0,
  )

  watch(searchQuery, () => {
    abortController?.abort()
    reset()
    loadedForQuery = ''
  })

  watch(
    [enabled, searchQuery, knownTitles, articlesLoading],
    ([isEnabled, query]) => {
      if (!isEnabled) {
        abortController?.abort()
        return
      }

      const trimmed = query.trim()
      if (!trimmed.length) return
      if (loadedForQuery === trimmed && feed) return
      void loadInitial(trimmed)
    },
    { immediate: true },
  )

  return {
    slots,
    loading,
    fillingInitial,
    loadingTail,
    loadingMore,
    hasMore,
    resolvedCount,
    loadMore,
  }
}
