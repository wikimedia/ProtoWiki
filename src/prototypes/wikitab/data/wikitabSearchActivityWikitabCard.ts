import {
  cdxIconAlert,
  cdxIconArticle,
  cdxIconCheck,
  cdxIconEditUndo,
  cdxIconFlag,
  cdxIconHeartOutline,
} from '@wikimedia/codex-icons'

import type {
  WikitabCardChip,
  WikitabCardData,
  WikitabCardLoading,
  WikitabCardMenuItem,
} from '../sections'
import {
  formatWikitabEditRelativeTime,
  type WikitabSearchActivityItem,
} from './fetchWikitabSearchActivity'
import { parseActivityEditSummaryDisplay } from './wikitabActivityEditSummary'
import type { WikitabSearchActivityCardPayload } from './wikitabCardPayloadTypes'
import { editorIconForKind } from './wikitabEditorKindIcons'
import { articleSectionUrl } from './wikitabHtml'
import { wikitabCardBindProps } from './wikitabCardPresentation'
import {
  wikitabCardSaveArticleMenuItem,
  wikitabCardSaveMenuItem,
} from './wikitabCardMenuItems'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(text: string): string {
  return escapeHtml(text)
}

function nestedReadLink(href: string, label: string): string {
  return `<a class="wikitab-card__nested-link" href="${escapeAttr(href)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`
}

/** Linked article title, optional ` → section` for section-level edits. */
export function searchActivityItemTitleHtml(item: WikitabSearchActivityItem): string {
  const article = item.articleTitle.trim()
  if (!article) return ''

  const articleHref = item.articleUrl.trim()
  const articlePart = articleHref
    ? nestedReadLink(articleHref, article)
    : escapeHtml(article)

  const { section } = parseActivityEditSummaryDisplay(item.editSummary)
  const sectionName = section?.trim()
  if (!sectionName) return articlePart

  const sectionPart = articleHref
    ? nestedReadLink(articleSectionUrl(articleHref, sectionName), sectionName)
    : escapeHtml(sectionName)
  return `${articlePart} →${sectionPart}`
}

function activityDiffSizeHtml(item: WikitabSearchActivityItem): string {
  if (item.delta === undefined) return ''
  if (item.delta === 0) {
    return '<span class="wikitab-activity-diff-size-neutral">(±0)</span>'
  }
  if (item.delta > 0) {
    return `<span class="wikitab-activity-diff-size-added">(+${item.delta})</span>`
  }
  return `<span class="wikitab-activity-diff-size-removed">(−${Math.abs(item.delta)})</span>`
}

/** `#description` html hook — parenthesized delta + quoted summary (section lives in the title). */
export function searchActivityItemDescriptionHtml(item: WikitabSearchActivityItem): string {
  const diff = activityDiffSizeHtml(item)
  const { editSummary } = parseActivityEditSummaryDisplay(item.editSummary)
  const summary = editSummary?.trim()
  if (!diff && !summary) return ''

  const parts: string[] = ['<div class="wikitab-activity-description-block">']
  if (diff) {
    parts.push(`<span class="wikitab-activity-diff-size">${diff}</span>`)
  }
  if (diff && summary) {
    parts.push(' ')
  }
  if (summary) {
    const quoted = summary.startsWith('"') ? summary : `"${summary}"`
    parts.push(`<span class="wikitab-activity-description">${escapeHtml(quoted)}</span>`)
  }
  parts.push('</div>')
  return parts.join('')
}

function activityEditedRelativeLabel(item: WikitabSearchActivityItem): string {
  const ts = item.editedTimestamp?.trim()
  if (ts) return formatWikitabEditRelativeTime(ts)
  return item.editedRelative
}

/**
 * Supporting row label html from payload `editorName` / `editorUrl` (icon comes from `supportingIcon` bind prop).
 */
export function searchActivityEditorSupportingHtml(
  editorName: string,
  editorUrl: string,
  options: { linkEditor?: boolean } = {},
): string {
  const name = escapeHtml(editorName)
  const link =
    options.linkEditor !== false && editorUrl.trim()
      ? `<a class="wikitab-card__nested-link" href="${escapeAttr(editorUrl)}" target="_blank" rel="noreferrer">${name}</a>`
      : name
  return link
}

export function searchActivityChipsFromItem(
  item: WikitabSearchActivityItem,
  options: { omitLatestRevisionChip?: boolean } = {},
): WikitabCardChip[] {
  if (item.reverted) {
    return [{ text: 'Reverted', icon: cdxIconEditUndo, type: 'notice' }]
  }
  if (item.highRevertRisk) {
    return [{ text: 'High revert risk', icon: cdxIconAlert, type: 'warning' }]
  }
  if (item.needsReview) {
    return [{ text: 'Needs review', icon: cdxIconFlag, type: 'notice' }]
  }
  if (!options.omitLatestRevisionChip && item.isLatestRevision) {
    return [{ text: 'Latest revision', icon: cdxIconArticle, type: 'notice' }]
  }
  return []
}

