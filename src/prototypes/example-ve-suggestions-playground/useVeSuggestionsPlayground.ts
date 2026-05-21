import { computed, onMounted, ref } from 'vue'

import { FakeWiki, FakeWikiHttpError } from 'fakewiki'

import {
  buildFallbackCard,
  buildSectionRanges,
  buildSectionTitleMap,
  buildSuggestionCard,
  hydrateCardsFromSnippetCache,
  sortCards,
  type SuggestionCardData,
} from './veSuggestionCards'
import { VE_METHOD_COUNT, VE_METHODS } from './veMethods'
import {
  getCachedRun,
  loadUiState,
  normalizePageTitle,
  saveUiState,
  setCachedRun,
  type CachedMethodResult,
  type CachedVeSuggestionsRun,
} from './veSuggestionsCache'

export interface VeSuggestionsCacheMeta {
  fromCache: boolean
  fetchedAt?: number
}

const wiki = new FakeWiki(undefined, {
  apiUserAgent:
    'ProtoWiki/0.1 (https://github.com/wikimedia-research/protowiki) ve-suggestions-playground',
})

function wrapGetPageSource(prefetchedByTitle: Map<string, string>): () => void {
  const original = wiki.getPageSource.bind(wiki)

  wiki.getPageSource = async (pageName: string): Promise<string> => {
    const key = normalizePageTitle(pageName)
    const cached = prefetchedByTitle.get(key)
    if (cached !== undefined) return cached
    const source = await original(pageName)
    prefetchedByTitle.set(key, source)
    return source
  }

  return () => {
    wiki.getPageSource = original
  }
}

function cardsFromMethodResults(
  pageTitle: string,
  methodResults: Record<string, CachedMethodResult>,
  snippetHtmlByKey: Record<string, string>,
): SuggestionCardData[] {
  const cards: SuggestionCardData[] = []

  for (const method of VE_METHODS) {
    const result = methodResults[method.methodName]
    if (!result || result.ok === false) continue
    const response = result.response
    for (let index = 0; index < response.suggestions.length; index++) {
      const suggestion = response.suggestions[index]
      if (!suggestion) continue
      cards.push(
        buildFallbackCard(wiki, method.methodName, pageTitle, response, suggestion, index, snippetHtmlByKey),
      )
    }
  }

  return sortCards(cards)
}

function methodErrorsFromResults(
  methodResults: Record<string, CachedMethodResult>,
): Array<{ methodName: string; message: string }> {
  const methodErrors: Array<{ methodName: string; message: string }> = []
  for (const method of VE_METHODS) {
    const result = methodResults[method.methodName]
    if (result?.ok === false) {
      methodErrors.push({ methodName: method.methodName, message: result.error })
    }
  }
  return methodErrors
}

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
    const snippetHtmlByKey = run.snippetHtmlByKey ?? {}
    cards.value =
      run.cards?.length ?
        sortCards(hydrateCardsFromSnippetCache(run.cards, run.pageTitle, snippetHtmlByKey))
      : cardsFromMethodResults(run.pageTitle, run.methodResults, snippetHtmlByKey)
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

    const existingCache = getCachedRun(trimmed)
    const run: CachedVeSuggestionsRun = {
      fetchedAt: Date.now(),
      pageTitle: trimmed,
      pageSource: existingCache?.pageSource,
      methodResults: forceRefresh ? {} : { ...(existingCache?.methodResults ?? {}) },
      cards: [],
      snippetHtmlByKey: forceRefresh ? {} : { ...(existingCache?.snippetHtmlByKey ?? {}) },
    }

    const pageSourceCache = new Map<string, string>()
    if (run.pageSource) {
      pageSourceCache.set(trimmed, run.pageSource)
    }

    let restoreGetPageSource = wrapGetPageSource(pageSourceCache)

    try {
      if (!run.pageSource) {
        try {
          run.pageSource = await wiki.getPageSource(trimmed)
          pageSourceCache.set(trimmed, run.pageSource)
          setCachedRun(trimmed, { ...run })
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : String(caught)
          error.value = `Could not load page source: ${message}`
          return
        }
      }

      const sectionTitleMap = buildSectionTitleMap(run.pageSource)
      const sectionRanges = buildSectionRanges(run.pageSource)
      const snippetHtmlCache = run.snippetHtmlByKey ?? {}

      let completed = 0
      let abortedForRateLimit = false

      for (const method of VE_METHODS) {
        if (abortedForRateLimit) break

        try {
          const response = await method.run(wiki, trimmed)
          run.methodResults[method.methodName] = { ok: true, response }

          for (let index = 0; index < response.suggestions.length; index++) {
            const suggestion = response.suggestions[index]
            if (!suggestion) continue
            const card = await buildSuggestionCard(
              wiki,
              method.methodName,
              trimmed,
              response,
              suggestion,
              index,
              sectionTitleMap,
              sectionRanges,
              run.pageSource ?? '',
              snippetHtmlCache,
            )
            run.cards = [...(run.cards ?? []), card]
          }
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : String(caught)
          run.methodResults[method.methodName] = { ok: false, error: message }

          if (caught instanceof FakeWikiHttpError && caught.status === 429) {
            error.value = message
            abortedForRateLimit = true
          }
        }

        completed += 1
        progress.value = { completed, total: VE_METHOD_COUNT }

        run.fetchedAt = Date.now()
        run.snippetHtmlByKey = snippetHtmlCache
        run.cards = sortCards(run.cards ?? [])
        setCachedRun(trimmed, {
          ...run,
          methodResults: { ...run.methodResults },
          cards: [...(run.cards ?? [])],
          snippetHtmlByKey: { ...snippetHtmlCache },
        })

        cards.value = sortCards(
          hydrateCardsFromSnippetCache(run.cards ?? [], trimmed, snippetHtmlCache),
        )
        methodErrors.value = methodErrorsFromResults(run.methodResults)
      }

      hasRun.value = true
      loadedPageTitle.value = trimmed
      cacheMeta.value = { fromCache: false, fetchedAt: run.fetchedAt }
    } finally {
      restoreGetPageSource()
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
