import { WIKITAB_SECTIONS, type WikitabSectionId } from '../sections'

/** Bump the suffix on breaking shape changes; add fields in-place until then. */
export const WIKITAB_CONFIG_STORAGE_KEY = 'wikitab-config-v1'

export interface WikitabConfig {
  /** Most recently pinned first. */
  pinnedSectionIds: WikitabSectionId[]
}

const DEFAULT_WIKITAB_CONFIG: WikitabConfig = {
  pinnedSectionIds: [],
}

const VALID_IDS = new Set<WikitabSectionId>(WIKITAB_SECTIONS.map((section) => section.id))

function isSectionId(value: string): value is WikitabSectionId {
  return VALID_IDS.has(value as WikitabSectionId)
}

/** Unknown and duplicate ids are dropped; order is preserved. */
export function normalizePinnedSectionIds(raw: unknown): WikitabSectionId[] {
  if (!Array.isArray(raw)) return []

  const seen = new Set<WikitabSectionId>()
  const ids: WikitabSectionId[] = []

  for (const item of raw) {
    if (typeof item !== 'string') continue
    const id = item.trim()
    if (!id || !isSectionId(id) || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }

  return ids
}

function normalizePinnedFromCommaList(raw: string): WikitabSectionId[] {
  const seen = new Set<WikitabSectionId>()
  const ids: WikitabSectionId[] = []

  for (const part of raw.split(',')) {
    const id = part.trim()
    if (!id || !isSectionId(id) || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }

  return ids
}

function normalizeConfig(raw: unknown): WikitabConfig {
  if (typeof raw !== 'object' || raw === null) {
    return { ...DEFAULT_WIKITAB_CONFIG, pinnedSectionIds: [] }
  }

  const record = raw as Record<string, unknown>

  return {
    pinnedSectionIds: normalizePinnedSectionIds(record.pinnedSectionIds),
  }
}

function cloneConfig(config: WikitabConfig): WikitabConfig {
  return {
    pinnedSectionIds: [...config.pinnedSectionIds],
  }
}

function clearStoredConfig(): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(WIKITAB_CONFIG_STORAGE_KEY)
  } catch {
    // Private mode or blocked storage — ignore.
  }
}

function persistConfig(config: WikitabConfig): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(WIKITAB_CONFIG_STORAGE_KEY, JSON.stringify(config))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}

function readLegacyPinnedFromUrl(): WikitabSectionId[] {
  if (typeof window === 'undefined') return []

  const raw = new URLSearchParams(window.location.search).get('pinned')
  if (!raw) return []

  return normalizePinnedFromCommaList(raw)
}

function stripLegacyPinnedFromUrl(): void {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  if (!url.searchParams.has('pinned')) return

  url.searchParams.delete('pinned')
  window.history.replaceState(window.history.state, '', url)
}

function migrateLegacyPinnedFromUrl(config: WikitabConfig): WikitabConfig {
  if (config.pinnedSectionIds.length) return config

  const legacyPinned = readLegacyPinnedFromUrl()
  if (!legacyPinned.length) return config

  const migrated = { ...config, pinnedSectionIds: legacyPinned }
  persistConfig(migrated)
  stripLegacyPinnedFromUrl()
  return migrated
}

export function saveWikitabConfig(config: WikitabConfig): void {
  persistConfig(normalizeConfig(config))
}

export function loadWikitabConfig(): WikitabConfig {
  if (typeof window === 'undefined') {
    return cloneConfig(DEFAULT_WIKITAB_CONFIG)
  }

  try {
    const raw = window.localStorage.getItem(WIKITAB_CONFIG_STORAGE_KEY)
    if (!raw) {
      return migrateLegacyPinnedFromUrl(cloneConfig(DEFAULT_WIKITAB_CONFIG))
    }

    const parsed: unknown = JSON.parse(raw)
    const normalized = normalizeConfig(parsed)
    persistConfig(normalized)
    return migrateLegacyPinnedFromUrl(normalized)
  } catch {
    clearStoredConfig()
    return migrateLegacyPinnedFromUrl(cloneConfig(DEFAULT_WIKITAB_CONFIG))
  }
}

export function patchWikitabConfig(partial: Partial<WikitabConfig>): WikitabConfig {
  const next = normalizeConfig({ ...loadWikitabConfig(), ...partial })
  saveWikitabConfig(next)
  return next
}
