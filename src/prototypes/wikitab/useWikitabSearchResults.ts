import { computed, ref, shallowRef, watch, type Ref } from 'vue'

import {
  fetchWikitabSearchArticlesInitial,
  fetchWikitabSearchArticlesMore,
  type WikitabSearchArticle,
} from './data/fetchWikitabSearchArticles'

export function useWikitabSearchResults(searchQuery: Ref<string>) {
  const exact = shallowRef<WikitabSearchArticle | null>(null)
  const related = shallowRef<WikitabSearchArticle[]>([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const nextOffset = ref<number | null>(null)
  const seedTitle = ref<string | null>(null)
  const seedPageid = ref<number | null>(null)

  let abortController: AbortController | null = null

  const hasMore = computed(() => nextOffset.value !== null)

  const articles = computed(() => {
    const list: WikitabSearchArticle[] = []
    if (exact.value) list.push(exact.value)
    list.push(...related.value)
    return list
  })

  function reset(): void {
    exact.value = null
    related.value = []
    nextOffset.value = null
    seedTitle.value = null
    seedPageid.value = null
  }

  async function loadInitial(query: string): Promise<void> {
    abortController?.abort()
    abortController = new AbortController()
    const { signal } = abortController

    loading.value = true
    reset()

    try {
      const result = await fetchWikitabSearchArticlesInitial(query, { signal })
      if (signal.aborted) return

      exact.value = result.exact
      related.value = result.related
      nextOffset.value = result.nextOffset
      seedTitle.value = result.seedTitle
      seedPageid.value = result.exact?.pageid ?? null
    } catch (err) {
      if (signal.aborted || (err as Error)?.name === 'AbortError') return
      reset()
    } finally {
      if (!signal.aborted) loading.value = false
    }
  }

  async function loadMore(): Promise<void> {
    if (loadingMore.value || loading.value || !hasMore.value) return
    if (seedTitle.value === null || nextOffset.value === null) return

    const offset = nextOffset.value
    loadingMore.value = true

    try {
      const batch = await fetchWikitabSearchArticlesMore(
        seedTitle.value,
        seedPageid.value,
        offset,
        { signal: abortController?.signal },
      )

      if (abortController?.signal.aborted) return

      const seen = new Set([
        ...(exact.value ? [exact.value.pageid] : []),
        ...related.value.map((item) => item.pageid),
      ])

      const fresh = batch.articles.filter((item) => !seen.has(item.pageid))
      related.value = [...related.value, ...fresh]
      nextOffset.value = batch.nextOffset
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
    } finally {
      loadingMore.value = false
    }
  }

  watch(
    searchQuery,
    (query) => {
      const trimmed = query.trim()
      if (!trimmed.length) {
        abortController?.abort()
        reset()
        loading.value = false
        loadingMore.value = false
        return
      }
      void loadInitial(trimmed)
    },
    { immediate: true },
  )

  return {
    exact,
    related,
    articles,
    loading,
    loadingMore,
    hasMore,
    loadMore,
  }
}
