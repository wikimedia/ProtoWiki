import {
  loadConfig,
  PROTOWIKI_API_PROJECT_URL,
  PROTOWIKI_API_USER_AGENT,
} from '@/config'

import { isExcludedEditOpportunityNeed, resolveEditOpportunityCopy } from './editOpportunityCopy'
import { fetchWithTimeout } from './fetchWithTimeout'
import type { HomeHelpWanted, HomeSavedItem } from './types'

const MICROTASK_QUALITY_CHECK_URL = 'https://microtask-generator.toolforge.org/quality-check'

/** How many saved pages to probe for an edit suggestion. */
const MAX_HELP_WANTED = 2

interface QualityCheckPotentialNeed {
  need?: string
  score?: number
}

interface QualityCheckResult {
  title?: string
  exists?: boolean
  potential_needs?: QualityCheckPotentialNeed[]
}

function microtaskFetchHeaders(): HeadersInit {
  const contact = loadConfig().apiContact.trim() || 'contact unavailable'
  const userAgent = `${PROTOWIKI_API_USER_AGENT} (${PROTOWIKI_API_PROJECT_URL}; ${contact}) musical-group-help-wanted`
  return {
    'Content-Type': 'application/json',
    'User-Agent': userAgent,
  }
}

async function fetchSuggestion(
  item: HomeSavedItem,
  signal?: AbortSignal,
): Promise<HomeHelpWanted | null> {
  if (!item.enwikiTitle) return null

  try {
    const response = await fetchWithTimeout(MICROTASK_QUALITY_CHECK_URL, {
      method: 'POST',
      signal,
      headers: microtaskFetchHeaders(),
      body: JSON.stringify({ lang: 'en', titles: [item.enwikiTitle] }),
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
    return {
      itemId: item.id,
      suggestionLabel: copy.title,
      title: item.title,
      body: copy.body,
      need: top.need,
      thumbnailUrl: item.thumbnailUrl,
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    return null
  }
}

/** 1–2 edit suggestions drawn from the user's saved pages. */
export async function fetchHelpWanted(
  items: HomeSavedItem[],
  signal?: AbortSignal,
): Promise<HomeHelpWanted[]> {
  const candidates = items.filter((item) => item.enwikiTitle).slice(0, MAX_HELP_WANTED)
  const suggestions = await Promise.all(candidates.map((item) => fetchSuggestion(item, signal)))
  return suggestions.filter((entry): entry is HomeHelpWanted => entry !== null)
}
