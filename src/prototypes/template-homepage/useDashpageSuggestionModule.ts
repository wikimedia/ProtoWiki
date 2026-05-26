import { computed, ref, watch, type ComputedRef } from 'vue'
import type { FakeWiki } from 'fakewiki'

import { useConfig } from '@/composables/useConfig'
import { normalizeLang } from '@/lib/config'
import { shouldShowDashpageLoadPrompt } from '@/lib/dashpageLoadState'
import { DASHPAGE_SUGGESTION_FEED_PREVIEW_MAX } from '@/lib/dashpageSuggestionFeedConstants'
import {
  DASHPAGE_MORELIKE_SEED_COUNT,
  DASHPAGE_SUGGESTION_MAX_TRIED_PAGES,
  DASHPAGE_SUGGESTION_MIN_QUEUE,
  DASHPAGE_SUGGESTION_MORELIKE_MAX,
  DASHPAGE_SUGGESTION_MORELIKE_SUPPLEMENT_MAX,
  DASHPAGE_SUGGESTION_POOL_MAX,
  dashpageSuggestionUserKey,
  getDashpageSuggestionModuleCache,
  getPortfolioPagesForUser,
  pickUpToRandomPages,
  portfolioPoolForDashpage,
  setDashpageSuggestionModuleCache,
  type PagePreviewCache,
} from '@/lib/dashpageSuggestionCache'
import { getPortfolioCache, setPortfolioCache } from '@/lib/dashpagePortfolioCache'
import {
  FetchMorelikePageTitlesError,
  fetchMorelikePageTitles,
} from '@/lib/fetchMorelikePageTitles'
import {
  FetchUserEditedPageTitlesError,
  fetchPagePreviewMetadataBatch,
  fetchUserEditedPageTitles,
} from '@/lib/fetchUserEditedPageTitles'
import {
  cardsFromCachedRun,
  createVeSuggestionsWiki,
  changeSizeForSuggestionType,
  editUrlForSuggestionCard,
  getCachedRun,
  isEligibleSuggestionCard,
  pickRandomSuggestion,
  runVeSuggestionsPipeline,
  shouldShowSnippet,
  type SuggestionCardData,
  type SuggestionDescriptionPart,
} from '@/lib/ve-suggestions'

const DASHPAGE_EXCLUDED_SUGGESTION_TYPES = new Set(['redirect'])

function createSuggestionWiki(lang: string): FakeWiki {
  return createVeSuggestionsWiki(normalizeLang(lang), 'dashpage-suggestion-mode')
}

export interface SuggestionQueueItem {
  pageTitle: string
  card: SuggestionCardData
  pagePreview: PagePreviewCache
  editHref: string
}

function filterDashpageSuggestions(cards: SuggestionCardData[]): SuggestionCardData[] {
  return cards.filter(
    (card) =>
      !DASHPAGE_EXCLUDED_SUGGESTION_TYPES.has(card.suggestionType) &&
      isEligibleSuggestionCard(card),
  )
}

function pageNeedsVeRefresh(
  wiki: FakeWiki,
  pageTitle: string,
  forceRefresh: boolean,
): boolean {
  if (forceRefresh) return true

  const cached = getCachedRun(pageTitle)
  if (!cached) return false

  return filterDashpageSuggestions(cardsFromCachedRun(wiki, cached)).length === 0
}

function timeEstimateForDifficulty(difficulty: 'easy' | 'medium' | 'hard'): string {
  if (difficulty === 'easy') return '3–5 minutes'
  if (difficulty === 'medium') return '10–15 minutes'
  return '20+ minutes'
}

function shuffleQueue<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function queueItemToBind(item: SuggestionQueueItem): SuggestionModeModuleBind {
  const taskDifficulty = changeSizeForSuggestionType(item.card.suggestionType)
  const showSnippet = shouldShowSnippet(item.card)

  return {
    articleTitle: item.pageTitle,
    articleShortDescription: item.pagePreview.shortDescription,
    thumbnailSrc: item.pagePreview.thumbnailSrc,
    taskTypeLabel: item.card.heading,
    taskHeading: item.card.heading,
    taskDescriptionParts: item.card.descriptionParts,
    taskDifficulty,
    taskTimeEstimate: timeEstimateForDifficulty(taskDifficulty),
    showSnippet,
    snippetHtml: showSnippet ? item.card.renderedSnippetHtml : undefined,
    editHref: item.editHref,
    showRefresh: true,
  }
}

