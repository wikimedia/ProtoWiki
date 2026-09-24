import {
  WIKITAB_SAVED_MODULE_ID,
  WIKITAB_SECTIONS,
  type WikitabModuleId,
  type WikitabSectionId,
} from '../sections'
import { normalizeColorThemeId, type WikitabColorThemeId } from './wikitabColorThemes'
import { articleTitleKey } from './wikitabHtml'

/** Bump the suffix on breaking shape changes; add fields in-place until then. */
export const WIKITAB_CONFIG_STORAGE_KEY = 'wikitab-config-v1'

export interface WikitabSavedArticle {
  /** Canonical lowercase key via `articleTitleKey()`. */
  titleKey: string
  /** Display title (spaces, not underscores). */
  title: string
  thumbnailUrl?: string
  description?: string
  /** Unix ms — most recently saved first. */
  savedAt: number
}

export interface WikitabConfig {
  /** Most recently pinned first. Includes `saved` and feed section ids. */
  pinnedSectionIds: WikitabModuleId[]
  /** Module ids hidden from the home feed; feed ids are also skipped for fetching. */
  hiddenSectionIds: WikitabModuleId[]
  /** Normalized article title keys hidden from the home feed (read from localStorage). */
  hiddenArticleTitleKeys: string[]
  /** Activity-tab revision ids dismissed permanently from the feed. */
  dismissedActivityRevids: number[]
  /** Page background theme; null keeps Codex `--background-color-base`. */
  colorThemeId: WikitabColorThemeId | null
  /** Most recently saved first. */
  savedArticles: WikitabSavedArticle[]
}

const DEFAULT_WIKITAB_CONFIG: WikitabConfig = {
  pinnedSectionIds: [],
  hiddenSectionIds: [],
  hiddenArticleTitleKeys: [],
  dismissedActivityRevids: [],
  colorThemeId: null,
  savedArticles: [],
}

const VALID_FEED_SECTION_IDS = new Set<WikitabSectionId>(
  WIKITAB_SECTIONS.map((section) => section.id),
)

const VALID_MODULE_IDS = new Set<WikitabModuleId>([
  ...VALID_FEED_SECTION_IDS,
  WIKITAB_SAVED_MODULE_ID,
])

function isModuleId(value: string): value is WikitabModuleId {
  return VALID_MODULE_IDS.has(value as WikitabModuleId)
}

/** Unknown and duplicate ids are dropped; order is preserved. */
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

/** Unknown and duplicate ids are dropped; order is preserved. */
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

/** Unknown and duplicate keys are dropped; order is preserved. */
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

/** Unknown and duplicate revids are dropped; order is preserved. */
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

/** Unknown and duplicate entries are dropped; most recent `savedAt` wins per titleKey. */
export function normalizeSavedArticles(raw: unknown): WikitabSavedArticle[] {
  if (!Array.isArray(raw)) return []

  const byKey = new Map<string, WikitabSavedArticle>()

  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const record = item as Record<string, unknown>
    const title = typeof record.title === 'string' ? record.title.trim() : ''
    const titleKey = articleTitleKey(typeof record.titleKey === 'string' ? record.titleKey : title)
    if (!titleKey || !title) continue

    const savedAt =
      typeof record.savedAt === 'number' && Number.isFinite(record.savedAt)
        ? record.savedAt
        : Date.now()
    const thumbnailUrl =
      typeof record.thumbnailUrl === 'string' && record.thumbnailUrl.trim()
        ? record.thumbnailUrl.trim()
        : undefined
    const description =
      typeof record.description === 'string' && record.description.trim()
        ? record.description.trim()
        : undefined

    const existing = byKey.get(titleKey)
    if (existing && existing.savedAt >= savedAt) continue

    byKey.set(titleKey, {
      titleKey,
      title: title.replace(/_/g, ' '),
      thumbnailUrl,
      description,
      savedAt,
    })
  }

  return [...byKey.values()].sort((a, b) => b.savedAt - a.savedAt)
}

function normalizePinnedFromCommaList(raw: string): WikitabModuleId[] {
  const seen = new Set<WikitabModuleId>()
  const ids: WikitabModuleId[] = []

  for (const part of raw.split(',')) {
    const id = part.trim()
    if (!id || !isModuleId(id) || seen.has(id)) continue
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
    hiddenSectionIds: normalizeHiddenSectionIds(record.hiddenSectionIds),
    hiddenArticleTitleKeys: normalizeHiddenArticleTitleKeys(record.hiddenArticleTitleKeys),
    dismissedActivityRevids: normalizeDismissedActivityRevids(record.dismissedActivityRevids),
    colorThemeId: normalizeColorThemeId(record.colorThemeId),
    savedArticles: normalizeSavedArticles(record.savedArticles),
  }
}

function cloneConfig(config: WikitabConfig): WikitabConfig {
  return {
    pinnedSectionIds: [...config.pinnedSectionIds],
    hiddenSectionIds: [...config.hiddenSectionIds],
    hiddenArticleTitleKeys: [...config.hiddenArticleTitleKeys],
    dismissedActivityRevids: [...config.dismissedActivityRevids],
    colorThemeId: config.colorThemeId,
    savedArticles: config.savedArticles.map((article) => ({ ...article })),
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

function readLegacyPinnedFromUrl(): WikitabModuleId[] {
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
