import { cdxIconCheck, cdxIconEyeClosed, cdxIconHeartOutline } from '@wikimedia/codex-icons'

import type { WikitabCardMenuItem } from '../sections'
import type { WikitabCardCatalogEntry } from './wikitabCardTypeLinks'
import {
  wikitabCardHideMenuItem,
  wikitabCardSaveMenuItem,
} from './wikitabCardMenuItems'

/** Playground Fields table — value + label only (icons resolved at preview time). */
export type PlaygroundInferredMenuRow = { value: string; label: string }

/**
 * Inferred overflow menu when the slot does not pass `menu` — documents production patterns.
 * Save + Hide (feed); Save + Thank + Dismiss (activity); Save only (saved change / saved slots).
 */
export function playgroundInferredMenuRows(
  entry: WikitabCardCatalogEntry,
): PlaygroundInferredMenuRow[] {
  if (entry.id === 'saved-change') {
    return [{ value: 'save', label: 'Save' }]
  }
  if (entry.typeName === 'WikitabSearchActivityCardPayload') {
    return [
      { value: 'save', label: 'Save' },
      { value: 'thank', label: 'Thank' },
      { value: 'dismiss', label: 'Dismiss' },
    ]
  }
  if (entry.group === 'saved') {
    return [{ value: 'save', label: 'Save' }]
  }
  return [
    { value: 'save', label: 'Save' },
    { value: 'hide', label: 'Hide' },
  ]
}

function playgroundMenuItemFromInferredRow(row: PlaygroundInferredMenuRow): WikitabCardMenuItem {
  switch (row.value) {
    case 'save': {
      const genericSave = row.label === 'Save' || row.label === 'Unsave'
      return wikitabCardSaveMenuItem({
        label: genericSave ? undefined : row.label,
      })
    }
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
