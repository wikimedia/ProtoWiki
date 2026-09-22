import { computed, nextTick, ref, watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { MenuItemData } from '@wikimedia/codex'

import {
  fetchWikitabSearchRaw,
  filterDisambiguationResults,
  WIKITAB_SEARCH_LIMIT,
  type WikitabSearchResult,
} from './data/fetchWikitabSearch'
import { bumpWikitabSearchMountKey } from './useWikitabSearchMount'

const DEBOUNCE_MS = 200

/** Reserved menu item value for the “Search for …” row. */
export const WIKITAB_SEARCH_FOR_VALUE = 'wikitab-search-for'

export function useWikitabSearch(options: { initialQuery?: Ref<string> } = {}) {
  const route = useRoute()
  const router = useRouter()

  const query = ref(options.initialQuery?.value ?? '')
  const results = ref<WikitabSearchResult[]>([])
  const loading = ref(false)
  const focused = ref(false)
  const selected = ref<string | number | null>(null)
  const menuExpanded = ref(false)

  const trimmedQuery = computed(() => query.value.trim())

  const menuItems = computed<MenuItemData[]>(() => {
    const trimmed = trimmedQuery.value
    if (!trimmed.length) return []

    const searchForRow: MenuItemData = {
      value: WIKITAB_SEARCH_FOR_VALUE,
      label: `Search for "${query.value}"`,
    }

    const resultRows = results.value.map((result) => ({
      value: result.id,
      label: result.title,
      description: result.description ?? null,
      thumbnail: result.thumbnailUrl ? { url: result.thumbnailUrl } : null,
    }))

    return [searchForRow, ...resultRows]
  })

  let abortController: AbortController | null = null
  let debounceHandle: ReturnType<typeof setTimeout> | undefined
  let lastFetchedQuery = ''
  let suppressSubmitClick = false

  function syncMenuExpanded(): void {
    if (focused.value && trimmedQuery.value.length > 0) {
      menuExpanded.value = true
    } else if (!trimmedQuery.value.length) {
      menuExpanded.value = false
    }
  }

  function navigateToSearch(searchTerm: string): void {
    const trimmed = searchTerm.trim()
    const nextQuery = { ...route.query }

    if (!trimmed.length) {
      delete nextQuery.search
      delete nextQuery.tab
    } else {
      nextQuery.search = trimmed
    }

    void router.push({ path: route.path, query: nextQuery }).then(() => {
      // Remount after the URL updates so initialQuery matches the submission.
      void nextTick(() => bumpWikitabSearchMountKey())
    })
  }

  async function runSearch(searchQuery: string): Promise<void> {
    const trimmed = searchQuery.trim()
    if (!trimmed.length) {
      results.value = []
      loading.value = false
      syncMenuExpanded()
      return
    }

    abortController?.abort()
    abortController = new AbortController()
    const { signal } = abortController

    loading.value = results.value.length === 0
    syncMenuExpanded()
    lastFetchedQuery = trimmed

    try {
      const raw = await fetchWikitabSearchRaw(trimmed, { signal })
      if (signal.aborted || lastFetchedQuery !== trimmed) return

      results.value = raw.slice(0, WIKITAB_SEARCH_LIMIT)
      loading.value = false
      syncMenuExpanded()

      const filtered = await filterDisambiguationResults(raw, {
        signal,
        limit: WIKITAB_SEARCH_LIMIT,
      })
      if (signal.aborted || lastFetchedQuery !== trimmed) return

      results.value = filtered
    } catch (err) {
      if (signal.aborted) return
      results.value = []
    } finally {
      if (!signal.aborted && lastFetchedQuery === trimmed) {
        loading.value = false
        syncMenuExpanded()
      }
    }
  }

  function scheduleSearch(value: string): void {
    if (debounceHandle) clearTimeout(debounceHandle)
    debounceHandle = setTimeout(() => {
      void runSearch(value)
    }, DEBOUNCE_MS)
  }

  function onInput(value: string): void {
    query.value = value
    const trimmed = value.trim()
    if (!trimmed.length) {
      abortController?.abort()
      results.value = []
      loading.value = false
      syncMenuExpanded()
      return
    }
    if (results.value.length === 0) {
      loading.value = true
    }
    syncMenuExpanded()
    scheduleSearch(value)
  }

  function onFocus(): void {
    focused.value = true
    syncMenuExpanded()
    const trimmed = trimmedQuery.value
    // Refocus after remount/blur: query is filled but lookahead was never fetched.
    if (
      trimmed.length > 0 &&
      (lastFetchedQuery !== trimmed || results.value.length === 0)
    ) {
      void runSearch(trimmed)
    }
  }

  function onBlur(): void {
    focused.value = false
    menuExpanded.value = false
  }

  function onSubmit(): void {
    if (suppressSubmitClick) return
    navigateToSearch(query.value)
  }

  /**
   * Enter with the menu open: activate the highlighted row (same as click).
   * Read the highlight before closing — Codex clears `selected` when the menu
   * collapses, so we cannot rely on v-model:selected after Enter.
   */
  function onEnterWithMenu(highlighted: { value: string | number } | null): void {
    suppressSubmitClick = true
    menuExpanded.value = false

    if (highlighted) {
      onMenuItemClick(highlighted.value)
    } else {
      suppressSubmitClick = false
      onSubmit()
    }

    void nextTick(() => {
      suppressSubmitClick = false
    })
  }

  function onMenuItemClick(payload: string | number | { value?: string | number }): void {
    const value =
      typeof payload === 'object' && payload !== null && 'value' in payload
        ? payload.value ?? null
        : payload

    if (value === WIKITAB_SEARCH_FOR_VALUE) {
      navigateToSearch(query.value)
      return
    }

    const result = results.value.find((item) => item.id === value)
    if (result) {
      navigateToSearch(result.title)
    }
  }

  watch(menuExpanded, (expanded) => {
    if (!expanded) {
      selected.value = null
    }
  })

  if (options.initialQuery) {
    watch(
      options.initialQuery,
      (value) => {
        if (query.value !== value) {
          query.value = value
        }
      },
      { immediate: true },
    )
  }

  return {
    query,
    trimmedQuery,
    results,
    loading,
    selected,
    menuExpanded,
    menuItems,
    onInput,
    onFocus,
    onBlur,
    onSubmit,
    onMenuItemClick,
    onEnterWithMenu,
  }
}
