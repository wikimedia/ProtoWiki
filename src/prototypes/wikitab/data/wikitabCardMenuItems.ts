import {
  cdxIconBookmark,
  cdxIconBookmarkList,
  cdxIconBookmarkOutline,
  cdxIconEyeClosed,
} from '@wikimedia/codex-icons'
import type { WikitabCardMenuItem } from '../sections'

export function wikitabCardSaveMenuItem(options: {
  isSaved?: boolean
  /** Default `Save` / `Unsave`. */
  label?: string
} = {}): WikitabCardMenuItem {
  const saveLabel = options.label ?? 'Save'
  return {
    value: 'save',
    label: options.isSaved ? 'Unsave' : saveLabel,
    icon: options.isSaved ? cdxIconBookmark : cdxIconBookmarkOutline,
  }
}

export function wikitabCardSaveArticleMenuItem(options: {
  isSaved?: boolean
} = {}): WikitabCardMenuItem {
  return {
    value: 'save-article',
    label: options.isSaved ? 'Unsave article' : 'Save article',
    icon: cdxIconBookmarkList,
  }
}

export function wikitabCardHideMenuItem(sectionHeading: string): WikitabCardMenuItem {
  return {
    value: 'hide',
    label: `Hide from ${sectionHeading}`,
    icon: cdxIconEyeClosed,
  }
}

/** Feed / module card overflow — save, optional save-article, and/or hide rows. */
export function wikitabCardFeedMenuItems(options: {
  save?: false | { isSaved?: boolean; label?: string }
  saveArticle?: false | { isSaved?: boolean }
  hideFromHeading?: string
}): WikitabCardMenuItem[] {
  const items: WikitabCardMenuItem[] = []
  if (options.save) {
    items.push(wikitabCardSaveMenuItem(options.save))
  }
  if (options.saveArticle) {
    items.push(wikitabCardSaveArticleMenuItem(options.saveArticle))
  }
  if (options.hideFromHeading) {
    items.push(wikitabCardHideMenuItem(options.hideFromHeading))
  }
  return items
}
