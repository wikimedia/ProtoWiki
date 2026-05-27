import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'

import { wikiHostFromLang } from '@/lib/config'
import {
  FetchMorelikeSearchError,
  fetchMorelikeSearch,
  type MorelikeSearchResult,
} from '@/lib/fetchMorelikeSearch'
import { FetchPageThumbnailsBatchError, fetchPageThumbnailsBatch } from '@/lib/fetchPageThumbnailsBatch'
import {
  ResolveWikipediaSearchQueryError,
  resolveWikipediaSearchQuery,
  type ResolveStrategy,
  type ResolvedSeedPage,
} from '@/lib/resolveWikipediaSearchQuery'
import { loadMorelikeSearchInput, saveMorelikeSearchInput } from './morelikeSearchStorage'

const LANG = 'en'
const RESULT_LIMIT = 20

function wikiArticleUrl(title: string, lang = LANG): string {
  const slug = encodeURIComponent(title.trim().replace(/ /g, '_'))
  return `https://${wikiHostFromLang(lang)}/wiki/${slug}`
}

function normalizeTitleKey(title: string): string {
  return title.trim().replace(/_/g, ' ').toLowerCase()
}

function errorMessage(error: unknown): string {
  if (error instanceof ResolveWikipediaSearchQueryError) {
    if (error.code === 'aborted') return ''
    return error.message
  }
  if (error instanceof FetchMorelikeSearchError) {
    if (error.code === 'aborted') return ''
    return error.message
  }
  if (error instanceof FetchPageThumbnailsBatchError) {
    if (error.code === 'aborted') return ''
    return error.message
  }
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong. Try again.'
}