export interface SuggestionModeModuleBind {
  articleTitle?: string
  articleShortDescription?: string
  thumbnailSrc?: string
  taskTypeLabel?: string
  taskHeading?: string
  taskTimeEstimate?: string
  taskDescription?: string
  taskDescriptionParts?: SuggestionDescriptionPart[]
  showSnippet?: boolean
  snippetHtml?: string
  loadPending?: boolean
  showRefresh?: boolean
  refreshing?: boolean
  refreshError?: string | null
  emptyMessage?: string | null
  totalSuggestionCount?: number
  currentIndex?: number
  queueLength?: number
  canGoPrev?: boolean
  canGoNext?: boolean
  taskDifficulty?: 'easy' | 'medium' | 'hard'
  editHref?: string
}

export interface SuggestionFeedItem {
  id: string
  pageTitle: string
  articleShortDescription?: string
  thumbnailSrc?: string
  taskHeading: string
  taskDifficulty: 'easy' | 'medium' | 'hard'
  taskTimeEstimate: string
  taskDescription?: string
  taskDescriptionParts?: SuggestionDescriptionPart[]
  showSnippet: boolean
  snippetHtml?: string
  editHref: string
}

export interface SuggestionFeedModuleBind {
  items?: SuggestionFeedItem[]
  loadPending?: boolean
  showRefresh?: boolean
  refreshing?: boolean
  refreshError?: string | null
  emptyMessage?: string | null
}

function queueItemToFeedItem(item: SuggestionQueueItem): SuggestionFeedItem {
  const bind = queueItemToBind(item)
  const taskDifficulty = bind.taskDifficulty ?? 'easy'

  return {
    id: `${item.pageTitle}:${item.card.cardId}`,
    pageTitle: item.pageTitle,
    articleShortDescription: bind.articleShortDescription,
    thumbnailSrc: bind.thumbnailSrc,
    taskHeading: bind.taskHeading ?? bind.taskTypeLabel ?? '',
    taskDifficulty,
    taskTimeEstimate: bind.taskTimeEstimate ?? timeEstimateForDifficulty(taskDifficulty),
    taskDescription: bind.taskDescription,
    taskDescriptionParts: bind.taskDescriptionParts,
    showSnippet: bind.showSnippet ?? false,
    snippetHtml: bind.snippetHtml,
    editHref: bind.editHref ?? item.editHref,
  }
}

function queueToFeedItems(queue: SuggestionQueueItem[]): SuggestionFeedItem[] {
  return queue.map(queueItemToFeedItem)
}

function buildQueueFromPages(
  wiki: FakeWiki,
  pageTitles: string[],
  pagePreviews: Record<string, PagePreviewCache>,
): SuggestionQueueItem[] {
  const items: SuggestionQueueItem[] = []

  for (const pageTitle of pageTitles) {
    const veRun = getCachedRun(pageTitle)
    if (!veRun) continue

    const cards = filterDashpageSuggestions(cardsFromCachedRun(wiki, veRun))
    const card = pickRandomSuggestion(cards)
    if (!card) continue

    const pagePreview = pagePreviews[pageTitle] ?? {}
    items.push({
      pageTitle,
      card,
      pagePreview,
      editHref: editUrlForSuggestionCard(
        wiki,
        pageTitle,
        card,
        veRun?.pageSource,
      ),
    })
  }

  return shuffleQueue(items)
}

