import { computed, ref, shallowRef, watch, type Ref } from 'vue'

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

let nextLoadingId = 0

function createLoadingSlot(): ActivitySlot {
  nextLoadingId += 1
  return { kind: 'loading', id: `loading-${nextLoadingId}` }
}

export function useWikitabSearchActivity(
  searchQuery: Ref<string>,
  knownTitles: Ref<WikitabSearchTopTitle[]>,
  enabled: Ref<boolean>,
) {
  const slots = ref<ActivitySlot[]>([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const hasMore = ref(false)

  let feed: WikitabSearchActivityFeed | null = null
  let abortController: AbortController | null = null
  let loadedForQuery = ''

  function reset(): void {
    slots.value = []
    loading.value = false
    loadingMore.value = false
    hasMore.value = false
    feed = null
  }

  function syncHasMore(): void {
    hasMore.value = Boolean(feed?.hasMore)
  }

  function replaceLoadingSlot(
    target: 'oldest' | string,
    item: WikitabSearchActivityItem,
  ): void {
    const index =
      target === 'oldest'
        ? slots.value.findIndex((slot) => slot.kind === 'loading')
        : slots.value.findIndex((slot) => slot.kind === 'loading' && slot.id === target)

    if (index >= 0) {
      slots.value[index] = { kind: 'resolved', item }
      return
    }

    slots.value.push({ kind: 'resolved', item })
  }

  function removeLoadingSlot(id: string): void {
    slots.value = slots.value.filter(
      (slot) => !(slot.kind === 'loading' && slot.id === id),
    )
  }

  async function resolveOne(replaceTarget: 'oldest' | string): Promise<boolean> {
    if (!feed) return false

    try {
      const item = await feed.takeNext(abortController?.signal)
      syncHasMore()

      if (!item) {
        if (typeof replaceTarget === 'string' && replaceTarget !== 'oldest') {
          removeLoadingSlot(replaceTarget)
        }
        return false
      }

      replaceLoadingSlot(replaceTarget, item)
      return true
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return false
      if (typeof replaceTarget === 'string' && replaceTarget !== 'oldest') {
        removeLoadingSlot(replaceTarget)
      }
      hasMore.value = false
      return false
    }
  }

  async function resolveNext(replaceTarget: 'oldest' | string): Promise<boolean> {
    if (!feed || loadingMore.value) return false

    loadingMore.value = true

    try {
      return await resolveOne(replaceTarget)
    } finally {
      loadingMore.value = false
      syncHasMore()
    }
  }

  async function fillInitialSlots(): Promise<void> {
    for (let index = 0; index < INITIAL_LOADING_SLOTS; index++) {
      if (!feed?.hasMore) break
      const added = await resolveNext('oldest')
      if (!added) break
    }
  }

  async function loadInitial(query: string): Promise<void> {
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
      slots.value = Array.from({ length: INITIAL_LOADING_SLOTS }, () => createLoadingSlot())
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
    if (!feed || loading.value || loadingMore.value || !hasMore.value) return

    loadingMore.value = true

    const loadingSlots = Array.from({ length: INITIAL_LOADING_SLOTS }, () =>
      createLoadingSlot(),
    )
    slots.value.push(...loadingSlots)

    try {
      for (const slot of loadingSlots) {
        if (!feed?.hasMore) {
          removeLoadingSlot(slot.id)
          break
        }

        const added = await resolveOne(slot.id)
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

  watch(searchQuery, () => {
    abortController?.abort()
    reset()
    loadedForQuery = ''
  })

  watch(
    [enabled, searchQuery],
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
    loadingMore,
    hasMore,
    resolvedCount,
    loadMore,
  }
}
