import type { MenuItemData } from '@wikimedia/codex'

import { wikimediaApiFetchHeaders, wikiHostFromLang } from '@/config'

import { INTERESTS_TOPIC_CATALOG, type InterestsCatalogTopic } from './interestsFixtures'
import { encodeInterestsSuggestion } from './useInterestsSettings'

const PAGE_SUGGESTION_LIMIT = 5
const STATIC_SUGGESTION_LIMIT = 5
const MERGED_RESULT_LIMIT = 10

class SearchFetchError extends Error {
  constructor(
    message: string,
    public readonly code: 'aborted' | 'http',
  ) {
    super(message)
    this.name = 'SearchFetchError'
  }
}

interface PageSuggestion {
  title: string
  description: string
}

async function fetchPageSuggestions(
  query: string,
  options: { signal?: AbortSignal; lang?: string; limit?: number },
): Promise<PageSuggestion[]> {
  const trimmed = query.trim()
  if (!trimmed.length) return []

  if (options.signal?.aborted) {
    throw new SearchFetchError('Request aborted', 'aborted')
  }

  const wikiHost = wikiHostFromLang(options.lang ?? 'en')
  const limit = options.limit ?? PAGE_SUGGESTION_LIMIT

  const params = new URLSearchParams({
    q: trimmed,
    limit: String(limit),
  })

  const response = await fetch(
    `https://${wikiHost}/w/rest.php/v1/search/title?${params.toString()}`,
    {
      signal: options.signal,
      headers: wikimediaApiFetchHeaders('interests-search'),
    },
  )

  if (!response.ok) {
    throw new SearchFetchError(`HTTP ${response.status}`, 'http')
  }

  const data = (await response.json()) as { pages: { title: string; description?: string }[] }
  return (data.pages ?? []).map((p) => ({
    title: p.title,
    description: p.description ?? '',
  }))
}

function filterCatalogTopics(query: string): InterestsCatalogTopic[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed.length) return []

  return INTERESTS_TOPIC_CATALOG.filter((entry) =>
    entry.label.toLowerCase().includes(trimmed),
  ).slice(0, STATIC_SUGGESTION_LIMIT)
}

function scoreMatch(label: string, query: string): number {
  const l = label.toLowerCase()
  const q = query.toLowerCase()
  if (l === q) return 100
  if (l.startsWith(q)) return 90 - Math.min(l.length - q.length, 20)
  if (l.split(/\s+/).some((w) => w.startsWith(q))) return 60
  if (l.includes(q)) return 30
  return 0
}

export async function buildInterestsSuggestions(
  query: string,
  options: { signal?: AbortSignal; lang?: string } = {},
): Promise<MenuItemData[]> {
  const trimmed = query.trim()
  if (!trimmed.length) return []

  type ScoredItem = MenuItemData & { _score: number }
  const scored: ScoredItem[] = []

  const topics = filterCatalogTopics(trimmed)
  for (const topic of topics) {
    scored.push({
      value: encodeInterestsSuggestion('topic', { topicId: topic.id }),
      label: topic.label,
      supportingText: 'Topic',
      description: topic.categoryLabel,
      _score: scoreMatch(topic.label, trimmed),
    })
  }

  try {
    const pages = await fetchPageSuggestions(trimmed, {
      signal: options.signal,
      lang: options.lang,
      limit: PAGE_SUGGESTION_LIMIT,
    })

    pages.forEach((page, index) => {
      scored.push({
        value: encodeInterestsSuggestion('page', { pageTitle: page.title }),
        label: page.title,
        supportingText: 'Page',
        description: page.description || undefined,
        _score: scoreMatch(page.title, trimmed) || (PAGE_SUGGESTION_LIMIT - index),
      })
    })
  } catch (err) {
    if (
      (err as Error).name === 'AbortError' ||
      (err instanceof SearchFetchError && err.code === 'aborted')
    ) {
      // return whatever static results we have so far
    }
  }

  scored.sort((a, b) => b._score - a._score)

  return scored.slice(0, MERGED_RESULT_LIMIT).map(({ _score: _, ...item }) => item)
}
