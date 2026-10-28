import {
  WIKITAB_CONFIGURE_MODULES,
  WIKITAB_DAILY_READS_MODULE_ID,
  WIKITAB_FEATURED_MODULE_ID,
  WIKITAB_REVIEW_CHANGES_MODULE_ID,
  WIKITAB_SAVED_MODULE_ID,
  WIKITAB_SECTIONS,
  WIKITAB_SUGGESTED_EDITS_MODULE_ID,
  type WikitabModuleId,
  type WikitabSectionId,
} from '../sections'
import { normalizeColorThemeId, type WikitabColorThemeId } from './wikitabColorThemes'
import { cloneSavedItems, normalizeSavedItems, type WikitabSavedItem } from './wikitabSavedItems'
import { articleTitleKey } from './wikitabHtml'

/** Never bump — old shapes upgrade in `wikitabStorageMigration.ts`. */
export const WIKITAB_CONFIG_STORAGE_KEY = 'wikitab-config-v3'

export interface WikitabConfig {
  pinnedSectionIds: WikitabModuleId[]
  hiddenSectionIds: WikitabModuleId[]
  moduleOrderIds: WikitabModuleId[]
  hiddenArticleTitleKeys: string[]
  dismissedActivityRevids: number[]
  hiddenCommonsImagePageIds: number[]
  potdAttributionExpandedDay: string | null
  colorThemeId: WikitabColorThemeId | null
  reviewChangesShowSavedEdits: boolean
  reviewChangesShowRecentRiskyEdits: boolean
  savedItems: WikitabSavedItem[]
  configRevision: number
}

export const DEFAULT_WIKITAB_CONFIG: WikitabConfig = {
  pinnedSectionIds: [],
  hiddenSectionIds: [],
  moduleOrderIds: [],
  hiddenArticleTitleKeys: [],
  dismissedActivityRevids: [],
  hiddenCommonsImagePageIds: [],
  potdAttributionExpandedDay: null,
  colorThemeId: null,
  reviewChangesShowSavedEdits: true,
  reviewChangesShowRecentRiskyEdits: true,
  savedItems: [],
  configRevision: 0,
}

const VALID_FEED_SECTION_IDS = new Set<WikitabSectionId>(
  WIKITAB_SECTIONS.map((section) => section.id),
)

const VALID_MODULE_IDS = new Set<WikitabModuleId>([
  ...VALID_FEED_SECTION_IDS,
  WIKITAB_SAVED_MODULE_ID,
  WIKITAB_FEATURED_MODULE_ID,
  WIKITAB_DAILY_READS_MODULE_ID,
  WIKITAB_SUGGESTED_EDITS_MODULE_ID,
  WIKITAB_REVIEW_CHANGES_MODULE_ID,
])

function isModuleId(value: string): value is WikitabModuleId {
  return VALID_MODULE_IDS.has(value as WikitabModuleId)
}

