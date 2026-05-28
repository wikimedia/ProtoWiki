import { computed, ref, watch } from 'vue'

import { useConfig } from '@/composables/useConfig'
import { normalizeLang } from '@/lib/config'
import {
  dashpageRecentChangesUserKey,
  getDashpageRecentChangesCache,
  setDashpageRecentChangesCache,
} from '@/lib/dashpageRecentChangesCache'
import { shouldShowDashpageLoadPrompt } from '@/lib/dashpageLoadState'
import type { RecentChangeFeedItem } from '@/lib/dashpageRecentChangesTypes'
import { sortRecentChangeFeedItems } from '@/lib/dashpageRecentChangesTypes'
import { runDashpageRecentChangesPipeline, createDashpageRecentChangesWiki } from '@/lib/fetchDashpageRecentChanges'
import { DASHPAGE_RC_FULLSCREEN_MAX } from '@/lib/dashpageRecentChangesConstants'
import { getPortfolioCache, setPortfolioCache } from '@/lib/dashpagePortfolioCache'
import { fetchUserEditedPageTitles, FetchUserEditedPageTitlesError } from '@/lib/fetchUserEditedPageTitles'
import { FetchMorelikePageTitlesError } from '@/lib/fetchMorelikePageTitles'

export interface RecentChangesModuleBind {
  items?: RecentChangeFeedItem[]
  loadPending?: boolean
  showRefresh?: boolean
  refreshing?: boolean
  refreshError?: string | null
  emptyMessage?: string | null
}

const items = ref<RecentChangeFeedItem[]>([])
const hasStarted = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const cachedRealTitles = ref<string[]>([])
const lastFetchedAt = ref<number | null>(null)

let abortController: AbortController | null = null
let persistTimer: ReturnType<typeof setTimeout> | null = null

function hasRenderableData(): boolean {
  return items.value.length > 0
}

function schedulePersistCache(userKey: string): void {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    if (!items.value.length) return
    setDashpageRecentChangesCache(userKey, {
      fetchedAt: Date.now(),
      items: items.value,
    })
    lastFetchedAt.value = Date.now()
  }, 300)
}

function applyItemsOrder(): void {
  items.value = sortRecentChangeFeedItems(items.value)
}

function upsertItem(nextItem: RecentChangeFeedItem): void {
  const index = items.value.findIndex((item) => item.revId === nextItem.revId)
  if (index >= 0) {
    items.value[index] = { ...items.value[index], ...nextItem }
  } else {
    items.value = [...items.value, nextItem]
  }
  applyItemsOrder()
}

function patchItem(revId: number, patch: Partial<RecentChangeFeedItem>): void {
  const index = items.value.findIndex((item) => item.revId === revId)
  if (index < 0) return
  items.value[index] = { ...items.value[index], ...patch }
  items.value = [...items.value]
}

function removeItem(revId: number): void {
  items.value = items.value.filter((item) => item.revId !== revId)
}

function trimItemsToFeedCap(): void {
  applyItemsOrder()
  if (items.value.length > DASHPAGE_RC_FULLSCREEN_MAX) {
    items.value = items.value.slice(0, DASHPAGE_RC_FULLSCREEN_MAX)
  }
}

function loadFromModuleCache(userKey: string): void {
  const cached = getDashpageRecentChangesCache(userKey)
  if (!cached) {
    hasStarted.value = false
    lastFetchedAt.value = null
    items.value = []
    return
  }

  hasStarted.value = true
  lastFetchedAt.value = cached.fetchedAt
  items.value = sortRecentChangeFeedItems(cached.items).slice(0, DASHPAGE_RC_FULLSCREEN_MAX)
  error.value = null
}

function loadRealPortfolioFromCache(username: string, wiki: string): void {
  const portfolio = getPortfolioCache(username, wiki)
  cachedRealTitles.value = portfolio?.titles ?? []
}

export function useDashpageRecentChangesModule() {
  const { user, realUsername, lang, currentUserPageLists } = useConfig()

  watch(
    [user, realUsername, lang],
    ([activeUser, username, activeLang]) => {
      error.value = null
      const wikiLang = normalizeLang(activeLang)
      if (activeUser === 'real') {
        loadRealPortfolioFromCache(username, wikiLang)
      } else {
        cachedRealTitles.value = []
      }
      loadFromModuleCache(dashpageRecentChangesUserKey(activeUser, username, wikiLang))
    },
    { immediate: true },
  )

  async function runPipeline(forceRefresh: boolean): Promise<void> {
    abortController?.abort()
    abortController = new AbortController()
    const { signal } = abortController

    hasStarted.value = true
    loading.value = true
    error.value = null

    const wikiLang = normalizeLang(lang.value)
    const userKey = dashpageRecentChangesUserKey(user.value, realUsername.value, wikiLang)
    const excludeRevIds = items.value.map((item) => item.revId)
    let replaceOnFirstSkeleton = items.value.length > 0

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

      await runDashpageRecentChangesPipeline({
        user: user.value,
        pageLists: currentUserPageLists.value,
        cachedRealTitles: cachedRealTitles.value,
        excludeRevIds,
        signal,
        lang: wikiLang,
        wiki: createDashpageRecentChangesWiki(wikiLang),
        handlers: {
          onSkeleton: (item) => {
            if (replaceOnFirstSkeleton) {
              items.value = []
              replaceOnFirstSkeleton = false
            }
            upsertItem(item)
            schedulePersistCache(userKey)
          },
          onPatch: (revId, patch) => {
            patchItem(revId, patch)
            schedulePersistCache(userKey)
          },
          onRemove: (revId) => {
            removeItem(revId)
            schedulePersistCache(userKey)
          },
        },
      })

      if (signal.aborted) return

      trimItemsToFeedCap()

      if (items.value.length) {
        setDashpageRecentChangesCache(userKey, {
          fetchedAt: Date.now(),
          items: items.value,
        })
        lastFetchedAt.value = Date.now()
      }
    } catch (caught) {
      if (
        (caught instanceof FetchUserEditedPageTitlesError && caught.code === 'aborted') ||
        (caught instanceof FetchMorelikePageTitlesError && caught.code === 'aborted') ||
        (caught instanceof DOMException && caught.name === 'AbortError')
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

  function baseProps(): RecentChangesModuleBind {
    if (shouldShowDashpageLoadPrompt(hasStarted.value, hasRenderableData())) {
      return {
        loadPending: true,
        refreshing: loading.value,
        refreshError: error.value,
      }
    }

    if (!loading.value && hasStarted.value && !items.value.length) {
      return {
        emptyMessage: 'No recent changes found.',
        showRefresh: true,
        refreshing: loading.value,
        refreshError: error.value,
      }
    }

    return {
      items: items.value,
      showRefresh: true,
      refreshing: loading.value,
      refreshError: error.value,
    }
  }

  const moduleProps = computed((): RecentChangesModuleBind => baseProps())
  const fullscreenProps = computed((): RecentChangesModuleBind => baseProps())

  function onRecentChangesLoad(): void {
    void runPipeline(false)
  }

  function onRecentChangesRefresh(): void {
    void runPipeline(true)
  }

  return {
    moduleProps,
    fullscreenProps,
    onRecentChangesLoad,
    onRecentChangesRefresh,
  }
}
