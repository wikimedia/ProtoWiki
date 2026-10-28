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
import type { WikitabSearchActivityCardPayload } from './wikitabCardPayloadTypes'
import { editorIconForKind } from './wikitabEditorKindIcons'
import { wikitabCardBindProps } from './wikitabCardPresentation'
import { wikitabCardSaveMenuItem } from './wikitabCardMenuItems'

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

function activityDiffSizeHtml(item: WikitabSearchActivityItem): string {
  if (item.delta === undefined) return ''
  if (item.delta === 0) {
    return '<span class="wikitab-activity-diff-size-neutral">±0</span>'
  }
  if (item.delta > 0) {
    return `<span class="wikitab-activity-diff-size-added">+${item.delta}</span>`
  }
  return `<span class="wikitab-activity-diff-size-removed">−${Math.abs(item.delta)}</span>`
}

/** `#description` html hook — diff size + edit summary. */
export function searchActivityItemDescriptionHtml(item: WikitabSearchActivityItem): string {
  const diff = activityDiffSizeHtml(item)
  const summary = item.editSummary?.trim()
  if (!diff && !summary) return ''

  const parts: string[] = ['<div class="wikitab-activity-description-block">']
  if (diff) {
    parts.push(`<p class="wikitab-activity-diff-size">${diff}</p>`)
  }
  if (summary) {
    parts.push(`<p class="wikitab-activity-description">${escapeHtml(summary)}</p>`)
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

export function searchActivityChipsFromItem(item: WikitabSearchActivityItem): WikitabCardChip[] {
  const chips: WikitabCardChip[] = []
  if (item.highRevertRisk) {
    chips.push({ text: 'High revert risk', icon: cdxIconAlert, type: 'warning' })
  }
  if (item.needsReview) {
    chips.push({ text: 'Needs review', icon: cdxIconFlag, type: 'notice' })
  } else if (!item.highRevertRisk && item.isLatestRevision) {
    chips.push({ text: 'Latest revision', icon: cdxIconArticle, type: 'notice' })
  }
  if (item.reverted) {
    chips.push({ text: 'Reverted', icon: cdxIconEditUndo, type: 'notice' })
  }
  return chips
}

export function searchActivityChipsFromPayload(
  payload: WikitabSearchActivityCardPayload,
): WikitabCardChip[] {
  return searchActivityChipsFromItem({
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
  })
}

export function searchActivityMenuItems(options: {
  includeSave?: boolean
  isSaved?: boolean
}): WikitabCardMenuItem[] {
  const items: WikitabCardMenuItem[] = [
    { value: 'thank', label: 'Thank', icon: cdxIconHeartOutline },
    { value: 'dismiss', label: 'Dismiss', icon: cdxIconCheck },
  ]
  if (options.includeSave) {
    items.unshift(wikitabCardSaveMenuItem({ isSaved: options.isSaved }))
  }
  return items
}

/** Saved-change rows — save only (no thank / dismiss). */
export function searchActivitySavedMenuItems(options: {
  isSaved?: boolean
}): WikitabCardMenuItem[] {
  return [wikitabCardSaveMenuItem({ isSaved: options.isSaved })]
}

/** Generic `WikitabCardData` — editor row via `supportingHtml` + `supportingIcon` bind prop. */
export function searchActivityItemToCardData(
  item: WikitabSearchActivityItem,
  options: { linkEditor?: boolean } = {},
): WikitabCardData {
  const description = searchActivityItemDescriptionHtml(item)
  const editedEnd = activityEditedRelativeLabel(item)
  return {
    key: `activity:${item.revisionId}`,
    title: item.articleTitle,
    url: item.diffUrl,
    ...(description ? { description } : {}),
    thumbnailUrl: item.thumbnailUrl,
    supportingHtml: searchActivityEditorSupportingHtml(
      item.editorName,
      item.editorUrl,
      options,
    ),
    ...(editedEnd ? { supportingTextEnd: editedEnd } : {}),
  }
}

export function wikitabCardPropsForSearchActivityItem(
  item: WikitabSearchActivityItem,
  options: {
    includeSave?: boolean
    isSaved?: boolean
    loading?: WikitabCardLoading
    showThumbnail?: boolean
    linkEditor?: boolean
    /** When false, omit thank/dismiss (saved-change). */
    revisionActionsMenu?: boolean
  } = {},
): Record<string, unknown> {
  const showThumbnail = options.showThumbnail !== false
  let card = searchActivityItemToCardData(item, { linkEditor: options.linkEditor })
  if (!showThumbnail && card.thumbnailUrl) {
    const { thumbnailUrl: _thumb, ...rest } = card
    card = rest
  }
  const supportingIcon = editorIconForKind(item.editorKind)
  const chips = searchActivityChipsFromItem(item)
  const menu =
    options.revisionActionsMenu === false
      ? searchActivitySavedMenuItems({ isSaved: options.isSaved })
      : searchActivityMenuItems({
          includeSave: options.includeSave,
          isSaved: options.isSaved,
        })

  return wikitabCardBindProps('edit', {
    card,
    supportingIcon,
    chips,
    menu,
    loading: options.loading,
  })
}