export function useMorelikeSearch(): {
  searchQuery: Ref<string>
  matchedPages: Ref<ResolvedSeedPage[]>
  resolveStrategy: Ref<ResolveStrategy | null>
  resolvedSeeds: Ref<string[]>
  results: Ref<MorelikeSearchResult[]>
  thumbnailsByTitle: Ref<Record<string, string | undefined>>
  loadingResolve: Ref<boolean>
  loading: Ref<boolean>
  loadingMore: Ref<boolean>
  error: Ref<string | null>
  hasSearched: Ref<boolean>
  resultsEmpty: ComputedRef<boolean>
  canSubmit: ComputedRef<boolean>
  canShowMore: ComputedRef<boolean>
  loadingLabel: ComputedRef<string>
  matchedPagesNotice: ComputedRef<string>
  wikiArticleUrl: (title: string) => string
  onSubmit: () => Promise<void>
  onShowMore: () => Promise<void>
} {
  const stored = loadMorelikeSearchInput()
  const searchQuery = ref(stored.searchQuery)

  const matchedPages = ref<ResolvedSeedPage[]>([])
  const resolveStrategy = ref<ResolveStrategy | null>(null)
  const resolvedSeeds = ref<string[]>([])
  const results = ref<MorelikeSearchResult[]>([])
  const thumbnailsByTitle = ref<Record<string, string | undefined>>({})
  const nextOffset = ref<number | undefined>(undefined)
  const loadingResolve = ref(false)
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref<string | null>(null)
  const hasSearched = ref(false)

  let abortController: AbortController | null = null

  watch(searchQuery, () => {
    saveMorelikeSearchInput({ searchQuery: searchQuery.value })
  })

  const resultsEmpty = computed(() => hasSearched.value && results.value.length === 0)

  const canSubmit = computed(
    () =>
      searchQuery.value.trim().length > 0 &&
      !loadingResolve.value &&
      !loading.value &&
      !loadingMore.value,
  )

  const canShowMore = computed(
    () =>
      hasSearched.value &&
      !resultsEmpty.value &&
      nextOffset.value != null &&
      !loading.value &&
      !loadingMore.value &&
      !loadingResolve.value,
  )

  const loadingLabel = computed(() => {
    if (loadingResolve.value) return 'Finding pages…'
    if (loading.value) return 'Finding similar pages…'
    if (loadingMore.value) return 'Loading more…'
    return ''
  })

  const matchedPagesNotice = computed(() => {
    if (!matchedPages.value.length || resolveStrategy.value == null) return ''

    if (resolveStrategy.value === 'title') {
      return 'Resolved as a Wikipedia article title (single best match).'
    }

    const count = matchedPages.value.length
    if (count === 1) {
      return `Top search result for “${searchQuery.value.trim()}”.`
    }

    return `Top ${count} search results for “${searchQuery.value.trim()}”.`
  })

  async function enrichThumbnails(
    newResults: MorelikeSearchResult[],
    signal: AbortSignal,
    reset: boolean,
  ): Promise<void> {
    const titlesToFetch = reset
      ? newResults.map((result) => result.title)
      : newResults
          .map((result) => result.title)
          .filter((title) => !(title in thumbnailsByTitle.value))

    if (!titlesToFetch.length) {
      if (reset) thumbnailsByTitle.value = {}
      return
    }

    const batch = await fetchPageThumbnailsBatch(titlesToFetch, {
      lang: LANG,
      signal,
    })

    thumbnailsByTitle.value = reset
      ? batch
      : { ...thumbnailsByTitle.value, ...batch }
  }

  async function runMorelike(
    seeds: string[],
    offset: number | undefined,
    signal: AbortSignal,
    reset: boolean,
  ): Promise<void> {
    const response = await fetchMorelikeSearch(seeds, {
      lang: LANG,
      limit: RESULT_LIMIT,
      offset,
      signal,
    })

    nextOffset.value = response.nextOffset

    const seen = reset
      ? new Set<string>()
      : new Set(results.value.map((result) => normalizeTitleKey(result.title)))

    const merged = reset ? [] : [...results.value]
    for (const result of response.results) {
      const key = normalizeTitleKey(result.title)
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(result)
    }

    results.value = merged
    await enrichThumbnails(response.results, signal, reset)
    hasSearched.value = true
  }

  async function onSubmit(): Promise<void> {
    if (!canSubmit.value) return

    abortController?.abort()
    const controller = new AbortController()
    abortController = controller

    loadingResolve.value = true
    loading.value = false
    loadingMore.value = false
    error.value = null
    matchedPages.value = []
    resolveStrategy.value = null
    resolvedSeeds.value = []
    results.value = []
    thumbnailsByTitle.value = {}
    nextOffset.value = undefined
    hasSearched.value = false

    try {
      const resolved = await resolveWikipediaSearchQuery(searchQuery.value, {
        lang: LANG,
        signal: controller.signal,
      })

      if (controller.signal.aborted) return

      matchedPages.value = resolved.pages
      resolveStrategy.value = resolved.strategy
      resolvedSeeds.value = resolved.pages.map((page) => page.title)

      loadingResolve.value = false
      loading.value = true

      await runMorelike(resolvedSeeds.value, 0, controller.signal, true)
    } catch (err) {
      if (controller.signal.aborted) return
      error.value = errorMessage(err) || 'Could not load results.'
      matchedPages.value = []
      resolveStrategy.value = null
      resolvedSeeds.value = []
      hasSearched.value = false
    } finally {
      if (abortController === controller) {
        loadingResolve.value = false
        loading.value = false
      }
    }
  }

  async function onShowMore(): Promise<void> {
    if (!canShowMore.value || resolvedSeeds.value.length === 0) return

    abortController?.abort()
    const controller = new AbortController()
    abortController = controller

    loadingMore.value = true
    error.value = null

    try {
      await runMorelike(resolvedSeeds.value, nextOffset.value, controller.signal, false)
    } catch (err) {
      if (controller.signal.aborted) return
      error.value = errorMessage(err) || 'Could not load more results.'
    } finally {
      if (abortController === controller) {
        loadingMore.value = false
      }
    }
  }

  return {
    searchQuery,
    matchedPages,
    resolveStrategy,
    resolvedSeeds,
    results,
    thumbnailsByTitle,
    loadingResolve,
    loading,
    loadingMore,
    error,
    hasSearched,
    resultsEmpty,
    canSubmit,
    canShowMore,
    loadingLabel,
    matchedPagesNotice,
    wikiArticleUrl,
    onSubmit,
    onShowMore,
  }
}
