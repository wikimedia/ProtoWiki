import {
  CONTRIBUTE_MODULE_IDS,
  EXPLORE_READ_MODULE_IDS,
  HOME_EDIT_MODULE_IDS,
  type WikitaLiteModuleId,
} from './homeModuleIds'

const STORAGE_KEY = 'wikita-lite-dismissed-modules'

const ALL_DISMISSABLE_MODULE_IDS = [
  ...new Set([
    ...HOME_EDIT_MODULE_IDS,
    ...EXPLORE_READ_MODULE_IDS,
    ...CONTRIBUTE_MODULE_IDS,
  ]),
] as readonly WikitaLiteModuleId[]

export type DismissedModules = Partial<Record<WikitaLiteModuleId, number>>

const EMPTY_DISMISSED_MODULES: DismissedModules = {}

/** Next local 3:00 AM strictly after `from`. */
export function nextLocalRestoreAt(from = new Date()): number {
  const next = new Date(from)
  next.setHours(3, 0, 0, 0)
  if (next.getTime() <= from.getTime()) {
    next.setDate(next.getDate() + 1)
  }
  return next.getTime()
}

function parseDismissedRecord(value: unknown): DismissedModules {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}

  const record = value as Record<string, unknown>
  const parsed: DismissedModules = {}

  for (const [key, restoreAt] of Object.entries(record)) {
    if (!ALL_DISMISSABLE_MODULE_IDS.includes(key as WikitaLiteModuleId)) continue
    if (typeof restoreAt !== 'number' || !Number.isFinite(restoreAt)) continue
    parsed[key as WikitaLiteModuleId] = restoreAt
  }

  return parsed
}

/** Accept legacy per-tab storage and flatten to one global map. */
function migrateDismissedModules(value: unknown): DismissedModules {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}

  const record = value as Record<string, unknown>
  if ('edit' in record || 'read' in record || 'contribute' in record) {
    const merged: DismissedModules = {}
    for (const view of ['edit', 'read', 'contribute'] as const) {
      const viewRecord = parseDismissedRecord(record[view])
      for (const [moduleId, restoreAt] of Object.entries(viewRecord)) {
        const id = moduleId as WikitaLiteModuleId
        const existing = merged[id]
        if (existing === undefined || restoreAt > existing) {
          merged[id] = restoreAt
        }
      }
    }
    return merged
  }

  return parseDismissedRecord(value)
}

export function pruneExpiredDismissals(state: DismissedModules, now = Date.now()): DismissedModules {
  const pruned: DismissedModules = {}

  for (const [moduleId, restoreAt] of Object.entries(state)) {
    if (typeof restoreAt !== 'number') continue
    if (now >= restoreAt) continue
    pruned[moduleId as WikitaLiteModuleId] = restoreAt
  }

  return pruned
}

export function loadDismissedModules(): DismissedModules {
  if (typeof window === 'undefined') return { ...EMPTY_DISMISSED_MODULES }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY_DISMISSED_MODULES }
    const parsed = JSON.parse(raw) as unknown
    const loaded = migrateDismissedModules(parsed)
    return pruneExpiredDismissals(loaded)
  } catch {
    return { ...EMPTY_DISMISSED_MODULES }
  }
}

export function saveDismissedModules(dismissed: DismissedModules): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}
