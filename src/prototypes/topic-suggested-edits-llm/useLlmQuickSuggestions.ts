import { ref } from 'vue'

import { useConfig } from '@/composables/useConfig'
import {
  offPrototypeUserSettingsPopoverClose,
  onPrototypeUserSettingsPopoverClose,
} from '@/composables/usePrototypeUserSettingsPopoverClose'
import { normalizeWikiUsername, type ConfigUser } from '@/lib/config'
import {
  FetchUserEditedPageTitlesError,
  fetchUserEditedPageTitles,
} from '@/lib/fetchUserEditedPageTitles'
import {
  LiftWingQwenChatError,
  parseJsonStringArray,
  streamChatCompletion,
} from '@/lib/liftWingQwenChat'

import { QUICK_SUGGESTIONS_STORAGE_KEY } from './fixtures'
import { resolveLlmUserContext } from './llmUserContext'
import { buildQuickSuggestionsPrompt } from './prompts'

const QUICK_SUGGESTION_COUNT = 2

interface QuickSuggestionsCacheEntry {
  user: ConfigUser
  lang: string
  realUsername?: string
  queries: string[]
  fetchedAt: number
}

type QuickSuggestionsCacheStore = Record<string, QuickSuggestionsCacheEntry>

function cacheStoreKey(user: ConfigUser, lang: string, realUsername = ''): string {
  if (user === 'real') {
    const normalized = normalizeWikiUsername(realUsername)
    return normalized ? `real:${normalized}:${lang}` : `real:${lang}`
  }
  return `${user}:${lang}`
}

function loadCacheStore(): QuickSuggestionsCacheStore {
  try {
    const raw = localStorage.getItem(QUICK_SUGGESTIONS_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as QuickSuggestionsCacheStore
  } catch {
    return {}
  }
}

function saveCacheStore(store: QuickSuggestionsCacheStore): void {
  try {
    localStorage.setItem(QUICK_SUGGESTIONS_STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Quota or private mode — ignore.
  }
}

function readCacheEntry(
  user: ConfigUser,
  lang: string,
  realUsername = '',
): QuickSuggestionsCacheEntry | null {
  const entry = loadCacheStore()[cacheStoreKey(user, lang, realUsername)]
  if (!entry?.queries?.length) return null
  return entry
}

function writeCacheEntry(
  user: ConfigUser,
  lang: string,
  queries: string[],
  realUsername = '',
): QuickSuggestionsCacheEntry {
  const entry: QuickSuggestionsCacheEntry = {
    user,
    lang,
    ...(user === 'real' ? { realUsername: normalizeWikiUsername(realUsername) } : {}),
    queries,
    fetchedAt: Date.now(),
  }
  const store = loadCacheStore()
  store[cacheStoreKey(user, lang, realUsername)] = entry
  saveCacheStore(store)
  return entry
}

function createLlmQuickSuggestions() {
  const { user, lang, realUsername, currentUserPageLists } = useConfig()

  const queries = ref<string[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  let abortController: AbortController | null = null

  function applyCacheForCurrentUser(): boolean {
    return applyCacheEntry(
      readCacheEntry(user.value, lang.value, realUsername.value),
    )
  }

  function syncQuickSuggestionsAfterSettingsClose(): void {
    abortController?.abort()
    if (!applyCacheForCurrentUser()) {
      queries.value = []
    }
    void fetchQuickSuggestions(true)
  }

  const onSettingsPopoverClose = (): void => {
    syncQuickSuggestionsAfterSettingsClose()
  }

  function applyCacheEntry(entry: QuickSuggestionsCacheEntry | null): boolean {
    if (!entry?.queries?.length) return false
    queries.value = entry.queries.slice(0, QUICK_SUGGESTION_COUNT)
    return queries.value.length > 0
  }

  async function fetchQuickSuggestions(force = false): Promise<void> {
    const activeUser = user.value
    const activeLang = lang.value
    const activeRealUsername = realUsername.value

    if (!force) {
      const cached = readCacheEntry(activeUser, activeLang, activeRealUsername)
      if (applyCacheEntry(cached)) {
        initialized.value = true
        return
      }
    }

    abortController?.abort()
    abortController = new AbortController()
    const { signal } = abortController

    loading.value = true
    error.value = null

    try {
      const userContext = await resolveLlmUserContext(
        activeUser,
        activeLang,
        activeRealUsername,
        currentUserPageLists.value,
        signal,
      )

      if (signal.aborted) return

      const accumulated = await streamChatCompletion({
        messages: [
          {
            role: 'user',
            content: buildQuickSuggestionsPrompt(userContext),
          },
        ],
        maxTokens: 250,
        signal,
      })

      if (signal.aborted) return

      const parsed = parseJsonStringArray(accumulated).slice(0, QUICK_SUGGESTION_COUNT)
      if (parsed.length < QUICK_SUGGESTION_COUNT) {
        throw new LiftWingQwenChatError(
          `Expected ${QUICK_SUGGESTION_COUNT} quick suggestions but got ${parsed.length}`,
          'parse',
        )
      }

      queries.value = parsed
      writeCacheEntry(activeUser, activeLang, parsed, activeRealUsername)
    } catch (caught) {
      if (
        (caught instanceof LiftWingQwenChatError && caught.code === 'aborted') ||
        (caught instanceof FetchUserEditedPageTitlesError && caught.code === 'aborted')
      ) {
        return
      }
      error.value =
        caught instanceof Error ? caught.message : 'Could not load quick suggestions.'
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  function ensureQuickSuggestions(): void {
    if (initialized.value) return
    void fetchQuickSuggestions(false)
  }

  function refreshQuickSuggestions(): void {
    void fetchQuickSuggestions(true)
  }

  function bindSettingsPopoverClose(): void {
    onPrototypeUserSettingsPopoverClose(onSettingsPopoverClose)
  }

  function unbindSettingsPopoverClose(): void {
    offPrototypeUserSettingsPopoverClose(onSettingsPopoverClose)
  }

  return {
    queries,
    loading,
    error,
    ensureQuickSuggestions,
    refreshQuickSuggestions,
    bindSettingsPopoverClose,
    unbindSettingsPopoverClose,
  }
}

let llmQuickSuggestionsState: ReturnType<typeof createLlmQuickSuggestions> | null = null

export function useLlmQuickSuggestions() {
  if (!llmQuickSuggestionsState) {
    llmQuickSuggestionsState = createLlmQuickSuggestions()
  }
  return llmQuickSuggestionsState
}
