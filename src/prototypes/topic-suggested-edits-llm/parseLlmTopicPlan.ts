import { LiftWingQwenChatError, stripThinkingBlocks } from '@/lib/liftWingQwenChat'

import {
  parseSuggestionTypeFilterFromPlan,
  type PageFilterLayers,
  type SuggestionTypeFilter,
} from './suggestionTypeFilter'
import { parsePageMode, type PageMode, type PageModeLayers } from './pageMode'

export interface LlmTopicPlan {
  pages: string[]
  suggestionTypeFilter: SuggestionTypeFilter | null
  /** Default page mode for the plan when a page has no override (default "edit"). */
  defaultPageMode: PageMode
  pageModeLayers: PageModeLayers
  pageFilterLayers: PageFilterLayers
  /** True when both allow and block lists were present globally — global filter ignored. */
  hadConflictingFilters: boolean
}

function normalizePageTitles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []

  return raw
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function hasFilterKeys(record: Record<string, unknown>): boolean {
  return (
    record.allowSuggestionTypes !== undefined ||
    record.allowlist !== undefined ||
    record.blockSuggestionTypes !== undefined ||
    record.blocklist !== undefined
  )
}

function parseOptionalFilterFromRecord(
  record: Record<string, unknown>,
): SuggestionTypeFilter | null | undefined {
  if (!hasFilterKeys(record)) return undefined

  const filter = parseSuggestionTypeFilterFromPlan(
    record.allowSuggestionTypes ?? record.allowlist,
    record.blockSuggestionTypes ?? record.blocklist,
  )
  return filter ?? undefined
}

function parsePageEntry(
  entry: unknown,
): { title: string; filter?: SuggestionTypeFilter; mode?: PageMode } | null {
  if (typeof entry === 'string') {
    const title = entry.trim()
    return title ? { title } : null
  }

  if (!entry || typeof entry !== 'object') return null

  const record = entry as Record<string, unknown>
  const titleRaw =
    typeof record.title === 'string' ? record.title
    : typeof record.page === 'string' ? record.page
    : ''
  const title = titleRaw.trim()
  if (!title) return null

  const filter = parseOptionalFilterFromRecord(record)
  const hasModeOverride = record.mode !== undefined && record.mode !== null
  const mode = hasModeOverride ? parsePageMode(record.mode) : undefined
  return {
    title,
    ...(filter ? { filter } : {}),
    ...(hasModeOverride ? { mode } : {}),
  }
}

function parsePagesField(raw: unknown): {
  pages: string[]
  pageFiltersByInputTitle: Record<string, SuggestionTypeFilter>
  pageModeOverridesByInputTitle: Record<string, PageMode>
} {
  if (!Array.isArray(raw)) {
    return { pages: [], pageFiltersByInputTitle: {}, pageModeOverridesByInputTitle: {} }
  }

  const pages: string[] = []
  const pageFiltersByInputTitle: Record<string, SuggestionTypeFilter> = {}
  const pageModeOverridesByInputTitle: Record<string, PageMode> = {}

  for (const entry of raw) {
    const parsed = parsePageEntry(entry)
    if (!parsed) continue

    pages.push(parsed.title)
    if (parsed.filter) {
      pageFiltersByInputTitle[parsed.title] = parsed.filter
    }
    if (parsed.mode !== undefined) {
      pageModeOverridesByInputTitle[parsed.title] = parsed.mode
    }
  }

  return { pages, pageFiltersByInputTitle, pageModeOverridesByInputTitle }
}

function parsePageSuggestionTypeFiltersMap(
  raw: unknown,
): Record<string, SuggestionTypeFilter> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}

  const out: Record<string, SuggestionTypeFilter> = {}

  for (const [title, value] of Object.entries(raw as Record<string, unknown>)) {
    const trimmedTitle = title.trim()
    if (!trimmedTitle || !value || typeof value !== 'object' || Array.isArray(value)) continue

    const filter = parseOptionalFilterFromRecord(value as Record<string, unknown>)
    if (filter) out[trimmedTitle] = filter
  }

  return out
}

