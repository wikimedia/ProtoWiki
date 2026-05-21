import { computed, ref, watch, type ComputedRef } from 'vue'

import { useConfig } from '@/composables/useConfig'
import {
  dashpageSuggestionUserKey,
  getDashpageSuggestionModuleCache,
  resolvePortfolioPage,
  setDashpageSuggestionModuleCache,
} from '@/lib/dashpageSuggestionCache'
import { getPortfolioCache, setPortfolioCache } from '@/lib/dashpagePortfolioCache'
import {
  FetchUserEditedPageTitlesError,
  fetchPagePreviewMetadata,
  fetchUserEditedPageTitles,
} from '@/lib/fetchUserEditedPageTitles'
import {
  cardsFromCachedRun,
  createVeSuggestionsWiki,
  changeSizeForSuggestionType,
  editUrlForSuggestionCard,
  getCachedRun,
  pickRandomSuggestion,
  runVeSuggestionsPipeline,
  shouldShowSnippet,
  type SuggestionCardData,
} from '@/lib/ve-suggestions'

const wiki = createVeSuggestionsWiki('dashpage-suggestion-mode')

const DASHPAGE_EXCLUDED_SUGGESTION_TYPES = new Set(['redirect'])

function filterDashpageSuggestions(cards: SuggestionCardData[]): SuggestionCardData[] {
  return cards.filter((card) => !DASHPAGE_EXCLUDED_SUGGESTION_TYPES.has(card.suggestionType))
}

export interface SuggestionModeModuleBind {
  articleTitle?: string
  articleShortDescription?: string
  thumbnailSrc?: string
  taskTypeLabel?: string
  snippetHtml?: string
  loadPending?: boolean
  showRefresh?: boolean
  refreshing?: boolean
  refreshError?: string | null
  emptyMessage?: string | null
  totalSuggestionCount?: number
  taskDifficulty?: 'easy' | 'medium' | 'hard'
  editHref?: string
}

function previewFromCards(
  pageTitle: string,
  cards: SuggestionCardData[],
  pagePreview: { thumbnailSrc?: string; shortDescription?: string } = {},
): SuggestionModeModuleBind {
  const eligibleCards = filterDashpageSuggestions(cards)
  const totalSuggestionCount = eligibleCards.length
  const selectedCard = pickRandomSuggestion(eligibleCards)

  if (!selectedCard) {
    return {
      articleTitle: pageTitle,
      emptyMessage: `No suggestions for ${pageTitle}.`,
      showRefresh: true,
    }
  }

  return {
    articleTitle: pageTitle,
    articleShortDescription: pagePreview.shortDescription,
    thumbnailSrc: pagePreview.thumbnailSrc,
    taskTypeLabel: selectedCard.heading,
    taskDifficulty: changeSizeForSuggestionType(selectedCard.suggestionType),
    snippetHtml: shouldShowSnippet(selectedCard) ? selectedCard.renderedSnippetHtml : undefined,
    editHref: editUrlForSuggestionCard(wiki, pageTitle, selectedCard),
    showRefresh: true,
    totalSuggestionCount,
  }
}

function previewForCachedPage(
  pageTitle: string,
  pagePreview: { thumbnailSrc?: string; shortDescription?: string } = {},
): SuggestionModeModuleBind {
  const veRun = getCachedRun(pageTitle)
  if (!veRun) {
    return {
      articleTitle: pageTitle,
      emptyMessage: `No suggestions for ${pageTitle}.`,
      showRefresh: true,
    }
  }

  return previewFromCards(pageTitle, cardsFromCachedRun(wiki, veRun), pagePreview)
}

