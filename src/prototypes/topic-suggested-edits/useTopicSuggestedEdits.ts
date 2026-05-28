import { computed, ref } from 'vue'
import { FakeWiki } from 'fakewiki'

import { useConfig } from '@/composables/useConfig'
import { normalizeLang } from '@/lib/config'
import {
  FetchMorelikePageTitlesError,
  fetchMorelikePageTitles,
} from '@/lib/fetchMorelikePageTitles'
import {
  FetchUserEditedPageTitlesError,
  fetchPagePreviewMetadataBatch,
} from '@/lib/fetchUserEditedPageTitles'
import {
  resolveWikipediaPageTitleIfExact,
  resolveWikipediaSearchQuery,
  ResolveWikipediaSearchQueryError,
} from '@/lib/resolveWikipediaSearchQuery'
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
  capitalizeInterestLabel,
  DEFAULT_TOPIC_PILLS,
  defaultTopicKinds,
  MORELIKE_LIMIT,
  SEARCH_TOPIC_PAGE_LIMIT,
  type Step,
  type TopicKind,
} from './fixtures'

const STORAGE_KEY = 'protowiki-topic-suggested-edits-v4'
const EXCLUDED_SUGGESTION_TYPES = new Set(['redirect'])

interface StoredState {
  topicPills: string[]
  selectedTopics: string[]
  topicKinds?: Record<string, TopicKind>
  feedItems?: SuggestionFeedItem[]
  pagePreviews?: Record<string, PagePreviewCache>
  hasStarted?: boolean
  step?: Step
  fetchedAt?: number
}

