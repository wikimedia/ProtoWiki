import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'

import { useConfig } from '@/composables/useConfig'
import { parsePageList, wikiHostFromLang } from '@/lib/config'
import {
  FetchMorelikeSearchError,
  fetchMorelikeSearch,
  type MorelikeSearchResult,
} from '@/lib/fetchMorelikeSearch'
import { FetchPageThumbnailsBatchError, fetchPageThumbnailsBatch } from '@/lib/fetchPageThumbnailsBatch'
import {
  FetchUserEditedPageTitlesError,
  fetchUserEditedPageTitles,
  MAX_SEED_PAGES,
} from '@/lib/fetchUserEditedPageTitles'
import {
  loadMorelikeSearchInput,
  saveMorelikeSearchInput,
  type MorelikeInputMode,
} from './morelikeSearchStorage'

export type { MorelikeInputMode }

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
  if (error instanceof FetchMorelikeSearchError) {
    if (error.code === 'aborted') return ''
    return error.message
  }
  if (error instanceof FetchUserEditedPageTitlesError) {
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
  inputMode: Ref<MorelikeInputMode>
  inputModeOptions: { value: MorelikeInputMode; label: string }[]
  seedPagesInput: Ref<string>
  username: Ref<string>
  resolvedSeeds: Ref<string[]>
  results: Ref<MorelikeSearchResult[]>
  thumbnailsByTitle: Ref<Record<string, string | undefined>>
  loadingHistory: Ref<boolean>
  loading: Ref<boolean>
  loadingMore: Ref<boolean>
  error: Ref<string | null>
  hasSearched: Ref<boolean>
  resultsEmpty: ComputedRef<boolean>
  canSubmit: ComputedRef<boolean>
  canShowMore: ComputedRef<boolean>
  loadingLabel: ComputedRef<string>
  wikiArticleUrl: (title: string) => string
  onSubmit: () => Promise<void>
  onShowMore: () => Promise<void>
} {
  const { realUsername } = useConfig()

  const stored = loadMorelikeSearchInput()
  const inputMode = ref<MorelikeInputMode>(stored.inputMode)
  const seedPagesInput = ref(stored.seedPagesInput)
  const username = ref(stored.username.trim() ? stored.username : realUsername.value)
  const resolvedSeeds = ref<string[]>([])
  const results = ref<MorelikeSearchResult[]>([])
  const thumbnailsByTitle = ref<Record<string, string | undefined>>({})
  const nextOffset = ref<number | undefined>(undefined)
  const loadingHistory = ref(false)
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref<string | null>(null)
  const hasSearched = ref(false)

  let abortController: AbortController | null = null

  const inputModeOptions = [
    { value: 'manual' as const, label: 'Enter pages manually' },
    { value: 'userEdits' as const, label: 'User editing history' },
  ]

  watch(realUsername, (name) => {
    if (!username.value.trim() && name.trim()) {
      username.value = name
    }
  })

  watch([inputMode, seedPagesInput, username], () => {
    saveMorelikeSearchInput({
      inputMode: inputMode.value,
      seedPagesInput: seedPagesInput.value,
      username: username.value,
    })
  })

  const resultsEmpty = computed(() => hasSearched.value && results.value.length === 0)

  const canSubmit = computed(
    () =>
      !loadingHistory.value &&
      !loading.value &&
      !loadingMore.value &&
      (inputMode.value === 'manual'
        ? seedPagesInput.value.trim().length > 0
        : username.value.trim().length > 0),
  )

  const canShowMore = computed(
    () =>
      hasSearched.value &&
      !resultsEmpty.value &&
      nextOffset.value != null &&
      !loading.value &&
      !loadingMore.value &&
      !loadingHistory.value,
  )

  const loadingLabel = computed(() => {
    if (loadingHistory.value) return 'Loading edit history…'
    if (loading.value) return 'Searching…'
    if (loadingMore.value) return 'Loading more…'
    return ''
  })

  function resetResults(): void {
    results.value = []
    thumbnailsByTitle.value = {}
    resolvedSeeds.value = []
    nextOffset.value = undefined
    hasSearched.value = false
    error.value = null
  }

  watch(inputMode, () => {
    abortController?.abort()
    resetResults()
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

  async function resolveSeeds(signal: AbortSignal): Promise<string[]> {
    if (inputMode.value === 'manual') {
      const seeds = parsePageList(seedPagesInput.value)
      if (!seeds.length) {
        throw new FetchMorelikeSearchError('Enter at least one seed page', 'empty_seeds')
      }
      return seeds
    }

    loadingHistory.value = true
    try {
      return await fetchUserEditedPageTitles(username.value, {
        lang: LANG,
        limit: MAX_SEED_PAGES,
        signal,
      })
    } finally {
      loadingHistory.value = false
    }
  }

  async function runSearch(
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

    loading.value = true
    error.value = null
    results.value = []
    thumbnailsByTitle.value = {}
    resolvedSeeds.value = []
    nextOffset.value = undefined
    hasSearched.value = false

    try {
      const seeds = await resolveSeeds(controller.signal)
      resolvedSeeds.value = seeds
      await runSearch(seeds, 0, controller.signal, true)
    } catch (err) {
      if (controller.signal.aborted) return
      error.value = errorMessage(err) || 'Could not load results.'
      hasSearched.value = false
    } finally {
      if (abortController === controller) {
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
      await runSearch(resolvedSeeds.value, nextOffset.value, controller.signal, false)
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
    inputMode,
    inputModeOptions,
    seedPagesInput,
    username,
    resolvedSeeds,
    results,
    thumbnailsByTitle,
    loadingHistory,
    loading,
    loadingMore,
    error,
    hasSearched,
    resultsEmpty,
    canSubmit,
    canShowMore,
    loadingLabel,
    wikiArticleUrl,
    onSubmit,
    onShowMore,
  }
}