export function useDashpageSuggestionModule(): {
  moduleProps: ComputedRef<SuggestionModeModuleBind>
  onSuggestionLoad: () => void
  onSuggestionRefresh: () => void
} {
  const { user, realUsername, currentUserPageLists } = useConfig()

  const loading = ref(false)
  const error = ref<string | null>(null)
  const hasCache = ref(false)
  const lastFetchedAt = ref<number | null>(null)
  const selectedPageTitle = ref<string | null>(null)
  const preview = ref<SuggestionModeModuleBind>({})
  const cachedRealTitles = ref<string[]>([])

  let abortController: AbortController | null = null

  function loadFromModuleCache(userKey: string): void {
    const cached = getDashpageSuggestionModuleCache(userKey)
    if (!cached) {
      hasCache.value = false
      lastFetchedAt.value = null
      selectedPageTitle.value = null
      preview.value = {}
      return
    }

    hasCache.value = true
    lastFetchedAt.value = cached.fetchedAt
    selectedPageTitle.value = cached.selectedPageTitle
    preview.value = previewForCachedPage(cached.selectedPageTitle, {
      thumbnailSrc: cached.thumbnailSrc,
      shortDescription: cached.shortDescription,
    })
    error.value = null
  }

  function loadRealPortfolioFromCache(): void {
    if (user.value !== 'real') {
      cachedRealTitles.value = []
      return
    }

    const portfolio = getPortfolioCache(realUsername.value)
    cachedRealTitles.value = portfolio?.titles ?? []
  }

  watch(
    [user, realUsername],
    ([activeUser, username]) => {
      error.value = null
      loadRealPortfolioFromCache()
      loadFromModuleCache(dashpageSuggestionUserKey(activeUser, username))
    },
    { immediate: true },
  )

  async function runPipeline(forceRefresh: boolean): Promise<void> {
    abortController?.abort()
    abortController = new AbortController()
    const { signal } = abortController

    loading.value = true
    error.value = null

    const userKey = dashpageSuggestionUserKey(user.value, realUsername.value)

    try {
      if (user.value === 'real') {
        let portfolio = getPortfolioCache(realUsername.value)
        if (!portfolio) {
          const titles = await fetchUserEditedPageTitles(realUsername.value, { signal })
          portfolio = setPortfolioCache(realUsername.value, titles)
        }
        cachedRealTitles.value = portfolio.titles
      }

      const exclude = forceRefresh ? selectedPageTitle.value ?? undefined : undefined
      const pageTitle = resolvePortfolioPage(
        user.value,
        currentUserPageLists.value,
        cachedRealTitles.value,
        exclude,
      )

      const pipelineResult = await runVeSuggestionsPipeline(wiki, pageTitle, {
        forceRefresh,
      })

      if (pipelineResult.error && !pipelineResult.cards.length) {
        error.value = pipelineResult.error
        return
      }

      if (pipelineResult.error) {
        error.value = pipelineResult.error
      }

      let pagePreview: { thumbnailSrc?: string; shortDescription?: string } = {}
      if (filterDashpageSuggestions(pipelineResult.cards).length) {
        pagePreview = await fetchPagePreviewMetadata(pageTitle, { signal })
      }

      const moduleCache = {
        fetchedAt: Date.now(),
        selectedPageTitle: pageTitle,
        thumbnailSrc: pagePreview.thumbnailSrc,
        shortDescription: pagePreview.shortDescription,
      }

      setDashpageSuggestionModuleCache(userKey, moduleCache)

      hasCache.value = true
      lastFetchedAt.value = moduleCache.fetchedAt
      selectedPageTitle.value = pageTitle
      preview.value = previewFromCards(pageTitle, pipelineResult.cards, pagePreview)
    } catch (caught) {
      if (caught instanceof FetchUserEditedPageTitlesError && caught.code === 'aborted') {
        return
      }
      const message =
        caught instanceof FetchUserEditedPageTitlesError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : String(caught)
      error.value = message
    } finally {
      loading.value = false
    }
  }

  const moduleProps = computed((): SuggestionModeModuleBind => {
    if (!hasCache.value) {
      return {
        loadPending: true,
        refreshing: loading.value,
        refreshError: error.value,
      }
    }

    return {
      ...preview.value,
      showRefresh: true,
      refreshing: loading.value,
      refreshError: error.value,
    }
  })

  function onSuggestionLoad(): void {
    void runPipeline(false)
  }

  function onSuggestionRefresh(): void {
    void runPipeline(true)
  }

  return {
    moduleProps,
    onSuggestionLoad,
    onSuggestionRefresh,
  }
}
