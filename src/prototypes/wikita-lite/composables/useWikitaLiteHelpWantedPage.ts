import { computed, onMounted, ref } from 'vue'

import { listBookmarks } from '../../musical-group/data/bookmarks'
import { bookmarksKey } from '../../musical-group/data/cacheKeys'
import { fetchSavedItemSummaries } from '../../musical-group/data/fetchSavedItemSummaries'
import { getCachedSavedSummaries } from '../../musical-group/data/homeTabCache'
import type { HomeSavedItem } from '../../musical-group/data/types'
import { useContributeSuggestionsFeed } from '../../musical-group/useContributeSuggestionsFeed'
import { useViewportInfiniteScroll } from './useViewportInfiniteScroll'

export function useWikitaLiteHelpWantedPage() {
  const bookmarkEntries = listBookmarks()
  const dependencyKey = bookmarksKey()
  const cachedSummaries = getCachedSavedSummaries(dependencyKey)

  const savedItems = ref<HomeSavedItem[]>(cachedSummaries ?? [])
  const savedItemsLoading = ref(Boolean(bookmarkEntries.length && !cachedSummaries?.length))
  const pageActive = ref(!bookmarkEntries.length || Boolean(cachedSummaries?.length))
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
    if (bookmarkEntries.length) {
      try {
        savedItems.value = await fetchSavedItemSummaries(bookmarkEntries)
      } catch {
        if (!savedItems.value.length) savedItems.value = []
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
