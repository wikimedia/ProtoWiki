import {
  DEFAULT_MLT_CUSTOM,
  normalizeMltCustom,
  type MorelikeMltCustomSettings,
  type MorelikeMltPreset,
  type MorelikeSortOrder,
} from './morelikeMlt'
import { type MorelikeRequestMode } from './fetchMorelike'

export interface MorelikePlaygroundState {
  seedText: string
  resultLimit: number
  sortOrder: MorelikeSortOrder
  mltPreset: MorelikeMltPreset
  mltCustom: MorelikeMltCustomSettings
  classicNoboostlinks: boolean
  requestMode: MorelikeRequestMode
}

const STORAGE_KEY = 'protowiki-morelike-playground-v2'
const LEGACY_STORAGE_KEY = 'protowiki-morelike-playground-v1'

export const DEFAULT_MORELIKE_PLAYGROUND_STATE: MorelikePlaygroundState = {
  seedText: '',
  resultLimit: 20,
  sortOrder: 'relevance',
  mltPreset: 'default',
  mltCustom: { ...DEFAULT_MLT_CUSTOM },
  classicNoboostlinks: true,
  requestMode: 'single',
}

function clampResultLimit(value: number): number {
  return Math.min(100, Math.max(1, Math.round(value)))
}

function isSortOrder(value: unknown): value is MorelikeSortOrder {
  return value === 'relevance' || value === 'lastEdit'
}

function isMltPreset(value: unknown): value is MorelikeMltPreset {
  return value === 'default' || value === 'custom'
}

function isRequestMode(value: unknown): value is MorelikeRequestMode {
  return value === 'single' || value === 'total' || value === 'perPage'
}

function normalizeMltPreset(value: unknown): MorelikeMltPreset {
  if (isMltPreset(value)) return value
  // Removed presets fall back to wiki default.
  if (value === 'balancedTitles' || value === 'fewerTerms') return 'default'
  return DEFAULT_MORELIKE_PLAYGROUND_STATE.mltPreset
}

function normalizeRequestMode(record: Record<string, unknown>): MorelikeRequestMode {
  if (isRequestMode(record.requestMode)) return record.requestMode

  // Legacy v1 boolean: interleave true → total split across seeds.
  if (typeof record.interleave === 'boolean') {
    return record.interleave ? 'total' : 'single'
  }

  return DEFAULT_MORELIKE_PLAYGROUND_STATE.requestMode
}

function normalizeState(input: unknown): MorelikePlaygroundState {
  if (typeof input !== 'object' || input === null) {
    return { ...DEFAULT_MORELIKE_PLAYGROUND_STATE, mltCustom: { ...DEFAULT_MLT_CUSTOM } }
  }

  const record = input as Record<string, unknown>

  return {
    seedText: typeof record.seedText === 'string' ? record.seedText : DEFAULT_MORELIKE_PLAYGROUND_STATE.seedText,
    resultLimit:
      typeof record.resultLimit === 'number'
        ? clampResultLimit(record.resultLimit)
        : DEFAULT_MORELIKE_PLAYGROUND_STATE.resultLimit,
    sortOrder: isSortOrder(record.sortOrder)
      ? record.sortOrder
      : DEFAULT_MORELIKE_PLAYGROUND_STATE.sortOrder,
    mltPreset: normalizeMltPreset(record.mltPreset),
    mltCustom: normalizeMltCustom(record.mltCustom),
    classicNoboostlinks:
      typeof record.classicNoboostlinks === 'boolean'
        ? record.classicNoboostlinks
        : DEFAULT_MORELIKE_PLAYGROUND_STATE.classicNoboostlinks,
    requestMode: normalizeRequestMode(record),
  }
}

function clearStoredState(key: string): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(key)
  } catch {
    // Private mode or blocked storage — ignore.
  }
}

function readStoredJson(key: string): unknown | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = window.localStorage.getItem(key)
    if (!stored) return null
    return JSON.parse(stored) as unknown
  } catch {
    clearStoredState(key)
    return null
  }
}

export function loadMorelikePlaygroundState(): MorelikePlaygroundState {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_MORELIKE_PLAYGROUND_STATE, mltCustom: { ...DEFAULT_MLT_CUSTOM } }
  }

  const parsed = readStoredJson(STORAGE_KEY) ?? readStoredJson(LEGACY_STORAGE_KEY)
  if (!parsed) {
    return { ...DEFAULT_MORELIKE_PLAYGROUND_STATE, mltCustom: { ...DEFAULT_MLT_CUSTOM } }
  }

  const normalized = normalizeState(parsed)
  persistMorelikePlaygroundState(normalized)

  if (readStoredJson(LEGACY_STORAGE_KEY)) {
    clearStoredState(LEGACY_STORAGE_KEY)
  }

  return normalized
}

export function persistMorelikePlaygroundState(state: MorelikePlaygroundState): void {
  if (typeof window === 'undefined') return

  const normalized = normalizeState(state)

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}
