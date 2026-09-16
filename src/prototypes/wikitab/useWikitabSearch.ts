import { computed, ref, watch } from 'vue'
import type { MenuItemData } from '@wikimedia/codex'

import { fetchWikitabSearch, type WikitabSearchResult } from './data/fetchWikitabSearch'

const DEBOUNCE_MS = 200

/** Reserved menu item value for the inert “Search for …” row. */
export const WIKITAB_SEARCH_FOR_VALUE = 'wikitab-search-for'

export function useWikitabSearch() {
  const query = ref('')
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

  function syncMenuExpanded(): void {
    if (focused.value && trimmedQuery.value.length > 0) {
      menuExpanded.value = true
    } else if (!trimmedQuery.value.length) {
      menuExpanded.value = false
    }
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

    loading.value = true
    syncMenuExpanded()
    lastFetchedQuery = trimmed

    try {
      const found = await fetchWikitabSearch(trimmed, { signal })
      if (signal.aborted || lastFetchedQuery !== trimmed) return
      results.value = found
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
    loading.value = true
    syncMenuExpanded()
    scheduleSearch(value)
  }

  function onFocus(): void {
    focused.value = true
    syncMenuExpanded()
  }

  function onBlur(): void {
    focused.value = false
    menuExpanded.value = false
  }

  watch(menuExpanded, (expanded) => {
    if (!expanded) {
      selected.value = null
    }
  })

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
  }
}
