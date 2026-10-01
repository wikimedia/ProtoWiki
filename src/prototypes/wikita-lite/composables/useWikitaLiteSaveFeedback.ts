import { inject, provide, ref, type Ref } from 'vue'

import { useConfig } from '@/composables/useConfig'
import { t } from '@/i18n'

import {
  WIKITA_SAVE_FEEDBACK_KEY,
  type WikitaSaveFeedbackContext,
} from '../../musical-group/composables/useWikitaSaveFeedback'
import { normalizeEnwikiTitle } from '../../musical-group/data/enwikiTitle'
import { setCachedItemThumbnail } from '../../musical-group/data/itemThumbnailCache'
import { readingListSavedPageId } from '../data/readingListSavedPages'
import { useWikitaLiteListsSingleton } from './useWikitaLiteLists'
import { initWikitaLiteUrlState } from './useWikitaLiteUrlState'

export interface WikitaLiteSaveFeedbackContext extends WikitaSaveFeedbackContext {
  addReadingListTitle: (title: string) => boolean
}

export function provideWikitaLiteSaveFeedback(): WikitaLiteSaveFeedbackContext {
  initWikitaLiteUrlState()
  const { currentUserPageLists, setReadingListWithTimestamps } = useConfig()
  const { addPageToList, createList, removePageFromAllLists } = useWikitaLiteListsSingleton()

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

  function prependReadingListTitle(title: string): boolean {
    const normalized = normalizeEnwikiTitle(title)
    if (!normalized) return false

    const key = normalized.toLowerCase()
    const current = [...currentUserPageLists.value.readingList]
    const savedAt = [...currentUserPageLists.value.readingListSavedAt]
    const exists = current.some(
      (entry) => normalizeEnwikiTitle(entry).toLowerCase() === key,
    )
    if (exists) return false

    current.unshift(normalized)
    savedAt.unshift(Date.now())
    setReadingListWithTimestamps(current, savedAt)
    return true
  }

  function addReadingListTitle(title: string): boolean {
    const added = prependReadingListTitle(title)
    if (added) listsVersion.value += 1
    return added
  }

  function toggleReadingListTitle(title: string): boolean {
    const normalized = normalizeEnwikiTitle(title)
    if (!normalized) return false

    const key = normalized.toLowerCase()
    const current = [...currentUserPageLists.value.readingList]
    const savedAt = [...currentUserPageLists.value.readingListSavedAt]
    const index = current.findIndex(
      (entry) => normalizeEnwikiTitle(entry).toLowerCase() === key,
    )

    if (index >= 0) {
      current.splice(index, 1)
      savedAt.splice(index, 1)
      setReadingListWithTimestamps(current, savedAt)
      return false
    }

    return prependReadingListTitle(title)
  }

  function savePage(pageId: string, pageTitle: string, thumbnailUrl?: string): boolean {
    const saved = toggleReadingListTitle(pageTitle)
    if (saved) {
      toastPageId.value = pageId
      toastPageTitle.value = pageTitle
      toastPageThumbnailUrl.value = thumbnailUrl ?? null
      if (thumbnailUrl?.trim()) {
        setCachedItemThumbnail(readingListSavedPageId(pageTitle), thumbnailUrl.trim())
      }
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
    const list = createList(t('data.newList'))
    addPageToList(list.id, pageId, listsSheetPageThumbnailUrl.value ?? undefined)
    listsVersion.value += 1
    closeListsSheet()
  }

  const context: WikitaLiteSaveFeedbackContext = {
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
    addReadingListTitle,
  }

  provide(WIKITA_SAVE_FEEDBACK_KEY, context)
  return context
}

export function useWikitaLiteSaveFeedback(): WikitaLiteSaveFeedbackContext {
  const context = inject(WIKITA_SAVE_FEEDBACK_KEY)
  if (!context) {
    throw new Error(
      'useWikitaLiteSaveFeedback() must be used within provideWikitaLiteSaveFeedback()',
    )
  }
  return context
}
