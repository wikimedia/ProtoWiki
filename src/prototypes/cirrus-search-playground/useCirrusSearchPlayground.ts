import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'

import { wikiHostFromLang } from '@/lib/config'
import {
  FetchCirrusSearchError,
  fetchCirrusSearch,
  type CirrusSearchHit,
} from '@/lib/fetchCirrusSearch'

import { buildCirrusQuery, type BuildCirrusQueryResult } from './buildCirrusQuery'
import { computeCompatibility } from './compatibility'
import { loadCirrusSearchFormState, saveCirrusSearchFormState } from './cirrusSearchStorage'
import { DEFAULT_FORM_STATE, type CirrusSearchFormState } from './types'

function wikiArticleUrl(title: string, lang: string): string {
  const slug = encodeURIComponent(title.trim().replace(/ /g, '_'))
  return `https://${wikiHostFromLang(lang)}/wiki/${slug}`
}

function errorMessage(error: unknown): string {
  if (error instanceof FetchCirrusSearchError) {
    if (error.code === 'aborted') return ''
    return error.message
  }
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong. Try again.'
}

export function useCirrusSearchPlayground(): {
  form: Ref<CirrusSearchFormState>
  built: ComputedRef<BuildCirrusQueryResult>
  compatibility: ComputedRef<ReturnType<typeof computeCompatibility>>
  results: Ref<CirrusSearchHit[]>
  totalHits: Ref<number | undefined>
  suggestion: Ref<string | undefined>
  rewrittenQuery: Ref<string | undefined>
  loading: Ref<boolean>
  loadingMore: Ref<boolean>
  error: Ref<string | null>
  hasSearched: Ref<boolean>
  resultsEmpty: ComputedRef<boolean>
  canShowMore: ComputedRef<boolean>
  wikiArticleUrl: (title: string) => string
  runSearch: () => Promise<void>
  loadMore: () => Promise<void>
  copyToClipboard: (text: string) => Promise<void>
} {
  const form = ref<CirrusSearchFormState>(loadCirrusSearchFormState())

  const results = ref<CirrusSearchHit[]>([])
  const totalHits = ref<number | undefined>(undefined)
  const suggestion = ref<string | undefined>(undefined)
  const rewrittenQuery = ref<string | undefined>(undefined)
  const nextOffset = ref<number | undefined>(undefined)
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref<string | null>(null)
  const hasSearched = ref(false)

  let abortController: AbortController | null = null

  const built = computed(() => buildCirrusQuery(form.value))
  const compatibility = computed(() => computeCompatibility(form.value))

  const resultsEmpty = computed(() => hasSearched.value && results.value.length === 0)

  const canShowMore = computed(
    () =>
      hasSearched.value &&
      !resultsEmpty.value &&
      nextOffset.value != null &&
      !loading.value &&
      !loadingMore.value,
  )

  watch(
    form,
    (value) => {
      saveCirrusSearchFormState(value)
    },
    { deep: true },
  )

  async function executeSearch(offset: number, append: boolean): Promise<void> {
    const { apiParams } = built.value
    if (!apiParams.srsearch.trim()) {
      error.value = 'Enter a search query'
      return
    }

    abortController?.abort()
    const controller = new AbortController()
    abortController = controller

    if (append) {
      loadingMore.value = true
    } else {
      loading.value = true
      results.value = []
      nextOffset.value = undefined
      totalHits.value = undefined
      suggestion.value = undefined
      rewrittenQuery.value = undefined
      hasSearched.value = false
    }
    error.value = null

    try {
      const response = await fetchCirrusSearch({
        lang: form.value.lang,
        signal: controller.signal,
        params: {
          ...apiParams,
          sroffset: offset,
        },
      })

      if (controller.signal.aborted) return

      nextOffset.value = response.nextOffset
      totalHits.value = response.totalHits
      suggestion.value = response.suggestion
      rewrittenQuery.value = response.rewrittenQuery

      results.value = append ? [...results.value, ...response.results] : response.results
      hasSearched.value = true
    } catch (err) {
      if (controller.signal.aborted) return
      error.value = errorMessage(err) || 'Could not load results.'
      if (!append) {
        results.value = []
        hasSearched.value = false
      }
    } finally {
      if (abortController === controller) {
        loading.value = false
        loadingMore.value = false
      }
    }
  }

  async function runSearch(): Promise<void> {
    if (loading.value || loadingMore.value) return
    form.value.sroffset = 0
    await executeSearch(0, false)
  }

  async function loadMore(): Promise<void> {
    if (!canShowMore.value || nextOffset.value == null) return
    await executeSearch(nextOffset.value, true)
  }

  async function copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard may be unavailable.
    }
  }

  return {
    form,
    built,
    compatibility,
    results,
    totalHits,
    suggestion,
    rewrittenQuery,
    loading,
    loadingMore,
    error,
    hasSearched,
    resultsEmpty,
    canShowMore,
    wikiArticleUrl: (title: string) => wikiArticleUrl(title, form.value.lang),
    runSearch,
    loadMore,
    copyToClipboard,
  }
}

export { DEFAULT_FORM_STATE }
