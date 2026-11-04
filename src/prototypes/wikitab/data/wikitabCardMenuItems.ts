import {
  cdxIconBookmark,
  cdxIconBookmarkOutline,
  cdxIconEyeClosed,
} from '@wikimedia/codex-icons'
import type { WikitabCardMenuItem } from '../sections'
import type { WikitabCardPrimitiveId } from './wikitabCardTypeLinks'

/** Primitives whose overflow may include Save article (seed still set on other types for modules). */
const WIKITAB_SAVE_ARTICLE_MENU_PRIMITIVES = new Set<WikitabCardPrimitiveId>([
  'snippet',
  'suggestion',
  'edit',
  'discussion',
])

export function wikitabPrimitiveShowsSaveArticleMenu(
  primitiveId: WikitabCardPrimitiveId | undefined,
): boolean {
  return !!primitiveId && WIKITAB_SAVE_ARTICLE_MENU_PRIMITIVES.has(primitiveId)
}

const WIKITAB_SAVE_MENU_NOUN_BY_PRIMITIVE: Record<WikitabCardPrimitiveId, string> = {
  article: 'article',
  snippet: 'snippet',
  discussion: 'discussion',
  suggestion: 'suggestion',
  image: 'image',
  word: 'word',
  quote: 'quote',
  edit: 'edit',
}

export function wikitabCardSaveMenuNounForPrimitive(
  primitiveId: WikitabCardPrimitiveId,
): string {
  return WIKITAB_SAVE_MENU_NOUN_BY_PRIMITIVE[primitiveId]
}

/** e.g. `Save word` / `Unsave word`. */
export function wikitabCardSaveMenuLabelForPrimitive(
  primitiveId: WikitabCardPrimitiveId,
  saved = false,
): string {
  const noun = wikitabCardSaveMenuNounForPrimitive(primitiveId)
  return saved ? `Unsave ${noun}` : `Save ${noun}`
}

function wikitabCardSaveMenuLabels(options: {
  saveLabel?: string
  /** @deprecated Use `saveLabel` or `primitiveId`. */
  label?: string
  primitiveId?: WikitabCardPrimitiveId
}): { save: string; unsave: string } {
  const explicit = options.saveLabel ?? options.label
  if (explicit) {
    const save = explicit
    const unsave = save.startsWith('Save ')
      ? `Unsave ${save.slice('Save '.length)}`
      : `Unsave ${save}`
    return { save, unsave }
  }
  if (options.primitiveId) {
    return {
      save: wikitabCardSaveMenuLabelForPrimitive(options.primitiveId, false),
      unsave: wikitabCardSaveMenuLabelForPrimitive(options.primitiveId, true),
    }
  }
  return { save: 'Save', unsave: 'Unsave' }
}

export function wikitabCardSaveMenuItem(
  options: {
    isSaved?: boolean
    saveLabel?: string
    /** @deprecated Use `saveLabel` or `primitiveId`. */
    label?: string
    primitiveId?: WikitabCardPrimitiveId
  } = {},
): WikitabCardMenuItem {
  const labels = wikitabCardSaveMenuLabels(options)
  return {
    value: 'save',
    label: options.isSaved ? labels.unsave : labels.save,
    icon: options.isSaved ? cdxIconBookmark : cdxIconBookmarkOutline,
  }
}

export function wikitabCardSaveArticleMenuItem(options: {
  isSaved?: boolean
} = {}): WikitabCardMenuItem {
  return {
    value: 'save-article',
    label: options.isSaved ? 'Unsave article' : 'Save article',
    icon: options.isSaved ? cdxIconBookmark : cdxIconBookmarkOutline,
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
  save?:
    | false
    | {
        isSaved?: boolean
        saveLabel?: string
        label?: string
        primitiveId?: WikitabCardPrimitiveId
      }
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
