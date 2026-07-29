import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'

import { toggleBookmark } from '../data/bookmarks'
import { addPageToList, createList, removePageFromAllLists } from '../data/lists'

export interface WikitaSaveFeedbackContext {
  toastOpen: Ref<boolean>
  toastPageId: Ref<string | null>
  toastPageTitle: Ref<string>
  listsSheetOpen: Ref<boolean>
  listsSheetPageId: Ref<string | null>
  listsSheetPageTitle: Ref<string>
  listsVersion: Ref<number>
  savePage: (pageId: string, pageTitle: string, thumbnailUrl?: string) => boolean
  dismissToast: () => void
  openListsSheet: () => void
  closeListsSheet: () => void
  addToList: (listId: string) => void
  createListAndAdd: () => void
}

export const WIKITA_SAVE_FEEDBACK_KEY: InjectionKey<WikitaSaveFeedbackContext> =
  Symbol('wikitaSaveFeedback')

export function provideWikitaSaveFeedback(): WikitaSaveFeedbackContext {
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

  function savePage(pageId: string, pageTitle: string, thumbnailUrl?: string): boolean {
    const saved = toggleBookmark(pageId)
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

export function useWikitaSaveFeedback(): WikitaSaveFeedbackContext {
  const context = inject(WIKITA_SAVE_FEEDBACK_KEY)
  if (!context) {
    throw new Error('useWikitaSaveFeedback() must be used within provideWikitaSaveFeedback()')
  }
  return context
}
