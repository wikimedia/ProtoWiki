import { computed, ref, watch, type Ref } from 'vue'

import {
  fetchHighRevertRisk,
  getCachedHighRevertRisk,
} from './data/fetchRevertRiskLanguageAgnostic'
import {
  createWikitabSearchActivityFeed,
  type WikitabSearchActivityFeed,
  type WikitabSearchActivityItem,
  type WikitabSearchTopTitle,
} from './data/fetchWikitabSearchActivity'
import { articleTitleKey } from './data/wikitabHtml'
import { useWikitabDismissedActivity } from './useWikitabDismissedActivity'

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
  const {
    dismissedRevids,
    isDismissed,
    dismissActivity: persistDismissedActivity,
  } = useWikitabDismissedActivity()

  const slots = ref<ActivitySlot[]>([])
  const loading = ref(false)
  const fillingInitial = ref(false)
  const loadingMore = ref(false)
  const hasMore = ref(false)

  let feed: WikitabSearchActivityFeed | null = null
  let abortController: AbortController | null = null
  let revertRiskAbortController: AbortController | null = null
  let revertRiskQueue: Promise<void> = Promise.resolve()
  let loadedForQuery = ''

  function abortRevertRiskFetches(): void {
    revertRiskAbortController?.abort()
    revertRiskAbortController = null
    revertRiskQueue = Promise.resolve()
  }

  function applyCachedRevertRisk(item: WikitabSearchActivityItem): void {
    if (getCachedHighRevertRisk(item.revid) === true) {
      item.highRevertRisk = true
    }
  }

  function patchRevertRisk(revid: number, highRisk: boolean): void {
    if (!highRisk) return

    for (const slot of slots.value) {
      if (slot.kind === 'resolved' && slot.item.revid === revid) {
        slot.item.highRevertRisk = true
      }
    }
  }

  function patchThumbnails(thumbnailMap: Map<string, string>): void {
    if (!thumbnailMap.size) return

    for (const slot of slots.value) {
      if (slot.kind !== 'resolved') continue
      const url = thumbnailMap.get(articleTitleKey(slot.item.title))
      if (url) slot.item.thumbnailUrl = url
    }
  }

  function enqueueRevertRiskLookup(revid: number): void {
    if (isDismissed(revid)) return
    if (getCachedHighRevertRisk(revid) !== undefined) return

    revertRiskQueue = revertRiskQueue.then(async () => {
      if (isDismissed(revid)) return

      const cached = getCachedHighRevertRisk(revid)
      if (cached !== undefined) {
        patchRevertRisk(revid, cached)
        return
      }

      try {
        const highRisk = await fetchHighRevertRisk(revid, revertRiskAbortController?.signal)
        if (revertRiskAbortController?.signal.aborted) return
        patchRevertRisk(revid, highRisk)
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
      }
    })
  }

  function scheduleRevertRiskForItem(item: WikitabSearchActivityItem): void {
    applyCachedRevertRisk(item)
    enqueueRevertRiskLookup(item.revid)
  }

  function retryRevertRiskForResolvedSlots(): void {
    for (const slot of slots.value) {
      if (slot.kind === 'resolved') {
        scheduleRevertRiskForItem(slot.item)
      }
    }
  }

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
      for (;;) {
        const item = await feed.takeNext(abortController?.signal)
        syncHasMore()

        if (!item) return false
        if (isDismissed(item.revid)) continue

        slots.value.push({ kind: 'resolved', item })
        scheduleRevertRiskForItem(item)
        return true
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return false
      hasMore.value = false
      return false
    }
  }

  function dismissActivity(revid: number): void {
    persistDismissedActivity(revid)
    slots.value = slots.value.filter(
      (slot) => slot.kind !== 'resolved' || slot.item.revid !== revid,
    )

    if (
      feed?.hasMore &&
      !loading.value &&
      !fillingInitial.value &&
      !loadingMore.value
    ) {
      void appendNext()
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
    abortRevertRiskFetches()
    abortController = new AbortController()
    revertRiskAbortController = new AbortController()
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

      void feed
        .prefetchMetadata(signal)
        .then((fetchedThumbnails) => {
          if (signal.aborted) return
          patchThumbnails(fetchedThumbnails)
        })
        .catch((err) => {
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

  watch(dismissedRevids, () => {
    slots.value = slots.value.filter(
      (slot) => slot.kind !== 'resolved' || !isDismissed(slot.item.revid),
    )
  })

  watch(searchQuery, () => {
    abortController?.abort()
    abortRevertRiskFetches()
    reset()
    loadedForQuery = ''
  })

  watch(
    [enabled, searchQuery, knownTitles, articlesLoading],
    ([isEnabled, query]) => {
      if (!isEnabled) {
        abortController?.abort()
        abortRevertRiskFetches()
        return
      }

      const trimmed = query.trim()
      if (!trimmed.length) return

      if (loadedForQuery === trimmed && feed) {
        if (!revertRiskAbortController) {
          revertRiskAbortController = new AbortController()
        }
        retryRevertRiskForResolvedSlots()
        return
      }

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
    dismissActivity,
  }
}