async function collectSuggestionsForPages(
  wiki: FakeWiki,
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

    const pipelineResult = await runVeSuggestionsPipeline(wiki, pageTitle, {
      forceRefresh: pageNeedsVeRefresh(wiki, pageTitle, forceRefresh),
      maxSuggestions: 1,
      excludeSuggestionTypes: [...DASHPAGE_EXCLUDED_SUGGESTION_TYPES],
    })

    if (pipelineResult.error && !pipelineResult.cards.length) {
      recordPipelineError(pipelineResult.error)
      continue
    }

    if (pipelineResult.error) {
      recordPipelineError(pipelineResult.error)
    }

    const eligibleCards = filterDashpageSuggestions(pipelineResult.cards)
    const card = eligibleCards[0] ?? null
    if (!card) continue

    const item: SuggestionQueueItem = {
      pageTitle,
      card,
      pagePreview: getPagePreview?.(pageTitle) ?? {},
      editHref: editUrlForSuggestionCard(
        wiki,
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

async function fetchMorelikePicks(
  seedTitles: string[],
  excludeTitles: string[],
  limit: number,
  signal: AbortSignal,
  recordPipelineError: (message: string) => void,
  lang: string,
): Promise<string[]> {
  try {
    return await fetchMorelikePageTitles(seedTitles, {
      limit,
      excludeTitles,
      signal,
      lang,
    })
  } catch (caught) {
    if (caught instanceof FetchMorelikePageTitlesError && caught.code === 'aborted') {
      throw caught
    }
    const message =
      caught instanceof FetchMorelikePageTitlesError
        ? caught.message
        : caught instanceof Error
          ? caught.message
          : String(caught)
    recordPipelineError(message)
    return []
  }
}

function previewFromQueue(
  queue: SuggestionQueueItem[],
  index: number,
): SuggestionModeModuleBind {
  if (!queue.length) {
    return {
      emptyMessage: 'No suggestions found. Try refresh.',
      showRefresh: true,
    }
  }

  const safeIndex = Math.max(0, Math.min(index, queue.length - 1))
  const item = queue[safeIndex]

  return {
    ...queueItemToBind(item),
    totalSuggestionCount: queue.length,
    currentIndex: safeIndex,
    queueLength: queue.length,
    canGoPrev: safeIndex > 0,
    canGoNext: safeIndex < queue.length - 1,
  }
}

const loading = ref(false)
const error = ref<string | null>(null)
const hasStarted = ref(false)
const lastFetchedAt = ref<number | null>(null)
const selectedPageTitles = ref<string[]>([])
const pagePreviews = ref<Record<string, PagePreviewCache>>({})
const queue = ref<SuggestionQueueItem[]>([])
const currentIndex = ref(0)
const cachedRealTitles = ref<string[]>([])

let abortController: AbortController | null = null
let loadedUserKey: string | null = null
let watchRegistered = false

export function useDashpageSuggestionModule(): {
  moduleProps: ComputedRef<SuggestionModeModuleBind>
  fullscreenProps: ComputedRef<SuggestionModeModuleBind>
  feedModuleProps: ComputedRef<SuggestionFeedModuleBind>
  feedFullscreenProps: ComputedRef<SuggestionFeedModuleBind>
  onSuggestionLoad: () => void
  onSuggestionRefresh: () => void
  onSuggestionNavigate: (delta: number) => void
  onSuggestionOpenFullscreen: () => void
} {
  const { user, realUsername, lang, currentUserPageLists } = useConfig()

  function activeWikiLang(): string {
    return normalizeLang(lang.value)
  }

  function hasRenderableData(): boolean {
    return queue.value.length > 0
  }

  async function enrichQueuePreviewsBatch(
    pageTitles: string[],
    signal: AbortSignal,
  ): Promise<void> {
    const titlesToFetch = [...new Set(pageTitles)].filter((title) => {
      const preview = pagePreviews.value[title]
      return !preview?.shortDescription?.trim() || !preview?.thumbnailSrc?.trim()
    })
    if (!titlesToFetch.length) return

    try {
      const previews = await fetchPagePreviewMetadataBatch(titlesToFetch, {
        signal,
        lang: activeWikiLang(),
      })
      if (signal.aborted) return

      pagePreviews.value = { ...pagePreviews.value, ...previews }

      queue.value = queue.value.map((entry) => {
        const preview = previews[entry.pageTitle] ?? pagePreviews.value[entry.pageTitle]
        if (!preview) return entry
        return {
          ...entry,
          pagePreview: { ...entry.pagePreview, ...preview },
        }
      })
    } catch (caught) {
      if (caught instanceof FetchUserEditedPageTitlesError && caught.code === 'aborted') {
        return
      }
    }
  }

  function getPagePreview(pageTitle: string): PagePreviewCache {
    return pagePreviews.value[pageTitle] ?? {}
  }

  function mergeQueueItemPreview(item: SuggestionQueueItem): SuggestionQueueItem {
    return {
      ...item,
      pagePreview: { ...getPagePreview(item.pageTitle), ...item.pagePreview },
    }
  }

  function persistCache(userKey: string): void {
    setDashpageSuggestionModuleCache(userKey, {
      fetchedAt: Date.now(),
      selectedPageTitles: selectedPageTitles.value,
      pagePreviews: pagePreviews.value,
      currentIndex: currentIndex.value,
    })
  }

  function applyQueue(nextQueue: SuggestionQueueItem[], index = 0): void {
    queue.value = nextQueue
    currentIndex.value = nextQueue.length ? Math.max(0, Math.min(index, nextQueue.length - 1)) : 0
  }

  function loadFromModuleCache(userKey: string): void {
    if (loadedUserKey === userKey && queue.value.length > 0) {
      return
    }

    const cached = getDashpageSuggestionModuleCache(userKey)
    if (!cached) {
      loadedUserKey = userKey
      hasStarted.value = false
      lastFetchedAt.value = null
      selectedPageTitles.value = []
      pagePreviews.value = {}
      queue.value = []
      currentIndex.value = 0
      return
    }

    loadedUserKey = userKey
    hasStarted.value = true
    lastFetchedAt.value = cached.fetchedAt
    selectedPageTitles.value = cached.selectedPageTitles
    pagePreviews.value = cached.pagePreviews ?? {}
    applyQueue(
      buildQueueFromPages(
        createSuggestionWiki(activeWikiLang()),
        cached.selectedPageTitles,
        pagePreviews.value,
      ),
      cached.currentIndex,
    )
    error.value = null
  }

  function loadRealPortfolioFromCache(): void {
    if (user.value !== 'real') {
      cachedRealTitles.value = []
      return
    }

    const portfolio = getPortfolioCache(realUsername.value, activeWikiLang())
    cachedRealTitles.value = portfolio?.titles ?? []
  }

  if (!watchRegistered) {
    watchRegistered = true
    watch(
      [user, realUsername, lang],
      ([activeUser, username, activeLang]) => {
        error.value = null
        loadRealPortfolioFromCache()
        loadFromModuleCache(
          dashpageSuggestionUserKey(activeUser, username, normalizeLang(activeLang)),
        )
      },
      { immediate: true },
    )
  }

  async function runPipeline(forceRefresh: boolean): Promise<void> {
    abortController?.abort()
    abortController = new AbortController()
    const { signal } = abortController

    hasStarted.value = true
    loading.value = true
    error.value = null

    const wikiLang = activeWikiLang()
    const wiki = createSuggestionWiki(wikiLang)
    const userKey = dashpageSuggestionUserKey(user.value, realUsername.value, wikiLang)
    const accumulated: SuggestionQueueItem[] = []

    if (forceRefresh) {
      queue.value = []
      currentIndex.value = 0
      pagePreviews.value = {}
      selectedPageTitles.value = []
    }

    const onItem = async (item: SuggestionQueueItem): Promise<void> => {
      const itemWithPreview = mergeQueueItemPreview(item)
      accumulated.push(itemWithPreview)
      queue.value = [...accumulated]
      selectedPageTitles.value = accumulated.map((entry) => entry.pageTitle)
      lastFetchedAt.value = Date.now()
      persistCache(userKey)
      await enrichQueuePreviewsBatch(
        accumulated.map((entry) => entry.pageTitle),
        signal,
      )
      if (!signal.aborted) {
        persistCache(userKey)
      }
    }

    try {
      if (user.value === 'real') {
        let portfolio = getPortfolioCache(realUsername.value, wikiLang)
        if (!portfolio) {
          const titles = await fetchUserEditedPageTitles(realUsername.value, {
            signal,
            lang: wikiLang,
          })
          portfolio = setPortfolioCache(realUsername.value, titles, wikiLang)
        }
        cachedRealTitles.value = portfolio.titles
      }

      const portfolio = getPortfolioPagesForUser(
        user.value,
        currentUserPageLists.value,
        cachedRealTitles.value,
      )
      const portfolioPool = portfolioPoolForDashpage(user.value, portfolio)

      if (user.value === 'real' && !portfolioPool.length) {
        applyQueue([], 0)
        selectedPageTitles.value = []
        pagePreviews.value = {}
        lastFetchedAt.value = Date.now()
        persistCache(userKey)
        return
      }

      const excludeTitles = forceRefresh ? selectedPageTitles.value : []

      const recordPipelineError = (message: string): void => {
        if (!error.value) error.value = message
      }

      const poolPagePicks = pickUpToRandomPages(
        portfolioPool,
        DASHPAGE_SUGGESTION_POOL_MAX,
        excludeTitles,
      )

      const poolItems = await collectSuggestionsForPages(
        wiki,
        poolPagePicks,
        forceRefresh,
        signal,
        recordPipelineError,
        onItem,
        getPagePreview,
      )

      if (signal.aborted) return

      const triedPageTitles = [...poolPagePicks]

      const seedTitles = pickUpToRandomPages(
        portfolioPool,
        DASHPAGE_MORELIKE_SEED_COUNT,
      )

      let morelikePagePicks: string[] = []
      try {
        morelikePagePicks = await fetchMorelikePicks(
          seedTitles,
          [...excludeTitles, ...triedPageTitles, ...seedTitles],
          DASHPAGE_SUGGESTION_MORELIKE_MAX,
          signal,
          recordPipelineError,
          wikiLang,
        )
      } catch (caught) {
        if (caught instanceof FetchMorelikePageTitlesError && caught.code === 'aborted') {
          return
        }
        throw caught
      }

      triedPageTitles.push(...morelikePagePicks)

      let morelikeItems = await collectSuggestionsForPages(
        wiki,
        morelikePagePicks,
        forceRefresh,
        signal,
        recordPipelineError,
        onItem,
        getPagePreview,
      )

      if (signal.aborted) return

      const queueCount = poolItems.length + morelikeItems.length
      if (
        queueCount < DASHPAGE_SUGGESTION_MIN_QUEUE &&
        triedPageTitles.length < DASHPAGE_SUGGESTION_MAX_TRIED_PAGES
      ) {
        const supplementSeeds = pickUpToRandomPages(
          portfolioPool,
          DASHPAGE_MORELIKE_SEED_COUNT,
          triedPageTitles,
        )

        let supplementPagePicks: string[] = []
        try {
          supplementPagePicks = await fetchMorelikePicks(
            supplementSeeds,
            [...excludeTitles, ...triedPageTitles, ...supplementSeeds],
            DASHPAGE_SUGGESTION_MORELIKE_SUPPLEMENT_MAX,
            signal,
            recordPipelineError,
            wikiLang,
          )
        } catch (caught) {
          if (caught instanceof FetchMorelikePageTitlesError && caught.code === 'aborted') {
            return
          }
          throw caught
        }

        if (supplementPagePicks.length) {
          morelikeItems = [
            ...morelikeItems,
            ...(await collectSuggestionsForPages(
              wiki,
              supplementPagePicks,
              forceRefresh,
              signal,
              recordPipelineError,
              onItem,
              getPagePreview,
            )),
          ]
        }
      }

      if (signal.aborted) return

      const nextQueue = shuffleQueue([...poolItems, ...morelikeItems])
      const queuePageTitles = nextQueue.map((item) => item.pageTitle)

      for (const item of nextQueue) {
        item.pagePreview = pagePreviews.value[item.pageTitle] ?? item.pagePreview
      }

      selectedPageTitles.value = queuePageTitles
      applyQueue(nextQueue, forceRefresh ? 0 : Math.min(currentIndex.value, nextQueue.length - 1))
      lastFetchedAt.value = Date.now()
      persistCache(userKey)
    } catch (caught) {
      if (
        (caught instanceof FetchUserEditedPageTitlesError && caught.code === 'aborted') ||
        (caught instanceof FetchMorelikePageTitlesError && caught.code === 'aborted')
      ) {
        return
      }
      const message =
        caught instanceof FetchUserEditedPageTitlesError ||
        caught instanceof FetchMorelikePageTitlesError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : String(caught)
      error.value = message
    } finally {
      loading.value = false
    }
  }

  function baseProps(): SuggestionModeModuleBind {
    if (shouldShowDashpageLoadPrompt(hasStarted.value, hasRenderableData())) {
      return {
        loadPending: true,
        refreshing: loading.value,
        refreshError: error.value,
      }
    }

    if (!loading.value && hasStarted.value && !queue.value.length) {
      return {
        emptyMessage: 'No suggestions found. Try refresh.',
        showRefresh: true,
        refreshing: loading.value,
        refreshError: error.value,
      }
    }

    if (loading.value && !queue.value.length) {
      return {
        showRefresh: true,
        refreshing: loading.value,
        refreshError: error.value,
      }
    }

    const preview = previewFromQueue(queue.value, currentIndex.value)
    return {
      ...preview,
      showRefresh: true,
      refreshing: loading.value,
      refreshError: error.value,
    }
  }

  const moduleProps = computed((): SuggestionModeModuleBind => {
    const props = baseProps()
    if (props.loadPending || props.emptyMessage) {
      return props
    }

    // Homepage card: show first item only, counter uses full queue length.
    const first = queue.value[0]
    if (!first) return props

    return {
      ...queueItemToBind(first),
      showRefresh: true,
      refreshing: loading.value,
      refreshError: error.value,
      totalSuggestionCount: queue.value.length > 1 ? queue.value.length : undefined,
    }
  })

  const fullscreenProps = computed((): SuggestionModeModuleBind => baseProps())

  function feedBaseProps(): SuggestionFeedModuleBind {
    if (shouldShowDashpageLoadPrompt(hasStarted.value, hasRenderableData())) {
      return {
        loadPending: true,
        refreshing: loading.value,
        refreshError: error.value,
      }
    }

    if (!loading.value && hasStarted.value && !queue.value.length) {
      return {
        emptyMessage: 'No suggestions found. Try refresh.',
        showRefresh: true,
        refreshing: loading.value,
        refreshError: error.value,
      }
    }

    if (loading.value && !queue.value.length) {
      return {
        showRefresh: true,
        refreshing: loading.value,
        refreshError: error.value,
      }
    }

    return {
      items: queueToFeedItems(queue.value),
      showRefresh: true,
      refreshing: loading.value,
      refreshError: error.value,
    }
  }

  const feedModuleProps = computed((): SuggestionFeedModuleBind => {
    const props = feedBaseProps()
    if (props.loadPending || props.emptyMessage || !props.items?.length) {
      return props
    }

    return {
      ...props,
      items: props.items.slice(0, DASHPAGE_SUGGESTION_FEED_PREVIEW_MAX),
    }
  })

  const feedFullscreenProps = computed((): SuggestionFeedModuleBind => feedBaseProps())

  function onSuggestionLoad(): void {
    void runPipeline(false)
  }

  function onSuggestionRefresh(): void {
    void runPipeline(true)
  }

  function onSuggestionNavigate(delta: number): void {
    if (!queue.value.length) return

    const nextIndex = currentIndex.value + delta
    if (nextIndex < 0 || nextIndex >= queue.value.length) return

    currentIndex.value = nextIndex
    persistCache(dashpageSuggestionUserKey(user.value, realUsername.value, activeWikiLang()))
  }

  /** Homepage preview always shows queue[0]; align fullscreen before navigating. */
  function onSuggestionOpenFullscreen(): void {
    if (!queue.value.length || currentIndex.value === 0) return

    currentIndex.value = 0
    persistCache(dashpageSuggestionUserKey(user.value, realUsername.value, activeWikiLang()))
  }

  return {
    moduleProps,
    fullscreenProps,
    feedModuleProps,
    feedFullscreenProps,
    onSuggestionLoad,
    onSuggestionRefresh,
    onSuggestionNavigate,
    onSuggestionOpenFullscreen,
  }
}
