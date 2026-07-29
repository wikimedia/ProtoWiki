import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import { listBookmarks } from '../../musical-group/data/bookmarks'
import { fetchSavedItemSummaries } from '../../musical-group/data/fetchSavedItemSummaries'
import type { HomeSavedItem } from '../../musical-group/data/types'
import { useContributeSuggestionsFeed } from '../../musical-group/useContributeSuggestionsFeed'

function useViewportInfiniteScroll(options: {
  sentinel: { value: HTMLElement | null }
  active: { value: boolean }
  hasMore: { value: boolean }
  loading: { value: boolean }
  loadMore: () => void | Promise<void>
}): void {
  let observer: IntersectionObserver | null = null

  function disconnect(): void {
    observer?.disconnect()
    observer = null
  }

  function connect(): void {
    disconnect()
    const target = options.sentinel.value
    if (!target || !options.active.value) return

    observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        if (!options.active.value || options.loading.value || !options.hasMore.value) return
        void options.loadMore()
      },
      { rootMargin: '120px' },
    )
    observer.observe(target)
  }

  watch(
    () => [options.sentinel.value, options.active.value] as const,
    () => connect(),
    { flush: 'post' },
  )

  watch(
    () => options.loading.value,
    (isLoading, wasLoading) => {
      if (!wasLoading || isLoading) return
      requestAnimationFrame(() => connect())
    },
  )

  onUnmounted(disconnect)
}

export function useWikitaLiteHelpWantedPage() {
  const savedItems = ref<HomeSavedItem[]>([])
  const savedItemsLoading = ref(true)
  const pageActive = ref(false)
  const loadSentinel = ref<HTMLElement | null>(null)

  const {
    savedSuggestions,
    savedLoading,
    relatedSuggestions,
    relatedLoading,
    relatedHasMore,
    loadMoreRelated,
  } = useContributeSuggestionsFeed(savedItems, pageActive)

  useViewportInfiniteScroll({
    sentinel: loadSentinel,
    active: pageActive,
    hasMore: relatedHasMore,
    loading: relatedLoading,
    loadMore: loadMoreRelated,
  })

  onMounted(async () => {
    const entries = listBookmarks()
    if (entries.length) {
      try {
        savedItems.value = await fetchSavedItemSummaries(entries)
      } catch {
        savedItems.value = []
      }
    }
    savedItemsLoading.value = false
    pageActive.value = true
  })

  const helpWanted = computed(() => [
    ...savedSuggestions.value,
    ...relatedSuggestions.value,
  ])

  const helpWantedLoading = computed(
    () =>
      savedItemsLoading.value ||
      ((savedLoading.value || relatedLoading.value) && helpWanted.value.length === 0),
  )

  const helpWantedLoadingMore = computed(
    () => helpWanted.value.length > 0 && (savedLoading.value || relatedLoading.value),
  )

  return {
    helpWanted,
    helpWantedLoading,
    helpWantedLoadingMore,
    loadSentinel,
  }
}