function parsePageModesMap(raw: unknown): Record<string, PageMode> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}

  const out: Record<string, PageMode> = {}

  for (const [title, value] of Object.entries(raw as Record<string, unknown>)) {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) continue

    const mode =
      typeof value === 'string' ? parsePageMode(value)
      : value && typeof value === 'object' && !Array.isArray(value) ?
        parsePageMode((value as Record<string, unknown>).mode)
      : 'edit'

    out[trimmedTitle] = mode
  }

  return out
}

function extractJsonValue(text: string): unknown {
  const cleaned = stripThinkingBlocks(text)
  const objectStart = cleaned.indexOf('{')
  const arrayStart = cleaned.indexOf('[')

  let start = -1
  let end = -1

  if (objectStart !== -1 && (arrayStart === -1 || objectStart < arrayStart)) {
    start = objectStart
    end = cleaned.lastIndexOf('}')
  } else if (arrayStart !== -1) {
    start = arrayStart
    end = cleaned.lastIndexOf(']')
  }

  if (start === -1 || end === -1 || end <= start) {
    throw new LiftWingQwenChatError('Could not find JSON in the model response', 'parse')
  }

  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    throw new LiftWingQwenChatError('Model response was not valid JSON', 'parse')
  }
}

/**
 * Parse the initial LLM topic plan: page titles plus optional suggestion-type filter.
 * Accepts a legacy plain JSON string array (pages only, no filter).
 */
export function parseLlmTopicPlan(text: string): LlmTopicPlan {
  const parsed = extractJsonValue(text)

  if (Array.isArray(parsed)) {
    return {
      pages: normalizePageTitles(parsed),
      suggestionTypeFilter: null,
      defaultPageMode: 'edit',
      pageModeLayers: {
        inlineOverridesByInputTitle: {},
        mapOverridesByInputTitle: {},
      },
      pageFilterLayers: {
        inlineFiltersByInputTitle: {},
        mapFiltersByInputTitle: {},
      },
      hadConflictingFilters: false,
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new LiftWingQwenChatError('Model response was not a JSON object or array', 'parse')
  }

  const record = parsed as Record<string, unknown>
  const {
    pages,
    pageFiltersByInputTitle: inlinePageFilters,
    pageModeOverridesByInputTitle: inlinePageModeOverrides,
  } = parsePagesField(record.pages ?? record.titles)
  const mapPageFilters = parsePageSuggestionTypeFiltersMap(record.pageSuggestionTypeFilters)
  const mapPageModeOverrides = parsePageModesMap(record.pageModes)
  const defaultPageMode =
    record.mode !== undefined && record.mode !== null ?
      parsePageMode(record.mode)
    : 'edit'

  const allowRaw = record.allowSuggestionTypes ?? record.allowlist
  const blockRaw = record.blockSuggestionTypes ?? record.blocklist

  const allowCount =
    Array.isArray(allowRaw) ?
      allowRaw.filter((entry) => typeof entry === 'string' && entry.trim()).length
    : 0
  const blockCount =
    Array.isArray(blockRaw) ?
      blockRaw.filter((entry) => typeof entry === 'string' && entry.trim()).length
    : 0

  return {
    pages,
    suggestionTypeFilter: parseSuggestionTypeFilterFromPlan(allowRaw, blockRaw),
    defaultPageMode,
    pageModeLayers: {
      inlineOverridesByInputTitle: inlinePageModeOverrides,
      mapOverridesByInputTitle: mapPageModeOverrides,
    },
    pageFilterLayers: {
      inlineFiltersByInputTitle: inlinePageFilters,
      mapFiltersByInputTitle: mapPageFilters,
    },
    hadConflictingFilters: allowCount > 0 && blockCount > 0,
  }
}
