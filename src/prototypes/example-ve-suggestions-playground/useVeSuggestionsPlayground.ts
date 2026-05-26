import { computed, onMounted, ref } from 'vue'

import {
  createVeSuggestionsWiki,
  getCachedRun,
  loadUiState,
  normalizePageTitle,
  runVeSuggestionsPipeline,
  saveUiState,
  VE_METHOD_COUNT,
  type CachedVeSuggestionsRun,
  type SuggestionCardData,
} from '@/lib/ve-suggestions'
import {
  cardsFromCachedRun,
  methodErrorsFromResults,
} from '@/lib/ve-suggestions/runVeSuggestionsPipeline'

export interface VeSuggestionsCacheMeta {
  fromCache: boolean
  fetchedAt?: number
}

const wiki = createVeSuggestionsWiki('en', 've-suggestions-playground')

export function useVeSuggestionsPlayground(): {
  pageTitle: ReturnType<typeof ref<string>>
  cards: ReturnType<typeof ref<SuggestionCardData[]>>
  methodErrors: ReturnType<typeof ref<Array<{ methodName: string; message: string }>>>
  progress: ReturnType<typeof ref<{ completed: number; total: number }>>
  loading: ReturnType<typeof ref<boolean>>
  error: ReturnType<typeof ref<string | null>>
  cacheMeta: ReturnType<typeof ref<VeSuggestionsCacheMeta>>
  hasRun: ReturnType<typeof ref<boolean>>
  primaryButtonLabel: ReturnType<typeof computed<string>>
  onPrimaryAction: () => Promise<void>
} {
  const pageTitle = ref('Wet Leg')
  const cards = ref<SuggestionCardData[]>([])
  const methodErrors = ref<Array<{ methodName: string; message: string }>>([])
  const progress = ref({ completed: 0, total: VE_METHOD_COUNT })
  const loading = ref(false)
  const error = ref<string | null>(null)
  const cacheMeta = ref<VeSuggestionsCacheMeta>({ fromCache: false })
  const hasRun = ref(false)
  const loadedPageTitle = ref<string | null>(null)

  const trimmedInputTitle = computed(() => normalizePageTitle(pageTitle.value))

  const showsResultsForInput = computed(
    () =>
      hasRun.value &&
      loadedPageTitle.value !== null &&
      trimmedInputTitle.value.length > 0 &&
      trimmedInputTitle.value === loadedPageTitle.value,
  )

  const primaryButtonLabel = computed(() =>
    showsResultsForInput.value ? 'Refresh' : 'Load',
  )

  function applyCachedRun(run: CachedVeSuggestionsRun): void {
    cards.value = cardsFromCachedRun(wiki, run)
    methodErrors.value = methodErrorsFromResults(run.methodResults)
    progress.value = {
      completed: Object.keys(run.methodResults).length,
      total: VE_METHOD_COUNT,
    }
    hasRun.value = true
    loadedPageTitle.value = normalizePageTitle(run.pageTitle)
    cacheMeta.value = { fromCache: true, fetchedAt: run.fetchedAt }
  }

  onMounted(() => {
    const ui = loadUiState()
    pageTitle.value = ui.pageTitle

    const cached = getCachedRun(ui.pageTitle)
    if (cached) {
      applyCachedRun(cached)
    }
  })

  async function runNetworkPipeline(forceRefresh: boolean): Promise<void> {
    const trimmed = normalizePageTitle(pageTitle.value)
    if (!trimmed.length) {
      error.value = 'Please enter a page title.'
      return
    }

    saveUiState({ pageTitle: trimmed, lastViewedAt: Date.now() })

    if (!forceRefresh) {
      const cached = getCachedRun(trimmed)
      if (cached) {
        applyCachedRun(cached)
        error.value = null
        return
      }
    }

    loading.value = true
    error.value = null
    hasRun.value = false
    loadedPageTitle.value = null
    cards.value = []
    methodErrors.value = []
    progress.value = { completed: 0, total: VE_METHOD_COUNT }
    cacheMeta.value = { fromCache: false }

    try {
      const result = await runVeSuggestionsPipeline(wiki, trimmed, {
        forceRefresh,
        onProgress: (value) => {
          progress.value = value
        },
      })

      cards.value = result.cards
      methodErrors.value = result.methodErrors
      error.value = result.error

      if (result.error && !result.cards.length) {
        return
      }

      hasRun.value = true
      loadedPageTitle.value = result.pageTitle
      cacheMeta.value = {
        fromCache: result.fromCache,
        fetchedAt: result.fetchedAt,
      }
      progress.value = {
        completed: VE_METHOD_COUNT,
        total: VE_METHOD_COUNT,
      }
    } finally {
      loading.value = false
    }
  }

  async function onPrimaryAction(): Promise<void> {
    if (showsResultsForInput.value) {
      await runNetworkPipeline(true)
    } else {
      await runNetworkPipeline(false)
    }
  }

  return {
    pageTitle,
    cards,
    methodErrors,
    progress,
    loading,
    error,
    cacheMeta,
    hasRun,
    primaryButtonLabel,
    onPrimaryAction,
  }
}
