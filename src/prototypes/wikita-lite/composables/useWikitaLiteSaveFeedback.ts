import { inject, provide, ref, type Ref } from 'vue'

import { useConfig } from '@/composables/useConfig'

import {
  WIKITA_SAVE_FEEDBACK_KEY,
  type WikitaSaveFeedbackContext,
} from '../../musical-group/composables/useWikitaSaveFeedback'
import { normalizeEnwikiTitle } from '../../musical-group/data/enwikiTitle'
import { addPageToList, createList, removePageFromAllLists } from '../../musical-group/data/lists'

export function provideWikitaLiteSaveFeedback(): WikitaSaveFeedbackContext {
  const { currentUserPageLists, setCurrentUserPageList } = useConfig()

  const toastOpen = ref(false)
  const toastPageId = ref<string | null>(null)
  const toastPageTitle = ref('')
  const listsSheetOpen = ref(false)
  const listsSheetPageId = ref<string | null>(null)
  const listsSheetPageTitle = ref('')
  const listsSheetPageThumbnailUrl = ref<string | null>(null)
  const listsVersion = ref(0)
  const toastPageThumbnailUrl = ref<string | null>(null)

  function dismissToast(): void {
    toastOpen.value = false
    toastPageId.value = null
    toastPageTitle.value = ''
    toastPageThumbnailUrl.value = null
  }

  function toggleReadingListTitle(title: string): boolean {
    const normalized = normalizeEnwikiTitle(title)
    if (!normalized) return false

    const key = normalized.toLowerCase()
    const current = [...currentUserPageLists.value.readingList]
    const index = current.findIndex(
      (entry) => normalizeEnwikiTitle(entry).toLowerCase() === key,
    )

    if (index >= 0) {
      current.splice(index, 1)
      setCurrentUserPageList('readingList', current)
      return false
    }

    current.unshift(normalized)
    setCurrentUserPageList('readingList', current)
    return true
  }

  function savePage(pageId: string, pageTitle: string, thumbnailUrl?: string): boolean {
    const saved = toggleReadingListTitle(pageTitle)
    if (saved) {
      toastPageId.value = pageId
      toastPageTitle.value = pageTitle
      toastPageThumbnailUrl.value = thumbnailUrl ?? null
      toastOpen.value = true
    } else {
      removePageFromAllLists(pageId)
    }
    listsVersion.value += 1
    return saved
  }

  function openListsSheet(): void {
    const pageId = toastPageId.value
    if (!pageId) return
    listsSheetPageId.value = pageId
    listsSheetPageTitle.value = toastPageTitle.value
    listsSheetPageThumbnailUrl.value = toastPageThumbnailUrl.value
    listsSheetOpen.value = true
    dismissToast()
  }

  function closeListsSheet(): void {
    listsSheetOpen.value = false
    listsSheetPageId.value = null
    listsSheetPageTitle.value = ''
    listsSheetPageThumbnailUrl.value = null
  }

  function addToList(listId: string): void {
    const pageId = listsSheetPageId.value
    if (!pageId) return
    addPageToList(listId, pageId, listsSheetPageThumbnailUrl.value ?? undefined)
    listsVersion.value += 1
    closeListsSheet()
  }

  function createListAndAdd(): void {
    const pageId = listsSheetPageId.value
    if (!pageId) return
    const list = createList('New list')
    addPageToList(list.id, pageId, listsSheetPageThumbnailUrl.value ?? undefined)
    listsVersion.value += 1
    closeListsSheet()
  }

  const context: WikitaSaveFeedbackContext = {
    toastOpen,
    toastPageId,
    toastPageTitle,
    listsSheetOpen,
    listsSheetPageId,
    listsSheetPageTitle,
    listsVersion,
    savePage,
    dismissToast,
    openListsSheet,
    closeListsSheet,
    addToList,
    createListAndAdd,
  }

  provide(WIKITA_SAVE_FEEDBACK_KEY, context)
  return context
}

export function useWikitaLiteSaveFeedback(): WikitaSaveFeedbackContext {
  const context = inject(WIKITA_SAVE_FEEDBACK_KEY)
  if (!context) {
    throw new Error(
      'useWikitaLiteSaveFeedback() must be used within provideWikitaLiteSaveFeedback()',
    )
  }
  return context
}
