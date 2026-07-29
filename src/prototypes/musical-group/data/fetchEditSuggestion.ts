import {
  loadConfig,
  PROTOWIKI_API_PROJECT_URL,
  PROTOWIKI_API_USER_AGENT,
} from '@/config'
import { mapWithConcurrency } from '@/lib/mapWithConcurrency'

import { normalizeEnwikiTitle } from './enwikiTitle'
import { isExcludedEditOpportunityNeed, resolveEditOpportunityCopy } from './editOpportunityCopy'
import { fetchWithTimeout } from './fetchWithTimeout'
import { fetchPageSummary } from './pageSummary'
import type { HomeHelpWanted, HomeSavedItem } from './types'

const MICROTASK_QUALITY_CHECK_URL = 'https://microtask-generator.toolforge.org/quality-check'
const SAVED_SUGGESTION_CONCURRENCY = 3

interface QualityCheckPotentialNeed {
  need?: string
  score?: number
}

interface QualityCheckResult {
  title?: string
  exists?: boolean
  potential_needs?: QualityCheckPotentialNeed[]
}

export interface EditSuggestionPage {
  itemId?: string
  title: string
  enwikiTitle: string
  description?: string
  thumbnailUrl?: string
}

function stableSuggestionItemId(itemId: string | undefined, enwikiTitle: string): string {
  if (itemId) return itemId
  return `enwiki:${normalizeEnwikiTitle(enwikiTitle).toLowerCase()}`
}

function microtaskFetchHeaders(userAgentSuffix: string): HeadersInit {
  const contact = loadConfig().apiContact.trim() || 'contact unavailable'
  const userAgent = `${PROTOWIKI_API_USER_AGENT} (${PROTOWIKI_API_PROJECT_URL}; ${contact}) ${userAgentSuffix}`
  return {
    'Content-Type': 'application/json',
    'User-Agent': userAgent,
  }
}

export async function fetchEditSuggestionForPage(
  page: EditSuggestionPage,
  relatedToTitle: string,
  signal?: AbortSignal,
  userAgentSuffix = 'musical-group-edit-suggestion',
): Promise<HomeHelpWanted | null> {
  try {
    const response = await fetchWithTimeout(MICROTASK_QUALITY_CHECK_URL, {
      method: 'POST',
      signal,
      headers: microtaskFetchHeaders(userAgentSuffix),
      body: JSON.stringify({ lang: 'en', titles: [page.enwikiTitle] }),
    })
    if (!response.ok) return null

    const json = (await response.json()) as { results?: QualityCheckResult[] }
    const result = json.results?.[0]
    if (!result?.exists) return null

    const needs = (result.potential_needs ?? [])
      .filter((entry): entry is { need: string; score: number } => {
        return typeof entry.need === 'string' && typeof entry.score === 'number'
      })
      .sort((a, b) => b.score - a.score)

    const top = needs.find((entry) => !isExcludedEditOpportunityNeed(entry.need))
    if (!top) return null

    const copy = resolveEditOpportunityCopy(top.need)

    let description = page.description?.trim() ?? ''
    if (!description) {
      const summary = await fetchPageSummary(page.enwikiTitle, signal, userAgentSuffix)
      description = summary?.description?.trim() ?? ''
    }

    return {
      itemId: stableSuggestionItemId(page.itemId, page.enwikiTitle),
      suggestionLabel: copy.title,
      title: page.title,
      description: description || undefined,
      body: copy.body,
      need: top.need,
      enwikiTitle: page.enwikiTitle,
      thumbnailUrl: page.thumbnailUrl,
      relatedToTitle,
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    return null
  }
}

export async function fetchEditSuggestionForSavedItem(
  item: HomeSavedItem,
  signal?: AbortSignal,
  userAgentSuffix = 'musical-group-edit-suggestion',
): Promise<HomeHelpWanted | null> {
  if (!item.enwikiTitle) return null

  return fetchEditSuggestionForPage(
    {
      itemId: item.id,
      title: item.title,
      enwikiTitle: item.enwikiTitle,
      description: item.description,
      thumbnailUrl: item.thumbnailUrl,
    },
    item.title,
    signal,
    userAgentSuffix,
  )
}

/** Quality-check every saved page that has an enwiki article. */
export async function fetchAllSavedSuggestions(
  items: HomeSavedItem[],
  signal?: AbortSignal,
  options?: { onEach?: (suggestion: HomeHelpWanted) => void },
): Promise<HomeHelpWanted[]> {
  const candidates = items.filter((item) => item.enwikiTitle)
  const results = await mapWithConcurrency(
    candidates,
    SAVED_SUGGESTION_CONCURRENCY,
    async (item) => {
      const suggestion = await fetchEditSuggestionForSavedItem(
        item,
        signal,
        'musical-group-contribute-saved',
      )
      if (suggestion) options?.onEach?.(suggestion)
      return suggestion
    },
    signal,
  )
  return results.filter((entry): entry is HomeHelpWanted => entry !== null)
}
