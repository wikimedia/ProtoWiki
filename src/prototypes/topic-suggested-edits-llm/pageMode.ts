import { wikiHostFromLang } from '@/lib/config'

import { findPlanOverrideForTitles, mergePlanOverrides } from './planLayers'

export type PageMode = 'edit' | 'read'

export const READING_LIST_HEADING = 'Reading list'

export interface PageModeLayers {
  inlineOverridesByInputTitle: Record<string, PageMode>
  mapOverridesByInputTitle: Record<string, PageMode>
}

export function parsePageMode(raw: unknown): PageMode {
  if (typeof raw !== 'string') return 'edit'
  const normalized = raw.trim().toLowerCase()
  return normalized === 'read' ? 'read' : 'edit'
}

/** Per-page override when set; otherwise the default mode from the LLM plan. */
export function pageModeForPage(
  pageTitle: string,
  defaultMode: PageMode,
  resolvedPageModeOverrides: Record<string, PageMode>,
): PageMode {
  return resolvedPageModeOverrides[pageTitle] ?? defaultMode
}

/**
 * Map validated titles to explicit mode overrides.
 * Precedence: inline page entry > pageModes map > (fallback) global default at runtime.
 */
export function buildResolvedPageModes(
  layers: PageModeLayers,
  resolved: Array<{ input: string; title: string }>,
): Record<string, PageMode> {
  const out: Record<string, PageMode> = {}

  for (const entry of resolved) {
    const mode = findPlanOverrideForTitles(
      entry.input,
      entry.title,
      layers.inlineOverridesByInputTitle,
      layers.mapOverridesByInputTitle,
    )
    if (mode !== undefined) out[entry.title] = mode
  }

  return out
}

/** @deprecated Use buildResolvedPageModes — kept for call-site migration clarity. */
export function remapPageModes(
  modesByInputTitle: Record<string, PageMode>,
  resolved: Array<{ input: string; title: string }>,
): Record<string, PageMode> {
  return buildResolvedPageModes(
    {
      inlineOverridesByInputTitle: modesByInputTitle,
      mapOverridesByInputTitle: {},
    },
    resolved,
  )
}

export function countPageModes(layers: PageModeLayers, mode: PageMode = 'read'): number {
  const merged = mergePlanOverrides(
    layers.mapOverridesByInputTitle,
    layers.inlineOverridesByInputTitle,
  )
  return Object.values(merged).filter((entry) => entry === mode).length
}

export function defaultPageModeLabel(mode: PageMode): string {
  return mode === 'read' ? 'Default: reading list for all pages' : 'Default: edit suggestions'
}

export function wikiArticleUrl(lang: string, pageTitle: string): string {
  const slug = encodeURIComponent(pageTitle.trim().replace(/ /g, '_'))
  return `https://${wikiHostFromLang(lang)}/wiki/${slug}`
}
