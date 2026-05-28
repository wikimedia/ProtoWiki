import { computed, ref } from 'vue'
import { FakeWiki } from 'fakewiki'

import { useConfig } from '@/composables/useConfig'
import { normalizeLang } from '@/lib/config'
import { FetchUserEditedPageTitlesError, fetchPagePreviewMetadataBatch } from '@/lib/fetchUserEditedPageTitles'
import {
  LiftWingQwenChatError,
  parseJsonStringArray,
  streamChatCompletion,
} from '@/lib/liftWingQwenChat'
import { parseLlmTopicPlan } from './parseLlmTopicPlan'
import {
  buildResolvedPageSuggestionTypeFilters,
  countPageSuggestionTypeFilters,
  excludedSuggestionTypesForPage,
  suggestionTypeFilterLabel,
  type SuggestionTypeFilter,
} from './suggestionTypeFilter'
import {
  ResolveWikipediaPageTitlesBatchError,
  resolveWikipediaPageTitlesBatch,
} from '@/lib/resolveWikipediaPageTitlesBatch'
import { refineResolvedWikipediaPageTitles } from '@/lib/refineResolvedWikipediaPageTitles'
import {
  FetchCirrusSearchError,
  fetchWikipediaTitleSearchCandidatesBatch,
} from '@/lib/fetchWikipediaTitleSearchCandidates'
import {
  cardsFromCachedRun,
  changeSizeForSuggestionType,
  createVeSuggestionsWiki,
  editUrlForSuggestionCard,
  getCachedRun,
  isEligibleSuggestionCard,
  runVeSuggestionsPipeline,
  shouldShowSnippet,
  type SuggestionCardData,
} from '@/lib/ve-suggestions'
import type { PagePreviewCache } from '@/lib/dashpageSuggestionCache'
import type { SuggestionFeedItem } from '@/prototypes/template-homepage/useDashpageSuggestionModule'

import {
  PAGE_COUNT,
  STORAGE_KEY,
  type PageResolutionStep,
  type Step,
} from './fixtures'
import { buildInitialPageTitlesPrompt, buildReplacementPageTitlesPrompt } from './prompts'
import { resolveLlmUserContext, type LlmUserContext } from './llmUserContext'
import {
  buildResolvedPageModes,
  countPageModes,
  defaultPageModeLabel,
  pageModeForPage,
  READING_LIST_HEADING,
  wikiArticleUrl,
  type PageMode,
} from './pageMode'

interface StoredState {
  interest?: string
  resolvedPages?: string[]
  suggestionTypeFilter?: SuggestionTypeFilter | null
  pageSuggestionTypeFilters?: Record<string, SuggestionTypeFilter>
  defaultPageMode?: PageMode
  pageModes?: Record<string, PageMode>
  llmStreamText?: string
  initialLlmStreamText?: string
  parsedPageTitles?: string[]
  resolutionSteps?: PageResolutionStep[]
  feedItems?: SuggestionFeedItem[]
  pagePreviews?: Record<string, PagePreviewCache>
  hasStarted?: boolean
  step?: Step
  fetchedAt?: number
}

interface SuggestionQueueItem {
  pageTitle: string
  mode: PageMode
  card?: SuggestionCardData
  pagePreview: PagePreviewCache
  editHref: string
}

function loadStoredState(): StoredState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredState
  } catch {
    return null
  }
}

function saveStoredState(state: StoredState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota or private mode — ignore.
  }
}

function timeEstimateForDifficulty(difficulty: 'easy' | 'medium' | 'hard'): string {
  if (difficulty === 'easy') return '3–5 minutes'
  if (difficulty === 'medium') return '10–15 minutes'
  return '20+ minutes'
}

