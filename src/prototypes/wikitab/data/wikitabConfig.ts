import { migrateWikitabStorage } from './wikitabStorageMigration'
import {
  cloneWikitabConfig,
  DEFAULT_WIKITAB_CONFIG,
  normalizeWikitabConfig,
  nextWikitabConfigRevision,
  WIKITAB_CONFIG_STORAGE_KEY,
  writeWikitabConfig,
  type WikitabConfig,
} from './wikitabConfigNormalize'

export type {
  WikitabSavedArticleItem,
  WikitabSavedChangeItem,
  WikitabSavedDiscussionItem,
  WikitabSavedItem,
  WikitabSavedItemType,
  WikitabSavedListItem,
  WikitabSavedQuoteItem,
  WikitabSavedSnippetItem,
  WikitabSavedSuggestionItem,
  WikitabSavedWordItem,
} from './wikitabSavedItems'

export {
  normalizeDismissedActivityRevids,
  normalizeHiddenArticleTitleKeys,
  normalizeHiddenCommonsImagePageIds,
  normalizeHiddenSectionIds,
  normalizeModuleOrderIds,
  normalizePinnedSectionIds,
  normalizePotdAttributionExpandedDay,
  normalizeWikitabConfig,
  nextWikitabConfigRevision,
  WIKITAB_CONFIG_STORAGE_KEY,
  writeWikitabConfig,
  type WikitabConfig,
} from './wikitabConfigNormalize'

/** Cache-only localStorage keys — safe to delete when config writes hit quota. */
const WIKITAB_CACHE_KEY_PREFIXES = [
  'wikitab-feed-cache-v',
  'wikitab-daily-reads-cache-v',
  'wikitab-suggested-edits-cache-v',
  'wikitab-review-changes-cache-v',
  'wikitab-potd-cache-v',
  'wikitab-featured-cache-v',
] as const

export interface WikitabConfigPatchResult {
  config: WikitabConfig
  persisted: boolean
}

function readConfigFromStorage(): WikitabConfig {
  if (typeof window === 'undefined') {
    return cloneWikitabConfig(DEFAULT_WIKITAB_CONFIG)
  }

  try {
    const raw = window.localStorage.getItem(WIKITAB_CONFIG_STORAGE_KEY)
    if (!raw) return cloneWikitabConfig(DEFAULT_WIKITAB_CONFIG)
    return normalizeWikitabConfig(JSON.parse(raw))
  } catch {
    return cloneWikitabConfig(DEFAULT_WIKITAB_CONFIG)
  }
}

function storedConfigMatches(expected: WikitabConfig, actual: WikitabConfig): boolean {
  return (
    actual.configRevision === expected.configRevision &&
    JSON.stringify(actual) === JSON.stringify(expected)
  )
}

/** Parse a `storage` event payload without touching localStorage. */
export function parseWikitabConfigJson(raw: string): WikitabConfig {
  return normalizeWikitabConfig(JSON.parse(raw))
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

export function saveWikitabConfig(config: WikitabConfig): boolean {
  return writeWikitabConfig(normalizeWikitabConfig(config))
}

export function loadWikitabConfig(): WikitabConfig {
  migrateWikitabStorage()
  return readConfigFromStorage()
}

const PATCH_MAX_ATTEMPTS = 6

/** Restore configure-panel defaults: registry module order, all modules visible, no pins. */
export function resetWikitabModuleConfigure(): WikitabConfigPatchResult {
  return patchWikitabConfig({
    moduleOrderIds: [],
    hiddenSectionIds: [],
    pinnedSectionIds: [],
  })
}

export function patchWikitabConfig(partial: Partial<WikitabConfig>): WikitabConfigPatchResult {
  if (typeof window === 'undefined') {
    const next = normalizeWikitabConfig({ ...DEFAULT_WIKITAB_CONFIG, ...partial })
    return { config: cloneWikitabConfig(next), persisted: true }
  }

  migrateWikitabStorage()

  let evictedCaches = false

  for (let attempt = 0; attempt < PATCH_MAX_ATTEMPTS; attempt++) {
    const current = readConfigFromStorage()
    const next = normalizeWikitabConfig({
      ...current,
      ...partial,
      configRevision: nextWikitabConfigRevision(current.configRevision),
    })

    const guard = readConfigFromStorage()
    if (guard.configRevision !== current.configRevision) continue

    const wrote = writeWikitabConfig(next)
    if (!wrote) {
      if (!evictedCaches) {
        evictWikitabCaches()
        evictedCaches = true
      }
      continue
    }

    const verify = readConfigFromStorage()
    if (storedConfigMatches(next, verify)) {
      return { config: cloneWikitabConfig(next), persisted: true }
    }
  }

  if (import.meta.env.DEV) {
    console.warn('[wikitab] config persist failed: patch exhausted retries', partial)
  }
  return { config: loadWikitabConfig(), persisted: false }
}
