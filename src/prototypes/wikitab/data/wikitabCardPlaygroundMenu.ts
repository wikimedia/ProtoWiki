import { cdxIconCheck, cdxIconEyeClosed, cdxIconHeartOutline } from '@wikimedia/codex-icons'

import type { WikitabCardMenuItem } from '../sections'
import type { WikitabCardCatalogEntry } from './wikitabCardTypeLinks'
import {
  wikitabCardHideMenuItem,
  wikitabCardSaveArticleMenuItem,
  wikitabCardSaveMenuItem,
  wikitabCardSaveMenuLabelForPrimitive,
  wikitabPrimitiveShowsSaveArticleMenu,
} from './wikitabCardMenuItems'

/** Playground Fields table — value + label only (icons resolved at preview time). */
export type PlaygroundInferredMenuRow = { value: string; label: string }

/**
 * Inferred overflow menu when the slot does not pass `menu` — documents production patterns.
 * Save + optional Save article + Hide (feed non-article cards with seedArticle); Save + Thank +
 * Dismiss (activity); Save only (saved change / saved slots).
 */
export function playgroundInferredMenuRows(
  entry: WikitabCardCatalogEntry,
): PlaygroundInferredMenuRow[] {
  const saveRowLabel = (primitiveId: WikitabCardCatalogEntry['primitiveId']) =>
    primitiveId
      ? wikitabCardSaveMenuLabelForPrimitive(primitiveId, false)
      : 'Save'

  if (entry.id === 'saved-change') {
    return [{ value: 'save', label: saveRowLabel('edit') }]
  }
  if (entry.typeName === 'WikitabSearchActivityCardPayload') {
    return [
      { value: 'save', label: saveRowLabel('edit') },
      { value: 'thank', label: 'Thank' },
      { value: 'dismiss', label: 'Dismiss' },
    ]
  }
  if (entry.group === 'saved') {
    return [{ value: 'save', label: saveRowLabel(entry.primitiveId) }]
  }
  const rows: PlaygroundInferredMenuRow[] = [
    { value: 'save', label: saveRowLabel(entry.primitiveId) },
  ]
  if (entry.group !== 'saved' && wikitabPrimitiveShowsSaveArticleMenu(entry.primitiveId)) {
    rows.push({ value: 'save-article', label: 'Save article' })
  }
  rows.push({ value: 'hide', label: 'Hide' })
  return rows
}

function playgroundMenuItemFromInferredRow(row: PlaygroundInferredMenuRow): WikitabCardMenuItem {
  switch (row.value) {
    case 'save':
      return wikitabCardSaveMenuItem({
        saveLabel: row.label.startsWith('Unsave ') ? row.label.replace(/^Unsave /, 'Save ') : row.label,
        isSaved: row.label.startsWith('Unsave '),
      })
    case 'save-article':
      return wikitabCardSaveArticleMenuItem({ isSaved: row.label === 'Unsave article' })
    case 'hide':
      if (row.label === 'Hide') {
        return { value: 'hide', label: 'Hide', icon: cdxIconEyeClosed }
      }
      if (row.label.startsWith('Hide from ')) {
        return wikitabCardHideMenuItem(row.label.slice('Hide from '.length) || '…')
      }
      return wikitabCardHideMenuItem(row.label || '…')
    case 'thank':
      return { value: 'thank', label: row.label, icon: cdxIconHeartOutline }
    case 'dismiss':
      return { value: 'dismiss', label: row.label, icon: cdxIconCheck }
    default:
      return { value: row.value, label: row.label, icon: cdxIconCheck }
  }
}

export function playgroundMenuItemsForEntry(entry: WikitabCardCatalogEntry): WikitabCardMenuItem[] {
  return playgroundInferredMenuRows(entry).map(playgroundMenuItemFromInferredRow)
}
