import { computed, ref, shallowRef, watch, type Ref } from 'vue'

import {
  drainMorelikeRoundRobin,
  enrichTitleHits,
  fetchWikitabSearchArticlesMore,
  fetchWikitabSearchArticlesRelated,
  fetchWikitabSearchTextMatch,
  resolveWikitabSearchTitleHits,
  type MorelikeSeedState,
  type WikitabSearchArticle,
} from './data/fetchWikitabSearchArticles'

export function useWikitabSearchResults(searchQuery: Ref<string>) {
  const curated = shallowRef<WikitabSearchArticle[]>([])
  const related = shallowRef<WikitabSearchArticle[]>([])
  const morelikeState = shallowRef<MorelikeSeedState[]>([])
  const loading = ref(false)
  const loadingRelated = ref(false)
  const loadingMore = ref(false)
  let abortController: AbortController | null = null

  const hasMore = computed(() =>
    morelikeState.value.some(
      (seed) => seed.nextOffset !== null || seed.pending.length > 0,
    ),
  )

  const articles = computed(() => [...curated.value, ...related.value])

  function allSeenPageids(): Set<number> {
    return new Set(articles.value.map((item) => item.pageid))
  }

  function reset(): void {
    curated.value = []
    related.value = []
    morelikeState.value = []
  }

  function appendCurated(article: WikitabSearchArticle): void {
    curated.value = [...curated.value, article]
  }

  async function loadInitial(query: string): Promise<void> {
    abortController?.abort()
    abortController = new AbortController()
    const { signal } = abortController
    const fetchQuery = query

    loading.value = true
    loadingRelated.value = false
    reset()

    try {
      const seen = new Set<number>()

      const { trimmed, exactHit, nearHits } = await resolveWikitabSearchTitleHits(query, {
        signal,
      })
      if (signal.aborted || searchQuery.value.trim() !== fetchQuery) return

      const titleHitsToEnrich = [
        ...(exactHit ? [exactHit] : []),
        ...nearHits,
      ]

      if (titleHitsToEnrich.length) {
        const relationByPageid = new Map<number, 'exact' | 'near'>()
        if (exactHit) relationByPageid.set(exactHit.id, 'exact')
        for (const hit of nearHits) relationByPageid.set(hit.id, 'near')

        const titleArticles = await enrichTitleHits(titleHitsToEnrich, relationByPageid, signal)
        if (signal.aborted || searchQuery.value.trim() !== fetchQuery) return

        const exactArticles = titleArticles.filter((article) => article.relation === 'exact')
        const nearArticles = titleArticles.filter((article) => article.relation === 'near')

        for (const article of exactArticles) {
          if (seen.has(article.pageid)) continue
          seen.add(article.pageid)
          appendCurated(article)
        }

        for (const article of nearArticles) {
          if (seen.has(article.pageid)) continue
          seen.add(article.pageid)
          appendCurated(article)
        }
      }

      const match = await fetchWikitabSearchTextMatch(trimmed, seen, signal)
      if (signal.aborted || searchQuery.value.trim() !== fetchQuery) return

      if (match) {
        seen.add(match.pageid)
        appendCurated(match)
      }

      loading.value = false

      loadingRelated.value = true
      const relatedResult = await fetchWikitabSearchArticlesRelated(curated.value, { signal })
      if (signal.aborted || searchQuery.value.trim() !== fetchQuery) return

      related.value = relatedResult.related
      morelikeState.value = relatedResult.morelikeState
    } catch (err) {
      if (signal.aborted || (err as Error)?.name === 'AbortError') return
      reset()
    } finally {
      if (!signal.aborted && searchQuery.value.trim() === fetchQuery) {
        loading.value = false
        loadingRelated.value = false
      }
    }
  }

  async function loadMore(): Promise<void> {
    if (loadingMore.value || loading.value || !hasMore.value) return

    const seeds = morelikeState.value
    const seed = seeds[0]

    if (!seed) return
    if (seed.nextOffset === null && !seed.pending.length) return

    loadingMore.value = true

    try {
      if (seed.nextOffset !== null) {
        const batch = await fetchWikitabSearchArticlesMore(
          seed.seedTitle,
          seed.nextOffset,
          allSeenPageids(),
          { signal: abortController?.signal },
        )

        if (abortController?.signal.aborted) return

        const seen = allSeenPageids()
        seed.pending.push(...batch.articles.filter((item) => !seen.has(item.pageid)))
        seed.nextOffset = batch.nextOffset
      }

      if (abortController?.signal.aborted) return

      const seen = allSeenPageids()
      const fresh = drainMorelikeRoundRobin(seeds, seen)
      if (fresh.length) {
        related.value = [...related.value, ...fresh]
      }
      morelikeState.value = [...seeds]
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
        loadingRelated.value = false
        loadingMore.value = false
        return
      }
      void loadInitial(trimmed)
    },
    { immediate: true },
  )

  return {
    curated,
    related,
    articles,
    loading,
    loadingRelated,
    loadingMore,
    hasMore,
    loadMore,
  }
}
