import { ref, shallowRef, watch, type Ref } from 'vue'

import {
  fetchWikitabSearchImages,
  type WikitabSearchImage,
  type WikitabSearchImagesContinue,
} from './data/fetchWikitabSearchImages'
import { useWikitabHiddenImages } from './useWikitabHiddenImages'
import { resetWikitabSearchImageDecode } from './useWikitabSearchImageDecode'

export function useWikitabSearchImages(searchQuery: Ref<string>, enabled: Ref<boolean>) {
  const { hiddenPageIds, isHidden, hideImage: persistHiddenImage } = useWikitabHiddenImages()

  const images = shallowRef<WikitabSearchImage[]>([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const hasMore = ref(false)

  let continueParams: WikitabSearchImagesContinue | null = null
  let abortController: AbortController | null = null
  let loadedForQuery = ''

  function filterHidden(items: WikitabSearchImage[]): WikitabSearchImage[] {
    if (!hiddenPageIds.value.length) return items
    return items.filter((item) => !isHidden(item.pageid))
  }

  function reset(): void {
    images.value = []
    loading.value = false
    loadingMore.value = false
    hasMore.value = false
    continueParams = null
    resetWikitabSearchImageDecode()
  }

  function appendImages(fresh: WikitabSearchImage[]): void {
    const visible = filterHidden(fresh)
    if (!visible.length) return

    const seen = new Set(images.value.map((item) => item.pageid))
    const next = visible.filter((item) => !seen.has(item.pageid))
    if (next.length) {
      images.value = [...images.value, ...next]
    }
  }

  function hideImage(pageid: number): void {
    persistHiddenImage(pageid)
    images.value = images.value.filter((item) => item.pageid !== pageid)
  }

  async function loadInitial(query: string): Promise<void> {
    abortController?.abort()
    abortController = new AbortController()
    const { signal } = abortController
    const fetchQuery = query

    loading.value = true
    reset()
    loading.value = true

    try {
      const result = await fetchWikitabSearchImages(fetchQuery, { signal })
      if (signal.aborted || searchQuery.value.trim() !== fetchQuery) return

      images.value = filterHidden(result.images)
      continueParams = result.continueParams
      hasMore.value = continueParams !== null
      loadedForQuery = fetchQuery
    } catch (err) {
      if (signal.aborted || (err as Error)?.name === 'AbortError') return
      reset()
      loadedForQuery = ''
    } finally {
      if (!signal.aborted && searchQuery.value.trim() === fetchQuery) {
        loading.value = false
      }
    }
  }

  async function loadMore(): Promise<void> {
    if (loading.value || loadingMore.value || !hasMore.value || !continueParams) return

    const query = searchQuery.value.trim()
    if (!query.length || loadedForQuery !== query) return

    loadingMore.value = true
    const params = continueParams

    try {
      const result = await fetchWikitabSearchImages(query, {
        signal: abortController?.signal,
        continueParams: params,
      })

      if (abortController?.signal.aborted) return
      if (searchQuery.value.trim() !== query) return

      appendImages(result.images)
      continueParams = result.continueParams
      hasMore.value = continueParams !== null
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
      hasMore.value = false
      continueParams = null
    } finally {
      loadingMore.value = false
    }
  }

  watch(searchQuery, () => {
    abortController?.abort()
    reset()
    loadedForQuery = ''
  })

  watch(hiddenPageIds, () => {
    images.value = images.value.filter((item) => !isHidden(item.pageid))
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
      if (loadedForQuery === trimmed) return
      void loadInitial(trimmed)
    },
    { immediate: true },
  )

  return {
    images,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    hideImage,
  }
}
