import {
  WIKITAB_CONFIGURE_MODULES,
  WIKITAB_DAILY_READS_MODULE_ID,
  WIKITAB_SAVED_MODULE_ID,
  WIKITAB_SAVED_MODULE_SPEC,
  WIKITAB_SECTIONS,
  WIKITAB_REVIEW_CHANGES_MODULE_ID,
  WIKITAB_SUGGESTED_EDITS_MODULE_ID,
  type WikitabCardVariant,
  type WikitabModuleId,
  type WikitabSectionId,
} from '../sections'
import { isWikitabSavedIconId, type WikitabSavedIconId } from './wikitabSavedIcons'
import { normalizeColorThemeId, type WikitabColorThemeId } from './wikitabColorThemes'
import { migrateLegacyArticleToItem, migrateV2SavedCardsToItems } from './savedItemMigration'
import {
  cloneSavedItems,
  normalizeSavedItems,
  type WikitabSavedCardData,
  type WikitabSavedItem,
} from './wikitabSavedItems'
import { articleTitleKey, articleUrl } from './wikitabHtml'

export type {
  WikitabSavedArticleItem,
  WikitabSavedCardData,
  WikitabSavedChangeItem,
  WikitabSavedDiscussionItem,
  WikitabSavedItem,
  WikitabSavedItemType,
  WikitabSavedSnippetItem,
  WikitabSavedSuggestionItem,
} from './wikitabSavedItems'

/** Bump the suffix on breaking shape changes; add fields in-place until then. */
export const WIKITAB_CONFIG_STORAGE_KEY = 'wikitab-config-v3'

const PREVIOUS_WIKITAB_CONFIG_STORAGE_KEY = 'wikitab-config-v2'
const LEGACY_WIKITAB_CONFIG_STORAGE_KEY = 'wikitab-config-v1'

/** Cache-only localStorage keys — safe to delete when config writes hit quota. */
const WIKITAB_CACHE_KEY_PREFIXES = [
  'wikitab-feed-cache-v',
  'wikitab-daily-reads-cache-v',
  'wikitab-suggested-edits-cache-v',
  'wikitab-review-changes-cache-v',
  'wikitab-potd-cache-v',
] as const

export interface WikitabConfigPatchResult {
  config: WikitabConfig
  persisted: boolean
}

/** @deprecated Migrated to {@link WikitabSavedCard} on v2 load. */
export interface WikitabSavedArticle {
  titleKey: string
  title: string
  thumbnailUrl?: string
  description?: string
  savedAt: number
}

export interface WikitabSavedCardPresentation {
  source: 'search' | WikitabModuleId
  variant: WikitabCardVariant
  cardHeight: number
  thumbnailSize: number
  fullHook?: boolean
  supportingIcon?: WikitabSavedIconId
}

/** @deprecated v2 card snapshot — migrated to {@link WikitabSavedItem} on v3 load. */
export interface WikitabSavedCard {
  /** Stable save id — equals `card.key` at save time. */
  id: string
  /** Article under the card — drives recommendations and hide filter. */
  articleTitleKey: string
  articleTitle: string
  savedAt: number
  presentation: WikitabSavedCardPresentation
  card: WikitabSavedCardData
}

export interface WikitabConfig {
  /** Most recently pinned first. Includes `saved` and feed section ids. */
  pinnedSectionIds: WikitabModuleId[]
  /** Module ids hidden from the home feed; feed ids are also skipped for fetching. */
  hiddenSectionIds: WikitabModuleId[]
  /** Configure-panel / home-feed order; empty uses the registry default. */
  moduleOrderIds: WikitabModuleId[]
  /** Normalized article title keys hidden from the home feed (read from localStorage). */
  hiddenArticleTitleKeys: string[]
  /** Activity-tab revision ids dismissed permanently from the feed. */
  dismissedActivityRevids: number[]
  /** Commons file page ids hidden from Images-tab search results. */
  hiddenCommonsImagePageIds: number[]
  /** UTC day key when the POTD attribution card was last opened; null when collapsed. */
  potdAttributionExpandedDay: string | null
  /** Page background theme; null keeps Codex `--background-color-base`. */
  colorThemeId: WikitabColorThemeId | null
  /** Most recently saved first. */
  savedItems: WikitabSavedItem[]
  /** Monotonic write counter — lets open tabs ignore stale cross-tab storage events. */
  configRevision: number
}

