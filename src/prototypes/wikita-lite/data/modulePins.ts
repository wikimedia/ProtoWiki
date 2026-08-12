import type { WikitaLiteView } from '../routes'
import { WIKITA_LITE_VIEWS } from '../routes'
import {
  CONTRIBUTE_MODULE_IDS,
  EXPLORE_READ_MODULE_IDS,
  HOME_EDIT_MODULE_IDS,
  type WikitaLiteModuleId,
} from './homeModuleIds'

const STORAGE_KEY = 'wikita-lite-pinned-modules'

const MODULE_IDS_BY_VIEW: Record<WikitaLiteView, readonly string[]> = {
  edit: HOME_EDIT_MODULE_IDS,
  read: EXPLORE_READ_MODULE_IDS,
  contribute: CONTRIBUTE_MODULE_IDS,
}

export type TabPinnedModules = Record<WikitaLiteView, WikitaLiteModuleId[]>

const EMPTY_PINNED_MODULES: TabPinnedModules = {
  edit: [],
  read: [],
  contribute: [],
}

function parsePinnedIdsForView(value: unknown, view: WikitaLiteView): WikitaLiteModuleId[] {
  if (!Array.isArray(value)) return []

  const allowed = MODULE_IDS_BY_VIEW[view]
  const ids: WikitaLiteModuleId[] = []
  for (const entry of value) {
    if (typeof entry !== 'string') continue
    if (!allowed.includes(entry)) continue
    if (!ids.includes(entry as WikitaLiteModuleId)) {
      ids.push(entry as WikitaLiteModuleId)
    }
  }

  return ids
}

function parsePinnedModules(value: unknown): TabPinnedModules | null {
  if (Array.isArray(value)) {
    return {
      ...EMPTY_PINNED_MODULES,
      edit: parsePinnedIdsForView(value, 'edit'),
    }
  }

  if (typeof value !== 'object' || value === null) return null

  const record = value as Record<string, unknown>
  const parsed: TabPinnedModules = { ...EMPTY_PINNED_MODULES }

  for (const view of WIKITA_LITE_VIEWS) {
    if (view in record) {
      parsed[view] = parsePinnedIdsForView(record[view], view)
    }
  }

  return parsed
}

export function loadPinnedModules(): TabPinnedModules {
  if (typeof window === 'undefined') return { ...EMPTY_PINNED_MODULES }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY_PINNED_MODULES }
    const parsed = JSON.parse(raw) as unknown
    return parsePinnedModules(parsed) ?? { ...EMPTY_PINNED_MODULES }
  } catch {
    return { ...EMPTY_PINNED_MODULES }
  }
}

export function savePinnedModules(pinned: TabPinnedModules): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pinned))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}
