import { ref, type Ref } from 'vue'

import { useWikitaSaveFeedback } from '../../musical-group/composables/useWikitaSaveFeedback'
import { isBookmarked } from '../../musical-group/data/bookmarks'
import { enwikiArticleUrl } from '../../musical-group/data/enwikiTitle'
import { isEditThanked, toggleEditThank } from '../../musical-group/data/editThanks'
import { isPageInAnyList } from '../../musical-group/data/lists'

export interface ArticleLinkFields {
  articleUrl?: string
  title?: string
  enwikiTitle?: string
}

export function externalArticleHref(item: ArticleLinkFields): string | undefined {
  if (item.articleUrl?.trim()) return item.articleUrl
  const title = item.enwikiTitle?.trim() || item.title?.trim()
  if (title) return enwikiArticleUrl(title)
  return undefined
}

export function savedItemHref(item: { enwikiTitle?: string; title: string }): string | undefined {
  if (item.enwikiTitle?.trim()) return enwikiArticleUrl(item.enwikiTitle)
  if (item.title?.trim()) return enwikiArticleUrl(item.title)
  return undefined
}

export function helpWantedHref(item: { enwikiTitle?: string; title: string }): string | undefined {
  return savedItemHref(item)
}

export function useWikitaLiteSaveActions(listsVersion: Ref<number>) {
  const { savePage } = useWikitaSaveFeedback()
  const relatedReadingBookmarkState = ref<Record<string, boolean>>({})

  function relatedReadingSaved(itemId: string): boolean {
    if (Object.prototype.hasOwnProperty.call(relatedReadingBookmarkState.value, itemId)) {
      return relatedReadingBookmarkState.value[itemId]
    }
    return isBookmarked(itemId)
  }

  function relatedReadingInList(itemId: string): boolean {
    void listsVersion.value
    return isPageInAnyList(itemId)
  }

  function onRelatedReadingSave(itemId: string, title: string, thumbnailUrl?: string) {
    const saved = savePage(itemId, title, thumbnailUrl)
    relatedReadingBookmarkState.value = {
      ...relatedReadingBookmarkState.value,
      [itemId]: saved,
    }
  }

  return {
    relatedReadingSaved,
    relatedReadingInList,
    onRelatedReadingSave,
  }
}

export function useWikitaLiteThankActions() {
  const editThankState = ref<Record<number, boolean>>({})

  function editThanked(revid: number): boolean {
    if (Object.prototype.hasOwnProperty.call(editThankState.value, revid)) {
      return editThankState.value[revid]
    }
    return isEditThanked(revid)
  }

  function onToggleEditThank(revid: number) {
    const thanked = toggleEditThank(revid)
    editThankState.value = {
      ...editThankState.value,
      [revid]: thanked,
    }
  }

  return {
    editThanked,
    onToggleEditThank,
  }
}