const DEFAULT_WIKITAB_CONFIG: WikitabConfig = {
  pinnedSectionIds: [],
  hiddenSectionIds: [],
  moduleOrderIds: [],
  hiddenArticleTitleKeys: [],
  dismissedActivityRevids: [],
  hiddenCommonsImagePageIds: [],
  potdAttributionExpandedDay: null,
  colorThemeId: null,
  savedItems: [],
  configRevision: 0,
}

const VALID_FEED_SECTION_IDS = new Set<WikitabSectionId>(
  WIKITAB_SECTIONS.map((section) => section.id),
)

const VALID_MODULE_IDS = new Set<WikitabModuleId>([
  ...VALID_FEED_SECTION_IDS,
  WIKITAB_SAVED_MODULE_ID,
  WIKITAB_DAILY_READS_MODULE_ID,
  WIKITAB_SUGGESTED_EDITS_MODULE_ID,
  WIKITAB_REVIEW_CHANGES_MODULE_ID,
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

/** Unknown and duplicate ids are dropped; order is preserved; missing modules appended. */
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
export function normalizePotdAttributionExpandedDay(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const day = raw.trim()
  return day.length > 0 ? day : null
}

function normalizePotdAttributionExpandedDayFromRecord(
  record: Record<string, unknown>,
): string | null {
  if ('potdAttributionExpandedDay' in record) {
    return normalizePotdAttributionExpandedDay(record.potdAttributionExpandedDay)
  }
  /* Legacy `potdAttributionDismissedDay`: null meant open. Default is now collapsed. */
  return null
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

/** Unknown and duplicate page ids are dropped; order is preserved. */
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

function normalizeSavedArticlesLegacy(raw: unknown): WikitabSavedArticle[] {
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

function legacyArticleToSavedCard(article: WikitabSavedArticle): WikitabSavedCard {
  const cardKey = `search:${article.titleKey}`
  return {
    id: cardKey,
    articleTitleKey: article.titleKey,
    articleTitle: article.title,
    savedAt: article.savedAt,
    presentation: {
      source: 'search',
      variant: WIKITAB_SAVED_MODULE_SPEC.variant,
      cardHeight: WIKITAB_SAVED_MODULE_SPEC.cardHeight,
      thumbnailSize: WIKITAB_SAVED_MODULE_SPEC.thumbnailSize,
    },
    card: {
      key: cardKey,
      href: articleUrl(article.title),
      linkTitle: article.title,
      title: article.title,
      description: article.description,
      thumbnailUrl: article.thumbnailUrl,
    },
  }
}

function normalizeSavedCardData(raw: unknown): WikitabSavedCardData | null {
  if (typeof raw !== 'object' || raw === null) return null
  const record = raw as Record<string, unknown>
  const key = typeof record.key === 'string' ? record.key.trim() : ''
  if (!key) return null

  const str = (field: string): string | undefined => {
    const value = record[field]
    return typeof value === 'string' && value.trim() ? value.trim() : undefined
  }

  let supportingSignals: WikitabSavedCardData['supportingSignals']
  if (Array.isArray(record.supportingSignals)) {
    supportingSignals = []
    for (const item of record.supportingSignals) {
      if (typeof item !== 'object' || item === null) continue
      const signal = item as Record<string, unknown>
      const text = typeof signal.text === 'string' ? signal.text.trim() : ''
      const iconRaw = typeof signal.icon === 'string' ? signal.icon.trim() : ''
      if (!text || !isWikitabSavedIconId(iconRaw)) continue
      supportingSignals.push({ icon: iconRaw, text })
    }
    if (!supportingSignals.length) supportingSignals = undefined
  }

  return {
    key,
    href: str('href'),
    linkTitle: str('linkTitle'),
    title: str('title'),
    description: str('description'),
    html: str('html'),
    thumbnailUrl: str('thumbnailUrl'),
    thumbnailTitle: str('thumbnailTitle'),
    supportingText: str('supportingText'),
    supportingSignals,
    supportingTextEnd: str('supportingTextEnd'),
  }
}

function normalizeSavedCardPresentation(raw: unknown): WikitabSavedCardPresentation | null {
  if (typeof raw !== 'object' || raw === null) return null
  const record = raw as Record<string, unknown>
  const sourceRaw = record.source
  const source =
    sourceRaw === 'search'
      ? 'search'
      : typeof sourceRaw === 'string' && isModuleId(sourceRaw.trim())
        ? (sourceRaw.trim() as WikitabModuleId)
        : null
  if (!source) return null

  const variant = record.variant === 'text' ? 'text' : record.variant === 'thumbnail' ? 'thumbnail' : null
  if (!variant) return null

  const cardHeight = typeof record.cardHeight === 'number' ? record.cardHeight : NaN
  const thumbnailSize = typeof record.thumbnailSize === 'number' ? record.thumbnailSize : NaN
  if (!Number.isFinite(cardHeight) || !Number.isFinite(thumbnailSize)) return null

  const supportingIconRaw =
    typeof record.supportingIcon === 'string' ? record.supportingIcon.trim() : ''
  const supportingIcon = isWikitabSavedIconId(supportingIconRaw) ? supportingIconRaw : undefined

  return {
    source,
    variant,
    cardHeight,
    thumbnailSize,
    fullHook: record.fullHook === true ? true : undefined,
    supportingIcon,
  }
}

/** Unknown and duplicate entries are dropped; most recent `savedAt` wins per card id. */
export function normalizeSavedCards(raw: unknown): WikitabSavedCard[] {
  if (!Array.isArray(raw)) return []

  const byId = new Map<string, WikitabSavedCard>()

  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const record = item as Record<string, unknown>

    const id = typeof record.id === 'string' ? record.id.trim() : ''
    const articleTitle =
      typeof record.articleTitle === 'string' ? record.articleTitle.trim().replace(/_/g, ' ') : ''
    const articleTitleKeyValue = articleTitleKey(
      typeof record.articleTitleKey === 'string' ? record.articleTitleKey : articleTitle,
    )
    const presentation = normalizeSavedCardPresentation(record.presentation)
    const card = normalizeSavedCardData(record.card)

    if (!id || !articleTitleKeyValue || !articleTitle || !presentation || !card) continue

    const savedAt =
      typeof record.savedAt === 'number' && Number.isFinite(record.savedAt)
        ? record.savedAt
        : Date.now()

    const existing = byId.get(id)
    if (existing && existing.savedAt >= savedAt) continue

    byId.set(id, {
      id,
      articleTitleKey: articleTitleKeyValue,
      articleTitle,
      savedAt,
      presentation,
      card: { ...card, key: card.key || id },
    })
  }

  return [...byId.values()].sort((a, b) => b.savedAt - a.savedAt)
}

function normalizeSavedItemsFromRecord(record: Record<string, unknown>): WikitabSavedItem[] {
  if (Array.isArray(record.savedItems)) {
    return normalizeSavedItems(record.savedItems)
  }
  if (Array.isArray(record.savedCards)) {
    const v2Cards = normalizeSavedCards(record.savedCards)
    return migrateV2SavedCardsToItems(v2Cards)
  }
  if (Array.isArray(record.savedArticles)) {
    return normalizeSavedArticlesLegacy(record.savedArticles).map(migrateLegacyArticleToItem)
  }
  return []
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

function normalizeConfigRevision(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0
  return Math.max(0, Math.floor(raw))
}

function normalizeConfig(raw: unknown): WikitabConfig {
  if (typeof raw !== 'object' || raw === null) {
    return { ...DEFAULT_WIKITAB_CONFIG, pinnedSectionIds: [] }
  }

  const record = raw as Record<string, unknown>

  return {
    pinnedSectionIds: normalizePinnedSectionIds(record.pinnedSectionIds),
    hiddenSectionIds: normalizeHiddenSectionIds(record.hiddenSectionIds),
    moduleOrderIds: normalizeModuleOrderIds(record.moduleOrderIds),
    hiddenArticleTitleKeys: normalizeHiddenArticleTitleKeys(record.hiddenArticleTitleKeys),
    dismissedActivityRevids: normalizeDismissedActivityRevids(record.dismissedActivityRevids),
    hiddenCommonsImagePageIds: normalizeHiddenCommonsImagePageIds(record.hiddenCommonsImagePageIds),
    potdAttributionExpandedDay: normalizePotdAttributionExpandedDayFromRecord(record),
    colorThemeId: normalizeColorThemeId(record.colorThemeId),
    savedItems: normalizeSavedItemsFromRecord(record),
    configRevision: normalizeConfigRevision(record.configRevision),
  }
}

function cloneConfig(config: WikitabConfig): WikitabConfig {
  return {
    pinnedSectionIds: [...config.pinnedSectionIds],
    hiddenSectionIds: [...config.hiddenSectionIds],
    moduleOrderIds: [...config.moduleOrderIds],
    hiddenArticleTitleKeys: [...config.hiddenArticleTitleKeys],
    dismissedActivityRevids: [...config.dismissedActivityRevids],
    hiddenCommonsImagePageIds: [...config.hiddenCommonsImagePageIds],
    potdAttributionExpandedDay: config.potdAttributionExpandedDay,
    colorThemeId: config.colorThemeId,
    savedItems: cloneSavedItems(config.savedItems),
    configRevision: config.configRevision,
  }
}

function readLegacyConfigJson(): string | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage.getItem(LEGACY_WIKITAB_CONFIG_STORAGE_KEY)
  } catch {
    return null
  }
}

function migrateLegacyConfigStorage(): void {
  if (typeof window === 'undefined') return

  const legacyRaw = readLegacyConfigJson()
  if (!legacyRaw) return

  try {
    const migrated = normalizeConfig(JSON.parse(legacyRaw))
    persistConfig(migrated)
    window.localStorage.removeItem(LEGACY_WIKITAB_CONFIG_STORAGE_KEY)
  } catch {
    try {
      window.localStorage.removeItem(LEGACY_WIKITAB_CONFIG_STORAGE_KEY)
    } catch {
      // ignore
    }
  }
}

function migrateV2ConfigStorage(): void {
  if (typeof window === 'undefined') return

  try {
    const existingV3 = window.localStorage.getItem(WIKITAB_CONFIG_STORAGE_KEY)
    if (existingV3) return

    const v2Raw = window.localStorage.getItem(PREVIOUS_WIKITAB_CONFIG_STORAGE_KEY)
    if (!v2Raw) return

    const migrated = normalizeConfig(JSON.parse(v2Raw))
    persistConfig(migrated)
    window.localStorage.removeItem(PREVIOUS_WIKITAB_CONFIG_STORAGE_KEY)
  } catch {
    try {
      window.localStorage.removeItem(PREVIOUS_WIKITAB_CONFIG_STORAGE_KEY)
    } catch {
      // ignore
    }
  }
}

function readConfigFromStorage(): WikitabConfig {
  if (typeof window === 'undefined') {
    return cloneConfig(DEFAULT_WIKITAB_CONFIG)
  }

  migrateLegacyConfigStorage()
  migrateV2ConfigStorage()

  try {
    const raw = window.localStorage.getItem(WIKITAB_CONFIG_STORAGE_KEY)
    if (!raw) return cloneConfig(DEFAULT_WIKITAB_CONFIG)
    return normalizeConfig(JSON.parse(raw))
  } catch {
    return cloneConfig(DEFAULT_WIKITAB_CONFIG)
  }
}

function storedConfigMatches(expected: WikitabConfig, actual: WikitabConfig): boolean {
  return (
    actual.configRevision === expected.configRevision &&
    JSON.stringify(actual) === JSON.stringify(expected)
  )
}

function nextConfigRevision(current: number): number {
  return Math.max(Date.now(), current + 1)
}

/** Parse a `storage` event payload without touching localStorage. */
export function parseWikitabConfigJson(raw: string): WikitabConfig {
  return normalizeConfig(JSON.parse(raw))
}

function clearStoredConfig(): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(WIKITAB_CONFIG_STORAGE_KEY)
  } catch {
    // Private mode or blocked storage — ignore.
  }
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

/** Removes Wikitab feed caches from localStorage — never touches config. */
export function evictWikitabCaches(): number {
  if (typeof window === 'undefined') return 0

  let removed = 0

  try {
    const keysToRemove: string[] = []

    for (let index = 0; index < window.localStorage.length; index++) {
      const key = window.localStorage.key(index)
      if (!key || key === WIKITAB_CONFIG_STORAGE_KEY) continue
      if (WIKITAB_CACHE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        keysToRemove.push(key)
      }
    }

    for (const key of keysToRemove) {
      window.localStorage.removeItem(key)
      removed++
    }
  } catch {
    // Private mode or blocked storage — ignore.
  }

  return removed
}

function persistConfig(config: WikitabConfig): boolean {
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

export function saveWikitabConfig(config: WikitabConfig): boolean {
  return persistConfig(normalizeConfig(config))
}

export function loadWikitabConfig(): WikitabConfig {
  if (typeof window === 'undefined') {
    return cloneConfig(DEFAULT_WIKITAB_CONFIG)
  }

  migrateLegacyConfigStorage()
  migrateV2ConfigStorage()

  try {
    const raw = window.localStorage.getItem(WIKITAB_CONFIG_STORAGE_KEY)
    if (!raw) {
      return migrateLegacyPinnedFromUrl(cloneConfig(DEFAULT_WIKITAB_CONFIG))
    }

    const parsed: unknown = JSON.parse(raw)
    const normalized = normalizeConfig(parsed)
    return migrateLegacyPinnedFromUrl(normalized)
  } catch {
    clearStoredConfig()
    return migrateLegacyPinnedFromUrl(cloneConfig(DEFAULT_WIKITAB_CONFIG))
  }
}

const PATCH_MAX_ATTEMPTS = 6

export function patchWikitabConfig(partial: Partial<WikitabConfig>): WikitabConfigPatchResult {
  if (typeof window === 'undefined') {
    const next = normalizeConfig({ ...DEFAULT_WIKITAB_CONFIG, ...partial })
    return { config: cloneConfig(next), persisted: true }
  }

  let evictedCaches = false

  for (let attempt = 0; attempt < PATCH_MAX_ATTEMPTS; attempt++) {
    const current = readConfigFromStorage()
    const next = normalizeConfig({
      ...current,
      ...partial,
      configRevision: nextConfigRevision(current.configRevision),
    })

    const guard = readConfigFromStorage()
    if (guard.configRevision !== current.configRevision) continue

    const wrote = persistConfig(next)
    if (!wrote) {
      if (!evictedCaches) {
        evictWikitabCaches()
        evictedCaches = true
      }
      continue
    }

    const verify = readConfigFromStorage()
    if (storedConfigMatches(next, verify)) {
      return { config: cloneConfig(next), persisted: true }
    }
  }

  warnConfigPersistFailed('patch exhausted retries', partial)
  return { config: loadWikitabConfig(), persisted: false }
}