interface SuggestionQueueItem {
  pageTitle: string
  card: SuggestionCardData
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

function filterSuggestions(cards: SuggestionCardData[]): SuggestionCardData[] {
  return cards.filter(
    (card) =>
      !EXCLUDED_SUGGESTION_TYPES.has(card.suggestionType) && isEligibleSuggestionCard(card),
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

  return filterSuggestions(cardsFromCachedRun(wikiClient, cached)).length === 0
}

function timeEstimateForDifficulty(difficulty: 'easy' | 'medium' | 'hard'): string {
  if (difficulty === 'easy') return '3–5 minutes'
  if (difficulty === 'medium') return '10–15 minutes'
  return '20+ minutes'
}

function queueItemToFeedItem(item: SuggestionQueueItem): SuggestionFeedItem {
  const taskDifficulty = changeSizeForSuggestionType(item.card.suggestionType)
  const showSnippet = shouldShowSnippet(item.card)

  return {
    id: feedItemIdFromQueue(item),
    pageTitle: item.pageTitle,
    articleShortDescription: item.pagePreview.shortDescription,
    thumbnailSrc: item.pagePreview.thumbnailSrc,
    taskHeading: item.card.heading,
    taskDifficulty,
    taskTimeEstimate: timeEstimateForDifficulty(taskDifficulty),
    taskDescriptionParts: item.card.descriptionParts,
    showSnippet,
    snippetHtml: showSnippet ? item.card.renderedSnippetHtml : undefined,
    editHref: item.editHref,
  }
}

function feedItemIdFromQueue(item: SuggestionQueueItem): string {
  return `${item.pageTitle}:${item.card.cardId}`
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
    a.showSnippet === b.showSnippet &&
    a.snippetHtml === b.snippetHtml &&
    a.editHref === b.editHref
  )
}

function createTopicWiki(lang: string): FakeWiki {
  return createVeSuggestionsWiki(normalizeLang(lang), 'topic-suggested-edits')
}

function feedItemPageTitles(items: SuggestionFeedItem[]): string[] {
  return items.map((item) => item.pageTitle)
}

function mergeTopicKinds(
  pills: string[],
  stored?: Record<string, TopicKind>,
): Record<string, TopicKind> {
  return {
    ...defaultTopicKinds(pills),
    ...stored,
  }
}

function createTopicSuggestedEdits() {
  const { lang } = useConfig()
  const stored = loadStoredState()
  const initialPills =
    stored !== null ? (stored.topicPills ?? []) : [...DEFAULT_TOPIC_PILLS]

  const step = ref<Step>(
    stored?.step === 'feed' && (stored.feedItems?.length ?? 0) > 0 ? 'feed' : 'topics',
  )
  const topicPills = ref<string[]>(initialPills)
  const selectedTopics = ref<string[]>(
    stored !== null ? (stored.selectedTopics ?? []) : [],
  )
  const topicKinds = ref<Record<string, TopicKind>>(
    mergeTopicKinds(initialPills, stored?.topicKinds),
  )
  const feedItems = ref<SuggestionFeedItem[]>(stored?.feedItems ?? [])
  const queue = ref<SuggestionQueueItem[]>([])
  const pagePreviews = ref<Record<string, PagePreviewCache>>(stored?.pagePreviews ?? {})
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hasStarted = ref(stored?.hasStarted ?? (stored?.feedItems?.length ?? 0) > 0)
  const addTopicError = ref<string | null>(null)

  let abortController: AbortController | null = null

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
      topicPills: topicPills.value,
      selectedTopics: selectedTopics.value,
      topicKinds: topicKinds.value,
      feedItems: feedItems.value,
      pagePreviews: pagePreviews.value,
      hasStarted: hasStarted.value,
      step: step.value,
      fetchedAt: Date.now(),
    })
  }

  function toggleTopic(topic: string, selected: boolean): void {
    if (selected) {
      if (!selectedTopics.value.includes(topic)) {
        selectedTopics.value = [...selectedTopics.value, topic]
      }
    } else {
      selectedTopics.value = selectedTopics.value.filter((entry) => entry !== topic)
    }
    persistState()
  }

  function addTopic(topic: string, select = true, kind: TopicKind = 'page'): void {
    const trimmed = topic.trim()
    if (!trimmed) return

    if (!topicPills.value.includes(trimmed)) {
      topicPills.value = [...topicPills.value, trimmed]
    }

    topicKinds.value = { ...topicKinds.value, [trimmed]: kind }

    if (select && !selectedTopics.value.includes(trimmed)) {
      selectedTopics.value = [...selectedTopics.value, trimmed]
    }

    persistState()
  }

  async function pageTitlesForTopic(
    topic: string,
    kind: TopicKind,
    wikiLang: string,
    signal: AbortSignal,
    recordPipelineError: (message: string) => void,
  ): Promise<string[]> {
    if (kind === 'page') return [topic]

    try {
      const resolved = await resolveWikipediaSearchQuery(topic, {
        lang: wikiLang,
        signal,
        maxSeeds: SEARCH_TOPIC_PAGE_LIMIT,
      })
      return resolved.pages.map((page) => page.title).filter(Boolean)
    } catch (caught) {
      if (caught instanceof ResolveWikipediaSearchQueryError && caught.code === 'aborted') {
        throw caught
      }
      const message =
        caught instanceof ResolveWikipediaSearchQueryError ?
          caught.message
        : caught instanceof Error ? caught.message
        : String(caught)
      recordPipelineError(message)
      return []
    }
  }

  async function resolveAndAddTopic(input: string): Promise<boolean> {
    addTopicError.value = null
    const trimmed = input.trim()
    if (!trimmed) return false

    try {
      const pageTitle = await resolveWikipediaPageTitleIfExact(trimmed, {
        lang: normalizeLang(lang.value),
      })

      if (pageTitle) {
        addTopic(pageTitle, true, 'page')
        return true
      }

      addTopic(capitalizeInterestLabel(trimmed), true, 'search')
      return true
    } catch (caught) {
      if (caught instanceof ResolveWikipediaSearchQueryError) {
        addTopicError.value = caught.message
      } else {
        addTopicError.value =
          caught instanceof Error ? caught.message : 'Could not resolve that topic.'
      }
      return false
    }
  }

  async function collectSuggestionsForPages(
    wikiClient: FakeWiki,
    pageTitles: string[],
    forceRefresh: boolean,
    signal: AbortSignal,
    recordPipelineError: (message: string) => void,
    onItem?: (item: SuggestionQueueItem) => void | Promise<void>,
    getPagePreview?: (pageTitle: string) => PagePreviewCache,
  ): Promise<SuggestionQueueItem[]> {
    const items: SuggestionQueueItem[] = []

    for (const pageTitle of pageTitles) {
      if (signal.aborted) return items

      const pipelineResult = await runVeSuggestionsPipeline(wikiClient, pageTitle, {
        forceRefresh: pageNeedsVeRefresh(wikiClient, pageTitle, forceRefresh),
        maxSuggestions: 1,
        excludeSuggestionTypes: [...EXCLUDED_SUGGESTION_TYPES],
      })

      if (pipelineResult.error && !pipelineResult.cards.length) {
        recordPipelineError(pipelineResult.error)
        continue
      }

      if (pipelineResult.error) {
        recordPipelineError(pipelineResult.error)
      }

      const eligibleCards = filterSuggestions(pipelineResult.cards)
      const card = eligibleCards[0] ?? null
      if (!card) continue

      const item: SuggestionQueueItem = {
        pageTitle,
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
    lang: string,
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
        lang: normalizeLang(lang),
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

  async function runPipeline(isRefresh: boolean): Promise<void> {
    const seeds = [...selectedTopics.value]
    if (!seeds.length) return

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
    const wikiClient = createTopicWiki(wikiLang)
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
      const triedPageTitles: string[] = []
      const morelikeSeedTitles: string[] = []
      const excludeTitles =
        hasFeedBackup ? [...new Set([...feedItemPageTitles(previousFeedItems)])] : []

      for (const topic of seeds) {
        const kind = topicKinds.value[topic] ?? 'page'
        const pageTitles = await pageTitlesForTopic(
          topic,
          kind,
          wikiLang,
          signal,
          recordPipelineError,
        )

        if (signal.aborted) {
          restorePreviousFeed()
          return
        }

        morelikeSeedTitles.push(...pageTitles)

        if (!pageTitles.length) continue

        await collectSuggestionsForPages(
          wikiClient,
          pageTitles,
          false,
          signal,
          recordPipelineError,
          onItem,
          getPagePreview,
        )

        triedPageTitles.push(...pageTitles)
      }

      if (signal.aborted) {
        restorePreviousFeed()
        return
      }

      let morelikePagePicks: string[] = []
      const uniqueMorelikeSeeds = [...new Set(morelikeSeedTitles)]
      if (uniqueMorelikeSeeds.length) {
        try {
          morelikePagePicks = await fetchMorelikePageTitles(uniqueMorelikeSeeds, {
            limit: MORELIKE_LIMIT,
            excludeTitles: [...new Set([...excludeTitles, ...triedPageTitles])],
            signal,
            lang: wikiLang,
          })
        } catch (caught) {
          if (caught instanceof FetchMorelikePageTitlesError && caught.code === 'aborted') {
            restorePreviousFeed()
            return
          }
          const message =
            caught instanceof FetchMorelikePageTitlesError ?
              caught.message
            : caught instanceof Error ? caught.message
            : String(caught)
          recordPipelineError(message)
        }
      }

      triedPageTitles.push(...morelikePagePicks)

      await collectSuggestionsForPages(
        wikiClient,
        morelikePagePicks,
        false,
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
      if (
        (caught instanceof FetchUserEditedPageTitlesError && caught.code === 'aborted') ||
        (caught instanceof FetchMorelikePageTitlesError && caught.code === 'aborted')
      ) {
        restorePreviousFeed()
        return
      }
      error.value =
        caught instanceof FetchUserEditedPageTitlesError ||
        caught instanceof FetchMorelikePageTitlesError ?
          caught.message
        : caught instanceof Error ? caught.message
        : String(caught)
      restorePreviousFeed()
    } finally {
      loading.value = false
      persistState()
    }
  }

  function goToFeed(): void {
    step.value = 'feed'
    persistState()
  }

  function refreshFeed(): void {
    void runPipeline(true)
  }

  function openSettings(): void {
    step.value = 'topics'
    persistState()
  }

  function resetTopics(): void {
    topicPills.value = []
    selectedTopics.value = []
    topicKinds.value = {}
    feedItems.value = []
    queue.value = []
    hasStarted.value = false
    error.value = null
    addTopicError.value = null
    step.value = 'topics'
    persistState()
  }

  const canContinue = computed(() => selectedTopics.value.length > 0)

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
    topicPills,
    selectedTopics,
    loading,
    error,
    addTopicError,
    canContinue,
    feedProps,
    toggleTopic,
    addTopic,
    resolveAndAddTopic,
    goToFeed,
    refreshFeed,
    openSettings,
    resetTopics,
  }
}

let topicSuggestedEditsState: ReturnType<typeof createTopicSuggestedEdits> | null = null

export function useTopicSuggestedEdits() {
  if (!topicSuggestedEditsState) {
    topicSuggestedEditsState = createTopicSuggestedEdits()
  }
  return topicSuggestedEditsState
}
