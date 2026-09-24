import { ref } from 'vue'

import {
  createSuggestedEditsFeed,
  type SuggestedEditsFeed,
} from './data/fetchWikitabSuggestedEdits'
import { fetchWikitabPageSummary } from './data/fetchWikitabPageSummary'
import {
  buildSuggestedEditsSavedFingerprint,
  isCacheBypassed,
  readCachedSuggestedEdits,
  utcDayKey,
  writeCachedSuggestedEdits,
} from './data/suggestedEditsCache'
import type { WikitabSavedArticle } from './data/wikitabConfig'
import { WIKITAB_SUGGESTED_EDITS_MODULE_SPEC, type WikitabCardData } from './sections'

const { initialCount, pageSize } = WIKITAB_SUGGESTED_EDITS_MODULE_SPEC

function cardPageid(card: WikitabCardData): number | null {
  const match = card.key.match(/^suggested-edits:(\d+)$/)
  return match ? Number(match[1]) : null
}

function seenPageidsFromCards(cards: readonly WikitabCardData[]): Set<number> {
  const seen = new Set<number>()
  for (const card of cards) {
    const pageid = cardPageid(card)
    if (pageid !== null) seen.add(pageid)
  }
  return seen
}

function sessionCacheKey(day: string, savedFingerprint: string): string {
  return `${day}:${savedFingerprint}`
}

export function useWikitabSuggestedEdits() {
  const items = ref<WikitabCardData[]>([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const hasMore = ref(false)
  const error = ref<string | null>(null)

  let controller: AbortController | null = null
  let activeFeed: SuggestedEditsFeed | null = null
  let cacheContext: { day: string; savedFingerprint: string } | null = null
  let savedArticlesSnapshot: WikitabSavedArticle[] = []
  let loadedSessionKey: string | null = null
  let feedLock: Promise<void> = Promise.resolve()

  function withFeedLock<T>(operation: () => Promise<T>): Promise<T> {
    const run = feedLock.then(operation, operation)
    feedLock = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  function patchCard(pageid: number, patch: Partial<WikitabCardData>): void {
    items.value = items.value.map((card) => {
      if (cardPageid(card) !== pageid) return card
      return { ...card, ...patch }
    })
  }

  function scheduleThumbnailBackfill(card: WikitabCardData, signal: AbortSignal): void {
    if (card.thumbnailUrl) return

    const title = card.title ?? card.linkTitle
    if (!title) return

    void fetchWikitabPageSummary(title, signal, 'wikitab-suggested-edits-thumbnail')
      .then((summary) => {
        if (signal.aborted || !summary?.thumbnailUrl) return
        const pageid = cardPageid(card)
        if (pageid === null) return
        patchCard(pageid, { thumbnailUrl: summary.thumbnailUrl })
        persistCache()
      })
      .catch((cause) => {
        if (signal.aborted || (cause as Error)?.name === 'AbortError') return
      })
  }

  function persistCache(): void {
    if (!cacheContext) return
    writeCachedSuggestedEdits(
      cacheContext.day,
      cacheContext.savedFingerprint,
      items.value,
      activeFeed?.hasPending() ?? hasMore.value,
    )
  }

  function applyCachedItems(
    cached: WikitabCardData[],
    cachedHasMore: boolean,
    day: string,
    savedFingerprint: string,
  ): void {
    items.value = cached
    loadedSessionKey = sessionCacheKey(day, savedFingerprint)
    cacheContext = { day, savedFingerprint }
    activeFeed = null
    loading.value = false
    loadingMore.value = false
    error.value = null
    hasMore.value = cachedHasMore || cached.length > initialCount
  }

  function clearState(): void {
    items.value = []
    loading.value = false
    loadingMore.value = false
    hasMore.value = false
    error.value = null
    activeFeed = null
    cacheContext = null
    savedArticlesSnapshot = []
    loadedSessionKey = null
  }

  async function ensureActiveFeed(signal: AbortSignal | undefined): Promise<boolean> {
    if (activeFeed) return true
    if (!cacheContext || !savedArticlesSnapshot.length) return false

    activeFeed = createSuggestedEditsFeed(
      savedArticlesSnapshot,
      cacheContext.day,
      signal,
      seenPageidsFromCards(items.value),
    )
    return activeFeed !== null
  }

  async function appendOne(signal: AbortSignal | undefined): Promise<WikitabCardData | null> {
    if (!activeFeed) return null

    const card = await activeFeed.takeNext(signal)
    if (!card) return null

    items.value = [...items.value, card]
    scheduleThumbnailBackfill(card, signal ?? new AbortController().signal)
    persistCache()
    return card
  }

  async function appendMany(count: number, signal: AbortSignal | undefined): Promise<void> {
    for (let i = 0; i < count; i++) {
      const card = await appendOne(signal)
      if (!card) break
    }
  }

  async function refresh(savedArticles: readonly WikitabSavedArticle[] = []): Promise<void> {
    if (!savedArticles.length) {
      controller?.abort()
      clearState()
      return
    }

    const day = utcDayKey()
    const savedFingerprint = buildSuggestedEditsSavedFingerprint(
      savedArticles.map((article) => article.titleKey),
    )
    const key = sessionCacheKey(day, savedFingerprint)

    if (!isCacheBypassed() && loadedSessionKey === key && items.value.length > 0) {
      hasMore.value = activeFeed?.hasPending() ?? hasMore.value
      error.value = null
      return
    }

    controller?.abort()
    const local = new AbortController()
    controller = local
    const { signal } = local

    activeFeed = null
    savedArticlesSnapshot = savedArticles.map((article) => ({ ...article }))
    cacheContext = { day, savedFingerprint }

    const cached = readCachedSuggestedEdits(day, savedFingerprint)
    if (cached) {
      applyCachedItems(cached.items, cached.hasMore, day, savedFingerprint)
      return
    }

    loading.value = true
    loadingMore.value = false
    error.value = null
    items.value = []
    loadedSessionKey = key
    hasMore.value = false

    try {
      await withFeedLock(async () => {
        activeFeed = createSuggestedEditsFeed(savedArticlesSnapshot, day, signal)
        if (!activeFeed) return
        await appendMany(initialCount, signal)
      })

      if (signal.aborted) return

      hasMore.value = activeFeed?.hasPending() ?? false
      persistCache()
    } catch (cause) {
      if (signal.aborted || (cause as Error)?.name === 'AbortError') return
      error.value = 'Could not load suggestions.'
      items.value = []
      loadedSessionKey = null
      activeFeed = null
    } finally {
      if (controller === local) loading.value = false
    }
  }

  async function loadMore(): Promise<void> {
    if (loadingMore.value || loading.value) return
    if (!savedArticlesSnapshot.length || !cacheContext) {
      hasMore.value = false
      return
    }

    loadingMore.value = true

    let signal = controller?.signal
    if (!controller) {
      const local = new AbortController()
      controller = local
      signal = local.signal
    }

    try {
      await withFeedLock(async () => {
        if (!(await ensureActiveFeed(signal))) {
          hasMore.value = false
          return
        }

        await appendMany(pageSize, signal)
        if (signal?.aborted) return

        hasMore.value = activeFeed?.hasPending() ?? false
        if (!activeFeed?.hasPending()) activeFeed = null
        persistCache()
      })
    } catch (cause) {
      if (signal?.aborted || (cause as Error)?.name === 'AbortError') return
    } finally {
      if (!signal?.aborted) loadingMore.value = false
    }
  }

  function abort(): void {
    controller?.abort()
    loading.value = false
    loadingMore.value = false
  }

  return { items, loading, loadingMore, hasMore, error, refresh, loadMore, abort }
}
