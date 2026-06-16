import {
  DEFAULT_MLT_CUSTOM,
  normalizeMltCustom,
  type MorelikeMltCustomSettings,
  type MorelikeMltPreset,
  type MorelikeSortOrder,
} from './morelikeMlt'

export interface MorelikePlaygroundState {
  seedText: string
  resultLimit: number
  sortOrder: MorelikeSortOrder
  mltPreset: MorelikeMltPreset
  mltCustom: MorelikeMltCustomSettings
  classicNoboostlinks: boolean
}

const STORAGE_KEY = 'protowiki-morelike-playground-v1'

export const DEFAULT_MORELIKE_PLAYGROUND_STATE: MorelikePlaygroundState = {
  seedText: '',
  resultLimit: 20,
  sortOrder: 'relevance',
  mltPreset: 'default',
  mltCustom: { ...DEFAULT_MLT_CUSTOM },
  classicNoboostlinks: true,
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

function normalizeMltPreset(value: unknown): MorelikeMltPreset {
  if (isMltPreset(value)) return value
  // Removed presets fall back to wiki default.
  if (value === 'balancedTitles' || value === 'fewerTerms') return 'default'
  return DEFAULT_MORELIKE_PLAYGROUND_STATE.mltPreset
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
  }
}

function clearStoredState(): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Private mode or blocked storage — ignore.
  }
}

export function loadMorelikePlaygroundState(): MorelikePlaygroundState {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_MORELIKE_PLAYGROUND_STATE, mltCustom: { ...DEFAULT_MLT_CUSTOM } }
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return { ...DEFAULT_MORELIKE_PLAYGROUND_STATE, mltCustom: { ...DEFAULT_MLT_CUSTOM } }

    const parsed: unknown = JSON.parse(stored)
    const normalized = normalizeState(parsed)
    persistMorelikePlaygroundState(normalized)
    return normalized
  } catch {
    clearStoredState()
    return { ...DEFAULT_MORELIKE_PLAYGROUND_STATE, mltCustom: { ...DEFAULT_MLT_CUSTOM } }
  }
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