export function normalizePinnedSectionIds(raw: unknown): WikitabModuleId[] {
  if (!Array.isArray(raw)) return []

  const seen = new Set<WikitabModuleId>()
  const ids: WikitabModuleId[] = []

  for (const item of raw) {
    if (typeof item !== 'string') continue
    const id = item.trim()
    if (!id || !isModuleId(id) || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }

  return ids
}

export function normalizeModuleOrderIds(raw: unknown): WikitabModuleId[] {
  if (!Array.isArray(raw)) return []

  const seen = new Set<WikitabModuleId>()
  const ids: WikitabModuleId[] = []

  for (const item of raw) {
    if (typeof item !== 'string') continue
    const id = item.trim()
    if (!id || !isModuleId(id) || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }

  for (const module of WIKITAB_CONFIGURE_MODULES) {
    if (!seen.has(module.id)) {
      seen.add(module.id)
      ids.push(module.id)
    }
  }

  return ids
}

export function normalizeHiddenSectionIds(raw: unknown): WikitabModuleId[] {
  if (!Array.isArray(raw)) return []

  const seen = new Set<WikitabModuleId>()
  const ids: WikitabModuleId[] = []

  for (const item of raw) {
    if (typeof item !== 'string') continue
    const id = item.trim()
    if (!id || !isModuleId(id) || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }

  return ids
}

export function normalizeHiddenArticleTitleKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []

  const seen = new Set<string>()
  const keys: string[] = []

  for (const item of raw) {
    if (typeof item !== 'string') continue
    const key = articleTitleKey(item)
    if (!key || seen.has(key)) continue
    seen.add(key)
    keys.push(key)
  }

  return keys
}

export function normalizePotdAttributionExpandedDay(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const day = raw.trim()
  return day.length > 0 ? day : null
}

export function normalizeDismissedActivityRevids(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []

  const seen = new Set<number>()
  const revids: number[] = []

  for (const item of raw) {
    const revid = typeof item === 'number' ? item : Number(item)
    if (!Number.isInteger(revid) || revid <= 0 || seen.has(revid)) continue
    seen.add(revid)
    revids.push(revid)
  }

  return revids
}

export function normalizeHiddenCommonsImagePageIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []

  const seen = new Set<number>()
  const pageIds: number[] = []

  for (const item of raw) {
    const pageid = typeof item === 'number' ? item : Number(item)
    if (!Number.isInteger(pageid) || pageid <= 0 || seen.has(pageid)) continue
    seen.add(pageid)
    pageIds.push(pageid)
  }

  return pageIds
}

function normalizeConfigRevision(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0
  return Math.max(0, Math.floor(raw))
}

function normalizeReviewChangesBool(raw: unknown, defaultValue: boolean): boolean {
  if (typeof raw !== 'boolean') return defaultValue
  return raw
}

export function normalizeWikitabConfig(raw: unknown): WikitabConfig {
  if (typeof raw !== 'object' || raw === null) {
    return cloneWikitabConfig(DEFAULT_WIKITAB_CONFIG)
  }

  const record = raw as Record<string, unknown>

  return {
    pinnedSectionIds: normalizePinnedSectionIds(record.pinnedSectionIds),
    hiddenSectionIds: normalizeHiddenSectionIds(record.hiddenSectionIds),
    moduleOrderIds: normalizeModuleOrderIds(record.moduleOrderIds),
    hiddenArticleTitleKeys: normalizeHiddenArticleTitleKeys(record.hiddenArticleTitleKeys),
    dismissedActivityRevids: normalizeDismissedActivityRevids(record.dismissedActivityRevids),
    hiddenCommonsImagePageIds: normalizeHiddenCommonsImagePageIds(record.hiddenCommonsImagePageIds),
    potdAttributionExpandedDay: normalizePotdAttributionExpandedDay(
      record.potdAttributionExpandedDay,
    ),
    colorThemeId: normalizeColorThemeId(record.colorThemeId),
    reviewChangesShowSavedEdits: normalizeReviewChangesBool(
      record.reviewChangesShowSavedEdits,
      true,
    ),
    reviewChangesShowRecentRiskyEdits: normalizeReviewChangesBool(
      record.reviewChangesShowRecentRiskyEdits,
      true,
    ),
    savedItems: normalizeSavedItems(record.savedItems),
    configRevision: normalizeConfigRevision(record.configRevision),
  }
}

export function cloneWikitabConfig(config: WikitabConfig): WikitabConfig {
  return {
    pinnedSectionIds: [...config.pinnedSectionIds],
    hiddenSectionIds: [...config.hiddenSectionIds],
    moduleOrderIds: [...config.moduleOrderIds],
    hiddenArticleTitleKeys: [...config.hiddenArticleTitleKeys],
    dismissedActivityRevids: [...config.dismissedActivityRevids],
    hiddenCommonsImagePageIds: [...config.hiddenCommonsImagePageIds],
    potdAttributionExpandedDay: config.potdAttributionExpandedDay,
    colorThemeId: config.colorThemeId,
    reviewChangesShowSavedEdits: config.reviewChangesShowSavedEdits,
    reviewChangesShowRecentRiskyEdits: config.reviewChangesShowRecentRiskyEdits,
    savedItems: cloneSavedItems(config.savedItems),
    configRevision: config.configRevision,
  }
}

export function nextWikitabConfigRevision(current: number): number {
  return Math.max(Date.now(), current + 1)
}

function isQuotaExceededError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22
  )
}

function warnConfigPersistFailed(reason: string, detail?: unknown): void {
  if (!import.meta.env.DEV) return
  console.warn('[wikitab] config persist failed:', reason, detail ?? '')
}

export function writeWikitabConfig(config: WikitabConfig): boolean {
  if (typeof window === 'undefined') return true

  try {
    window.localStorage.setItem(WIKITAB_CONFIG_STORAGE_KEY, JSON.stringify(config))
    return true
  } catch (error) {
    if (isQuotaExceededError(error)) {
      warnConfigPersistFailed('localStorage quota exceeded')
    } else {
      warnConfigPersistFailed('localStorage setItem failed', error)
    }
    return false
  }
}
