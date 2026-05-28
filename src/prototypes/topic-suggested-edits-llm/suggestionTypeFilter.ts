import { headingForSuggestionType } from '@/lib/ve-suggestions'
import { CHANGE_SIZE_BY_SUGGESTION_TYPE } from '@/lib/ve-suggestions/veSuggestionDifficulty'

import { findPlanOverrideForTitles, mergePlanOverrides } from './planLayers'

export interface PageFilterLayers {
  inlineFiltersByInputTitle: Record<string, SuggestionTypeFilter>
  mapFiltersByInputTitle: Record<string, SuggestionTypeFilter>
}

/** Suggestion types the VE pipeline can surface (redirect is always excluded). */
export const KNOWN_SUGGESTION_TYPES = Object.keys(CHANGE_SIZE_BY_SUGGESTION_TYPE).filter(
  (type) => type !== 'redirect',
)

export type SuggestionTypeFilter =
  | { mode: 'allow'; types: string[] }
  | { mode: 'block'; types: string[] }

const ALWAYS_EXCLUDED = new Set(['redirect'])

function normalizeTypes(types: string[]): string[] {
  const known = new Set(KNOWN_SUGGESTION_TYPES)
  return [...new Set(types.map((type) => type.trim()).filter((type) => known.has(type)))]
}

export function excludedSuggestionTypes(filter: SuggestionTypeFilter | null): string[] {
  const excluded = new Set<string>(ALWAYS_EXCLUDED)

  if (!filter) {
    return [...excluded]
  }

  if (filter.mode === 'allow') {
    const allowed = new Set(normalizeTypes(filter.types))
    for (const type of KNOWN_SUGGESTION_TYPES) {
      if (!allowed.has(type)) excluded.add(type)
    }
    return [...excluded]
  }

  for (const type of normalizeTypes(filter.types)) {
    excluded.add(type)
  }
  return [...excluded]
}

export function suggestionTypeFilterLabel(filter: SuggestionTypeFilter | null): string | null {
  if (!filter?.types.length) return null

  const labels = normalizeTypes(filter.types).map((type) => headingForSuggestionType(type))
  if (!labels.length) return null

  if (filter.mode === 'allow') {
    return labels.length === 1 ?
        `Only ${labels[0]} suggestions`
      : `Only: ${labels.join(', ')}`
  }

  return labels.length === 1 ?
      `Excluding ${labels[0]} suggestions`
    : `Excluding: ${labels.join(', ')}`
}

export function parseSuggestionTypeFilterFromPlan(
  allowRaw: unknown,
  blockRaw: unknown,
): SuggestionTypeFilter | null {
  const allowTypes =
    Array.isArray(allowRaw) ?
      allowRaw.filter((entry): entry is string => typeof entry === 'string')
    : []
  const blockTypes =
    Array.isArray(blockRaw) ?
      blockRaw.filter((entry): entry is string => typeof entry === 'string')
    : []

  const allow = normalizeTypes(allowTypes)
  const block = normalizeTypes(blockTypes)

  if (allow.length && block.length) return null
  if (allow.length) return { mode: 'allow', types: allow }
  if (block.length) return { mode: 'block', types: block }
  return null
}

/** Returns a page-specific filter when set; otherwise the global filter. */
export function suggestionTypeFilterForPage(
  pageTitle: string,
  globalFilter: SuggestionTypeFilter | null,
  pageFilters: Record<string, SuggestionTypeFilter>,
): SuggestionTypeFilter | null {
  return pageFilters[pageTitle] ?? globalFilter
}

export function excludedSuggestionTypesForPage(
  pageTitle: string,
  globalFilter: SuggestionTypeFilter | null,
  pageFilters: Record<string, SuggestionTypeFilter>,
): string[] {
  return excludedSuggestionTypes(suggestionTypeFilterForPage(pageTitle, globalFilter, pageFilters))
}

/**
 * Map validated titles to explicit per-page filters.
 * Precedence: inline page entry > pageSuggestionTypeFilters map > global at runtime.
 */
export function buildResolvedPageSuggestionTypeFilters(
  layers: PageFilterLayers,
  resolved: Array<{ input: string; title: string }>,
): Record<string, SuggestionTypeFilter> {
  const out: Record<string, SuggestionTypeFilter> = {}

  for (const entry of resolved) {
    const filter = findPlanOverrideForTitles(
      entry.input,
      entry.title,
      layers.inlineFiltersByInputTitle,
      layers.mapFiltersByInputTitle,
    )
    if (filter) out[entry.title] = filter
  }

  return out
}

/** Map LLM input titles to validated Wikipedia titles for per-page filters. */
export function remapPageSuggestionTypeFilters(
  filtersByInputTitle: Record<string, SuggestionTypeFilter>,
  resolved: Array<{ input: string; title: string }>,
): Record<string, SuggestionTypeFilter> {
  return buildResolvedPageSuggestionTypeFilters(
    {
      inlineFiltersByInputTitle: filtersByInputTitle,
      mapFiltersByInputTitle: {},
    },
    resolved,
  )
}

export function countPageSuggestionTypeFilters(layers: PageFilterLayers): number {
  const merged = mergePlanOverrides(
    layers.mapFiltersByInputTitle,
    layers.inlineFiltersByInputTitle,
  )
  return Object.keys(merged).length
}