export function searchActivityChipsFromPayload(
  payload: WikitabSearchActivityCardPayload,
  options: { omitLatestRevisionChip?: boolean } = {},
): WikitabCardChip[] {
  return searchActivityChipsFromItem(
    {
      pageid: 0,
      articleTitle: payload.title,
      articleUrl: payload.articleUrl,
      revisionId: payload.revisionId,
      editSummary: '',
      thumbnailUrl: payload.thumbnailUrl,
      delta: payload.delta,
      reverted: payload.reverted,
      highRevertRisk: payload.highRevertRisk,
      needsReview: payload.needsReview,
      isLatestRevision: payload.isLatestRevision,
      editorName: payload.editorName,
      editorUrl: payload.editorUrl,
      editedRelative: '',
      editedTimestamp: payload.editedTimestamp,
      editorKind: payload.editorKind,
      diffUrl: '',
      thankUrl: '',
    },
    options,
  )
}

export function searchActivityMenuItems(options: {
  includeSave?: boolean
  isSaved?: boolean
  saveArticle?: false | { isSaved?: boolean }
}): WikitabCardMenuItem[] {
  const items: WikitabCardMenuItem[] = [
    { value: 'thank', label: 'Thank', icon: cdxIconHeartOutline },
    { value: 'dismiss', label: 'Dismiss', icon: cdxIconCheck },
  ]
  if (options.includeSave) {
    items.unshift(wikitabCardSaveMenuItem({ isSaved: options.isSaved, primitiveId: 'edit' }))
    if (options.saveArticle) {
      items.splice(1, 0, wikitabCardSaveArticleMenuItem(options.saveArticle))
    }
  }
  return items
}

/** Saved-change rows — save only (no thank / dismiss). */
export function searchActivitySavedMenuItems(options: {
  isSaved?: boolean
  saveArticle?: false | { isSaved?: boolean }
}): WikitabCardMenuItem[] {
  const items: WikitabCardMenuItem[] = [
    wikitabCardSaveMenuItem({ isSaved: options.isSaved, primitiveId: 'edit' }),
  ]
  if (options.saveArticle) {
    items.push(wikitabCardSaveArticleMenuItem(options.saveArticle))
  }
  return items
}

/** Generic `WikitabCardData` — editor row via `supportingHtml` + `supportingIcon` bind prop. */
export function searchActivityItemToCardData(
  item: WikitabSearchActivityItem,
  options: { linkEditor?: boolean } = {},
): WikitabCardData {
  const titleHtml = searchActivityItemTitleHtml(item)
  const description = searchActivityItemDescriptionHtml(item)
  const editedEnd = activityEditedRelativeLabel(item)
  return {
    key: `activity:${item.revisionId}`,
    title: item.articleTitle,
    ...(titleHtml ? { titleHtml } : {}),
    url: item.diffUrl,
    ...(description ? { description } : {}),
    thumbnailUrl: item.thumbnailUrl,
    supportingHtml: searchActivityEditorSupportingHtml(
      item.editorName,
      item.editorUrl,
      options,
    ),
    ...(editedEnd ? { supportingTextEnd: editedEnd } : {}),
    ...(item.seedArticle ? { seedArticle: item.seedArticle } : {}),
  }
}

export function wikitabCardPropsForSearchActivityItem(
  item: WikitabSearchActivityItem,
  options: {
    includeSave?: boolean
    isSaved?: boolean
    saveArticle?: false | { isSaved?: boolean }
    loading?: WikitabCardLoading
    showThumbnail?: boolean
    linkEditor?: boolean
    /** When false, omit thank/dismiss (saved-change). */
    revisionActionsMenu?: boolean
    /** Home Recent edits — tip-only feed, chip would be redundant. */
    omitLatestRevisionChip?: boolean
  } = {},
): Record<string, unknown> {
  const showThumbnail = options.showThumbnail !== false
  let card = searchActivityItemToCardData(item, { linkEditor: options.linkEditor })
  if (!showThumbnail && card.thumbnailUrl) {
    const { thumbnailUrl: _thumb, ...rest } = card
    card = rest
  }
  const supportingIcon = editorIconForKind(item.editorKind)
  const chips = searchActivityChipsFromItem(item, {
    omitLatestRevisionChip: options.omitLatestRevisionChip,
  })
  const menu =
    options.revisionActionsMenu === false
      ? searchActivitySavedMenuItems({
          isSaved: options.isSaved,
          saveArticle: options.saveArticle,
        })
      : searchActivityMenuItems({
          includeSave: options.includeSave,
          isSaved: options.isSaved,
          saveArticle: options.saveArticle,
        })

  return wikitabCardBindProps('edit', {
    card,
    supportingIcon,
    chips,
    menu,
    loading: options.loading,
  })
}