function queueItemToFeedItem(item: SuggestionQueueItem): SuggestionFeedItem {
  if (item.mode === 'read') {
    const shortDescription = item.pagePreview.shortDescription?.trim()
    return {
      id: feedItemIdFromQueue(item),
      pageTitle: item.pageTitle,
      thumbnailSrc: item.pagePreview.thumbnailSrc,
      taskHeading: READING_LIST_HEADING,
      taskDifficulty: 'easy',
      taskTimeEstimate: timeEstimateForDifficulty('easy'),
      taskDescription: shortDescription || undefined,
      showSnippet: false,
      editHref: item.editHref,
      mode: 'read',
    }
  }

  const taskDifficulty = changeSizeForSuggestionType(item.card!.suggestionType)
  const showSnippet = shouldShowSnippet(item.card!)

  return {
    id: feedItemIdFromQueue(item),
    pageTitle: item.pageTitle,
    articleShortDescription: item.pagePreview.shortDescription,
    thumbnailSrc: item.pagePreview.thumbnailSrc,
    taskHeading: item.card!.heading,
    taskDifficulty,
    taskTimeEstimate: timeEstimateForDifficulty(taskDifficulty),
    taskDescriptionParts: item.card!.descriptionParts,
    showSnippet,
    snippetHtml: showSnippet ? item.card!.renderedSnippetHtml : undefined,
    editHref: item.editHref,
    mode: 'edit',
  }
}

function feedItemIdFromQueue(item: SuggestionQueueItem): string {
  if (item.mode === 'read') return `${item.pageTitle}:reading-list`
  return `${item.pageTitle}:${item.card!.cardId}`
}

function feedItemsShallowEqual(a: SuggestionFeedItem, b: SuggestionFeedItem): boolean {
  return (
    a.id === b.id &&
    a.pageTitle === b.pageTitle &&
    a.articleShortDescription === b.articleShortDescription &&
    a.thumbnailSrc === b.thumbnailSrc &&
    a.taskHeading === b.taskHeading &&
    a.taskDifficulty === b.taskDifficulty &&
    a.taskTimeEstimate === b.taskTimeEstimate &&
    a.taskDescription === b.taskDescription &&
    a.taskDescriptionParts === b.taskDescriptionParts &&
    a.mode === b.mode &&
    a.showSnippet === b.showSnippet &&
    a.snippetHtml === b.snippetHtml &&
    a.editHref === b.editHref
  )
}

function createLlmWiki(lang: string): FakeWiki {
  return createVeSuggestionsWiki(normalizeLang(lang), 'topic-suggested-edits-llm')
}

