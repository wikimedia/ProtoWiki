import { reactive } from 'vue'

import { type PageListKey, PAGE_LIST_FIELD_KEYS } from '@/config'

/**
 * Page-list field draft / validation UI for mock user settings.
 * Module-scoped so it survives settings popover unmount/remount.
 */
const pageListDraft = reactive<Partial<Record<PageListKey, string>>>({})
const pageListNotFoundByField = reactive<Partial<Record<PageListKey, string[]>>>({})
const dirtyPageLists = reactive(new Set<PageListKey>())
const normalizingPageLists = reactive(new Set<PageListKey>())

export function usePageListFieldUiState() {
  function clearPageListUiState(): void {
    for (const field of PAGE_LIST_FIELD_KEYS) {
      delete pageListDraft[field]
      delete pageListNotFoundByField[field]
    }
    dirtyPageLists.clear()
  }

  function markPageListDirty(field: PageListKey): void {
    dirtyPageLists.add(field)
    delete pageListNotFoundByField[field]
  }

  function pageListFieldStatus(field: PageListKey): 'default' | 'error' {
    return pageListNotFoundByField[field]?.length ? 'error' : 'default'
  }

  function pageListNotFoundTitles(field: PageListKey): string[] {
    return pageListNotFoundByField[field] ?? []
  }

  function setPageListNotFound(field: PageListKey, titles: string[]): void {
    if (titles.length) pageListNotFoundByField[field] = titles
    else delete pageListNotFoundByField[field]
  }

  function isNormalizingPageList(field: PageListKey): boolean {
    return normalizingPageLists.has(field)
  }

  function setPageListDraft(field: PageListKey, text: string | undefined): void {
    if (text === undefined) delete pageListDraft[field]
    else pageListDraft[field] = text
  }

  function getPageListDraft(field: PageListKey): string | undefined {
    return pageListDraft[field]
  }

  function isPageListDirty(field: PageListKey): boolean {
    return dirtyPageLists.has(field)
  }

  function markPageListClean(field: PageListKey): void {
    dirtyPageLists.delete(field)
  }

  async function withPageListNormalization<T>(
    field: PageListKey,
    task: () => Promise<T>,
  ): Promise<T> {
    normalizingPageLists.add(field)
    try {
      return await task()
    } finally {
      normalizingPageLists.delete(field)
    }
  }

  return {
    clearPageListUiState,
    markPageListDirty,
    pageListFieldStatus,
    pageListNotFoundTitles,
    setPageListNotFound,
    isNormalizingPageList,
    setPageListDraft,
    getPageListDraft,
    isPageListDirty,
    markPageListClean,
    withPageListNormalization,
  }
}