function createLlmTopicSuggestedEdits() {
  const { lang, user, realUsername, currentUserPageLists } = useConfig()
  const stored = loadStoredState()

  const step = ref<Step>(
    stored?.step === 'feed' && (stored.feedItems?.length ?? 0) > 0 ? 'feed' : 'topics',
  )
  const interest = ref(stored?.interest ?? '')
  const resolvedPages = ref<string[]>(stored?.resolvedPages ?? [])
  const suggestionTypeFilter = ref<SuggestionTypeFilter | null>(stored?.suggestionTypeFilter ?? null)
  const pageSuggestionTypeFilters = ref<Record<string, SuggestionTypeFilter>>(
    stored?.pageSuggestionTypeFilters ?? {},
  )
  const defaultPageMode = ref<PageMode>(stored?.defaultPageMode ?? 'edit')
  const pageModes = ref<Record<string, PageMode>>(stored?.pageModes ?? {})
  const feedItems = ref<SuggestionFeedItem[]>(stored?.feedItems ?? [])
  const queue = ref<SuggestionQueueItem[]>([])
  const pagePreviews = ref<Record<string, PagePreviewCache>>(stored?.pagePreviews ?? {})
  const loading = ref(false)
  const resolving = ref(false)
  const error = ref<string | null>(null)
  const hasStarted = ref(stored?.hasStarted ?? (stored?.feedItems?.length ?? 0) > 0)
  const llmStreamText = ref(stored?.llmStreamText ?? '')
  const initialLlmStreamText = ref(stored?.initialLlmStreamText ?? '')
  const parsedPageTitles = ref<string[]>(stored?.parsedPageTitles ?? [])
  const resolutionSteps = ref<PageResolutionStep[]>(stored?.resolutionSteps ?? [])
  const pickerInputVersion = ref(0)

  let abortController: AbortController | null = null

  function filterSuggestions(cards: SuggestionCardData[], pageTitle: string): SuggestionCardData[] {
    const excluded = new Set(
      excludedSuggestionTypesForPage(
        pageTitle,
        suggestionTypeFilter.value,
        pageSuggestionTypeFilters.value,
      ),
    )
    return cards.filter(
      (card) => !excluded.has(card.suggestionType) && isEligibleSuggestionCard(card),
    )
  }

  function pageNeedsVeRefresh(
    wikiClient: FakeWiki,
    pageTitle: string,
    forceRefresh: boolean,
  ): boolean {
    if (forceRefresh) return true

    const cached = getCachedRun(pageTitle)
    if (!cached) return false

    return filterSuggestions(cardsFromCachedRun(wikiClient, cached), pageTitle).length === 0
  }

  const suggestionTypeFilterSummary = computed(() =>
    suggestionTypeFilterLabel(suggestionTypeFilter.value),
  )

  const hasResolutionDebug = computed(
    () =>
      Boolean(interest.value.trim()) ||
      Boolean(llmStreamText.value.trim()) ||
      Boolean(initialLlmStreamText.value.trim()) ||
      resolutionSteps.value.length > 0 ||
      parsedPageTitles.value.length > 0 ||
      resolvedPages.value.length > 0,
  )

  function syncFeedItemsFromQueue(): void {
    if (!queue.value.length) {
      if (feedItems.value.length) feedItems.value = []
      return
    }

    feedItems.value = queue.value.map((queueItem) => queueItemToFeedItem(queueItem))
  }

  function appendFeedItemFromQueue(queueItem: SuggestionQueueItem): void {
    const candidate = queueItemToFeedItem(queueItem)
    if (feedItems.value.some((entry) => entry.id === candidate.id)) return
    feedItems.value = [...feedItems.value, candidate]
  }

  function patchFeedItemsForPageTitles(titles: string[]): void {
    if (!titles.length || !feedItems.value.length) return

    const titleSet = new Set(titles)
    const queueById = new Map(queue.value.map((entry) => [feedItemIdFromQueue(entry), entry]))
    let changed = false

    const next = feedItems.value.map((feedItem) => {
      if (!titleSet.has(feedItem.pageTitle)) return feedItem

      const queueItem = queueById.get(feedItem.id)
      if (!queueItem) return feedItem

      const candidate = queueItemToFeedItem(queueItem)
      if (feedItemsShallowEqual(feedItem, candidate)) return feedItem

      changed = true
      return candidate
    })

    if (changed) feedItems.value = next
  }

  function persistState(): void {
    saveStoredState({
      interest: interest.value,
      resolvedPages: resolvedPages.value,
      suggestionTypeFilter: suggestionTypeFilter.value,
      pageSuggestionTypeFilters: pageSuggestionTypeFilters.value,
      defaultPageMode: defaultPageMode.value,
      pageModes: pageModes.value,
      llmStreamText: llmStreamText.value,
      initialLlmStreamText: initialLlmStreamText.value,
      parsedPageTitles: parsedPageTitles.value,
      resolutionSteps: resolutionSteps.value,
      feedItems: feedItems.value,
      pagePreviews: pagePreviews.value,
      hasStarted: hasStarted.value,
      step: step.value,
      fetchedAt: Date.now(),
    })
  }

  async function streamTopicPlanFromLlm(prompt: string, signal: AbortSignal) {
    llmStreamText.value = ''
    parsedPageTitles.value = []
    suggestionTypeFilter.value = null
    pageSuggestionTypeFilters.value = {}
    defaultPageMode.value = 'edit'
    pageModes.value = {}

    const accumulated = await streamChatCompletion({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 900,
      signal,
      onDelta: (_chunk, full) => {
        llmStreamText.value = full
      },
    })

    llmStreamText.value = accumulated
    initialLlmStreamText.value = accumulated
    const plan = parseLlmTopicPlan(accumulated)
    parsedPageTitles.value = plan.pages
    suggestionTypeFilter.value = plan.suggestionTypeFilter
    return plan
  }

  async function streamReplacementTitlesFromLlm(
    prompt: string,
    signal: AbortSignal,
  ): Promise<string[]> {
    const accumulated = await streamChatCompletion({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 600,
      signal,
      onDelta: (_chunk, full) => {
        llmStreamText.value = full
      },
    })

    llmStreamText.value = accumulated
    const titles = parseJsonStringArray(accumulated)
    parsedPageTitles.value = titles
    return titles
  }

  async function validatePageTitles(
    titles: string[],
    wikiLang: string,
    signal: AbortSignal,
    label: string,
    interest = '',
  ): Promise<{
    validTitles: string[]
    missing: string[]
    resolved: Array<{ input: string; title: string }>
  }> {
    const batch = await resolveWikipediaPageTitlesBatch(titles, {
      lang: wikiLang,
      signal,
    })

    let resolved = batch.resolved
    let validTitles = resolved.map((entry) => entry.title)
    const missing = batch.missing

    const refinement = await refineResolvedWikipediaPageTitles(resolved, {
      interest,
      batchInputs: titles,
      lang: wikiLang,
      signal,
    })

    if (refinement.refinements.length) {
      resolved = refinement.resolved
      validTitles = resolved.map((entry) => entry.title)
      resolutionSteps.value = [
        ...resolutionSteps.value,
        {
          label: 'Disambiguation review',
          outcome: 'pick',
          detail: refinement.refinements
            .map((entry) => `${entry.input}: ${entry.from} → ${entry.to}`)
            .join('; '),
        },
      ]
    }

    resolutionSteps.value = [
      ...resolutionSteps.value,
      {
        label,
        query: titles.join(', '),
        outcome: missing.length ? 'retry' : 'pick',
        detail:
          missing.length ?
            `Validated ${validTitles.length}/${titles.length}. Missing: ${missing.join(', ')}.`
          : `All ${validTitles.length} titles validated.`,
      },
    ]

    return { validTitles, missing, resolved }
  }

  async function resolvePagesFromInterest(
    query: string,
    signal: AbortSignal,
    wikiLang: string,
    userContext: LlmUserContext,
  ): Promise<string[]> {
    resolutionSteps.value = []

    const initialPlan = await streamTopicPlanFromLlm(
      buildInitialPageTitlesPrompt(query, PAGE_COUNT, userContext),
      signal,
    )

    if (initialPlan.hadConflictingFilters) {
      resolutionSteps.value.push({
        label: 'Suggestion type filter',
        outcome: 'miss',
        detail: 'Model returned both allow and block lists; showing all suggestion types.',
      })
    } else if (initialPlan.suggestionTypeFilter) {
      resolutionSteps.value.push({
        label: 'Suggestion type filter',
        outcome: 'pick',
        detail: suggestionTypeFilterLabel(initialPlan.suggestionTypeFilter) ?? undefined,
      })
    }

    const pageFilterCount = countPageSuggestionTypeFilters(initialPlan.pageFilterLayers)
    if (pageFilterCount > 0) {
      resolutionSteps.value.push({
        label: 'Page-specific filters',
        outcome: 'pick',
        detail: `${pageFilterCount} page${pageFilterCount === 1 ? '' : 's'} with custom suggestion rules.`,
      })
    }

    const readPageCount = countPageModes(initialPlan.pageModeLayers, 'read')
    const editOverrideCount = countPageModes(initialPlan.pageModeLayers, 'edit')

    if (initialPlan.defaultPageMode === 'read') {
      resolutionSteps.value.push({
        label: 'Page mode',
        outcome: 'pick',
        detail:
          editOverrideCount > 0 ?
            `${defaultPageModeLabel('read')}. ${editOverrideCount} page${editOverrideCount === 1 ? '' : 's'} overridden to edit.`
          : defaultPageModeLabel('read'),
      })
    } else if (readPageCount > 0) {
      resolutionSteps.value.push({
        label: 'Reading list pages',
        outcome: 'pick',
        detail: `${readPageCount} page${readPageCount === 1 ? '' : 's'} marked for reading.`,
      })
    }

    defaultPageMode.value = initialPlan.defaultPageMode

    const initialTitles = initialPlan.pages

    if (initialTitles.length < PAGE_COUNT) {
      resolutionSteps.value.push({
        label: 'Parse LLM response',
        outcome: 'miss',
        detail: `Expected ${PAGE_COUNT} titles but got ${initialTitles.length}.`,
      })
    }

    let { validTitles, missing, resolved: validatedResolved } = await validatePageTitles(
      initialTitles.slice(0, PAGE_COUNT),
      wikiLang,
      signal,
      'Validate page titles',
      query,
    )

    pageSuggestionTypeFilters.value = buildResolvedPageSuggestionTypeFilters(
      initialPlan.pageFilterLayers,
      validatedResolved,
    )
    pageModes.value = buildResolvedPageModes(initialPlan.pageModeLayers, validatedResolved)

    if (missing.length > 0) {
      let searchHints: Array<{ missingTitle: string; searchResults: string[] }> = []

      try {
        const candidateBatches = await fetchWikipediaTitleSearchCandidatesBatch(missing, {
          lang: wikiLang,
          signal,
          limit: 10,
        })

        searchHints = candidateBatches.map((batch) => ({
          missingTitle: batch.query,
          searchResults: batch.titles,
        }))

        const withResults = searchHints.filter((hint) => hint.searchResults.length > 0).length
        resolutionSteps.value = [
          ...resolutionSteps.value,
          {
            label: 'Search for replacements',
            query: missing.join(', '),
            outcome: withResults > 0 ? 'retry' : 'miss',
            detail:
              withResults > 0 ?
                `Fetched top 10 search results for ${withResults}/${missing.length} missing title(s).`
              : 'Search returned no candidate titles.',
          },
        ]
      } catch (caught) {
        if (
          caught instanceof FetchCirrusSearchError &&
          caught.code === 'aborted'
        ) {
          throw caught
        }

        resolutionSteps.value = [
          ...resolutionSteps.value,
          {
            label: 'Search for replacements',
            query: missing.join(', '),
            outcome: 'miss',
            detail: 'Could not fetch search results; asking the model without hints.',
          },
        ]
      }

      const replacements = await streamReplacementTitlesFromLlm(
        buildReplacementPageTitlesPrompt(query, missing, userContext, searchHints),
        signal,
      )

      const replacementSlice = replacements.slice(0, missing.length)
      const retryBatch = await resolveWikipediaPageTitlesBatch(replacementSlice, {
        lang: wikiLang,
        signal,
      })

      const replacementValid = retryBatch.resolved.map((entry) => entry.title)
      const stillMissing = retryBatch.missing

      resolutionSteps.value = [
        ...resolutionSteps.value,
        {
          label: 'LLM replacements',
          query: replacementSlice.join(', '),
          outcome: stillMissing.length ? 'retry' : 'pick',
          detail:
            stillMissing.length ?
              `Replaced ${replacementValid.length}/${missing.length}. Still missing: ${stillMissing.join(', ')}.`
            : `Replaced all ${replacementValid.length} missing titles.`,
        },
      ]

      validTitles = [...validTitles, ...replacementValid]
      missing = stillMissing
      validatedResolved = [...validatedResolved, ...retryBatch.resolved]
      pageSuggestionTypeFilters.value = buildResolvedPageSuggestionTypeFilters(
        initialPlan.pageFilterLayers,
        validatedResolved,
      )
      pageModes.value = buildResolvedPageModes(initialPlan.pageModeLayers, validatedResolved)
    }

    return [...new Set(validTitles)]
  }

  async function collectSuggestionsForPages(
    wikiClient: FakeWiki,
    pageTitles: string[],
    wikiLang: string,
    forceRefresh: boolean,
    signal: AbortSignal,
    recordPipelineError: (message: string) => void,
    onItem?: (item: SuggestionQueueItem) => void | Promise<void>,
    getPagePreview?: (pageTitle: string) => PagePreviewCache,
  ): Promise<SuggestionQueueItem[]> {
    const items: SuggestionQueueItem[] = []

    for (const pageTitle of pageTitles) {
      if (signal.aborted) return items

      if (pageModeForPage(pageTitle, defaultPageMode.value, pageModes.value) === 'read') {
        const item: SuggestionQueueItem = {
          pageTitle,
          mode: 'read',
          pagePreview: getPagePreview?.(pageTitle) ?? {},
          editHref: wikiArticleUrl(wikiLang, pageTitle),
        }

        items.push(item)
        if (onItem) {
          await onItem(item)
        }
        continue
      }

      const pipelineResult = await runVeSuggestionsPipeline(wikiClient, pageTitle, {
        forceRefresh: forceRefresh ? true : pageNeedsVeRefresh(wikiClient, pageTitle, false),
        maxSuggestions: 1,
        excludeSuggestionTypes: excludedSuggestionTypesForPage(
          pageTitle,
          suggestionTypeFilter.value,
          pageSuggestionTypeFilters.value,
        ),
      })

      if (pipelineResult.error && !pipelineResult.cards.length) {
        recordPipelineError(pipelineResult.error)
        continue
      }

      if (pipelineResult.error) {
        recordPipelineError(pipelineResult.error)
      }

      const eligibleCards = filterSuggestions(pipelineResult.cards, pageTitle)
      const card = eligibleCards[0] ?? null
      if (!card) continue

      const item: SuggestionQueueItem = {
        pageTitle,
        mode: 'edit',
        card,
        pagePreview: getPagePreview?.(pageTitle) ?? {},
        editHref: editUrlForSuggestionCard(
          wikiClient,
          pageTitle,
          card,
          getCachedRun(pageTitle)?.pageSource,
        ),
      }

      items.push(item)
      if (onItem) {
        await onItem(item)
      }
    }

    return items
  }

  async function enrichQueuePreviewsBatch(
    pageTitles: string[],
    signal: AbortSignal,
    wikiLang: string,
    patchFeed: boolean,
  ): Promise<void> {
    const titlesToFetch = [...new Set(pageTitles)].filter((title) => {
      const preview = pagePreviews.value[title]
      return !preview?.shortDescription?.trim() || !preview?.thumbnailSrc?.trim()
    })
    if (!titlesToFetch.length) return

    try {
      const previews = await fetchPagePreviewMetadataBatch(titlesToFetch, {
        signal,
        lang: normalizeLang(wikiLang),
      })
      if (signal.aborted) return

      pagePreviews.value = { ...pagePreviews.value, ...previews }

      queue.value = queue.value.map((entry) => {
        const preview = previews[entry.pageTitle] ?? pagePreviews.value[entry.pageTitle]
        if (!preview) return entry

        const mergedPreview = { ...entry.pagePreview, ...preview }
        if (
          entry.pagePreview.shortDescription === mergedPreview.shortDescription &&
          entry.pagePreview.thumbnailSrc === mergedPreview.thumbnailSrc
        ) {
          return entry
        }

        return {
          ...entry,
          pagePreview: mergedPreview,
        }
      })
      if (patchFeed) {
        patchFeedItemsForPageTitles(titlesToFetch)
      }
      persistState()
    } catch (caught) {
      if (caught instanceof FetchUserEditedPageTitlesError && caught.code === 'aborted') {
        return
      }
    }
  }

  async function runVePipeline(pageTitles: string[], isRefresh: boolean): Promise<void> {
    if (!pageTitles.length) return

    abortController?.abort()
    abortController = new AbortController()
    const { signal } = abortController

    const previousFeedItems = [...feedItems.value]
    const hasFeedBackup = isRefresh && previousFeedItems.length > 0

    hasStarted.value = true
    loading.value = true
    error.value = null

    if (hasFeedBackup) {
      queue.value = []
    } else {
      feedItems.value = []
      queue.value = []
    }

    const wikiLang = normalizeLang(lang.value)
    const wikiClient = createLlmWiki(wikiLang)
    const accumulated: SuggestionQueueItem[] = []

    const getPagePreview = (pageTitle: string): PagePreviewCache =>
      pagePreviews.value[pageTitle] ?? {}

    const mergeQueueItemPreview = (item: SuggestionQueueItem): SuggestionQueueItem => ({
      ...item,
      pagePreview: { ...getPagePreview(item.pageTitle), ...item.pagePreview },
    })

    const onItem = async (item: SuggestionQueueItem): Promise<void> => {
      const itemWithPreview = mergeQueueItemPreview(item)
      accumulated.push(itemWithPreview)
      queue.value = [...accumulated]

      if (!isRefresh) {
        appendFeedItemFromQueue(itemWithPreview)
        persistState()
      }

      await enrichQueuePreviewsBatch(
        accumulated.map((entry) => entry.pageTitle),
        signal,
        wikiLang,
        !isRefresh,
      )
    }

    const recordPipelineError = (message: string): void => {
      if (!error.value) error.value = message
    }

    const restorePreviousFeed = (): void => {
      if (!hasFeedBackup) return
      feedItems.value = previousFeedItems
    }

    try {
      await collectSuggestionsForPages(
        wikiClient,
        pageTitles,
        wikiLang,
        isRefresh,
        signal,
        recordPipelineError,
        onItem,
        getPagePreview,
      )

      if (signal.aborted) {
        restorePreviousFeed()
        return
      }

      queue.value = accumulated.map((item) => ({
        ...item,
        pagePreview: pagePreviews.value[item.pageTitle] ?? item.pagePreview,
      }))

      if (queue.value.length > 0) {
        syncFeedItemsFromQueue()
        persistState()
      } else if (hasFeedBackup) {
        feedItems.value = previousFeedItems
        if (!error.value) {
          error.value = 'No new suggestions found. Showing your previous results.'
        }
        persistState()
      } else {
        feedItems.value = []
        persistState()
      }
    } catch (caught) {
      if (caught instanceof FetchUserEditedPageTitlesError && caught.code === 'aborted') {
        restorePreviousFeed()
        return
      }
      error.value = caught instanceof Error ? caught.message : String(caught)
      restorePreviousFeed()
    } finally {
      loading.value = false
      persistState()
    }
  }

  async function continueToFeed(query: string): Promise<void> {
    const trimmed = query.trim()
    if (!trimmed || resolving.value) return

    abortController?.abort()
    abortController = new AbortController()
    const { signal } = abortController

    resolving.value = true
    loading.value = true
    error.value = null
    llmStreamText.value = ''
    initialLlmStreamText.value = ''
    parsedPageTitles.value = []
    resolutionSteps.value = []
    suggestionTypeFilter.value = null
    pageSuggestionTypeFilters.value = {}
    defaultPageMode.value = 'edit'
    pageModes.value = {}
    feedItems.value = []
    queue.value = []
    hasStarted.value = false
    interest.value = trimmed

    const wikiLang = normalizeLang(lang.value)

    try {
      const userContext = await resolveLlmUserContext(
        user.value,
        wikiLang,
        realUsername.value,
        currentUserPageLists.value,
        signal,
      )

      if (signal.aborted) return

      const pages = await resolvePagesFromInterest(trimmed, signal, wikiLang, userContext)

      if (signal.aborted) return

      if (!pages.length) {
        error.value = 'No valid Wikipedia pages were found for that interest.'
        return
      }

      resolvedPages.value = pages
      step.value = 'feed'
      persistState()

      await runVePipeline(pages, false)
    } catch (caught) {
      if (
        (caught instanceof LiftWingQwenChatError && caught.code === 'aborted') ||
        (caught instanceof ResolveWikipediaPageTitlesBatchError && caught.code === 'aborted') ||
        (caught instanceof FetchCirrusSearchError && caught.code === 'aborted')
      ) {
        return
      }

      if (caught instanceof LiftWingQwenChatError) {
        error.value = caught.message
      } else if (caught instanceof ResolveWikipediaPageTitlesBatchError) {
        error.value = caught.message
      } else {
        error.value = caught instanceof Error ? caught.message : 'Could not resolve pages.'
      }
    } finally {
      resolving.value = false
      if (!feedItems.value.length && step.value === 'topics') {
        loading.value = false
      }
      persistState()
    }
  }

  function refreshFeed(): void {
    if (!resolvedPages.value.length) return
    void runVePipeline(resolvedPages.value, true)
  }

  function clearPickerInput(): void {
    interest.value = ''
    error.value = null
    pickerInputVersion.value += 1
  }

  function clearResolutionDebug(): void {
    llmStreamText.value = ''
    initialLlmStreamText.value = ''
    parsedPageTitles.value = []
    resolutionSteps.value = []
    suggestionTypeFilter.value = null
    pageSuggestionTypeFilters.value = {}
    defaultPageMode.value = 'edit'
    pageModes.value = {}
  }

  function openSettings(): void {
    abortController?.abort()
    loading.value = false
    resolving.value = false
    clearPickerInput()
    step.value = 'topics'
    persistState()
  }

  function returnToFeed(): void {
    abortController?.abort()
    loading.value = false
    resolving.value = false
    error.value = null
    step.value = 'feed'
    persistState()
  }

  function resetInterest(): void {
    clearPickerInput()
    clearResolutionDebug()
    resolvedPages.value = []
    feedItems.value = []
    queue.value = []
    hasStarted.value = false
    step.value = 'topics'
    persistState()
  }

  const canContinue = computed(() => !resolving.value)

  const feedProps = computed(() => {
    if (!loading.value && hasStarted.value && !feedItems.value.length) {
      return {
        emptyMessage: 'No suggestions found.',
        refreshing: loading.value,
        refreshError: error.value,
      }
    }

    if (loading.value && !feedItems.value.length) {
      return {
        refreshing: loading.value,
        refreshError: error.value,
      }
    }

    return {
      items: feedItems.value,
      refreshing: loading.value,
      refreshError: error.value,
    }
  })

  return {
    step,
    interest,
    resolvedPages,
    loading,
    resolving,
    error,
    hasStarted,
    hasResolutionDebug,
    llmStreamText,
    initialLlmStreamText,
    parsedPageTitles,
    resolutionSteps,
    suggestionTypeFilter,
    suggestionTypeFilterSummary,
    defaultPageMode,
    pageModes,
    pageSuggestionTypeFilters,
    pickerInputVersion,
    canContinue,
    feedProps,
    continueToFeed,
    refreshFeed,
    openSettings,
    returnToFeed,
    resetInterest,
  }
}

let llmTopicSuggestedEditsState: ReturnType<typeof createLlmTopicSuggestedEdits> | null = null

export function useLlmTopicSuggestedEdits() {
  if (!llmTopicSuggestedEditsState) {
    llmTopicSuggestedEditsState = createLlmTopicSuggestedEdits()
  }
  return llmTopicSuggestedEditsState
}

export type { PageResolutionStep }
