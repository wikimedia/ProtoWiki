import { normalizeLang } from '@/lib/config'

const MICROTASK_BASE = 'https://microtask-generator.toolforge.org'
const USER_AGENT =
  'ProtoWiki/0.1 (https://github.com/wikimedia-research/protowiki) topic-picker'

export class FetchMicrotaskCategorySuggestionsError extends Error {
  constructor(
    message: string,
    public readonly code: 'empty_query' | 'aborted' | 'http',
  ) {
    super(message)
    this.name = 'FetchMicrotaskCategorySuggestionsError'
  }
}

export interface FetchMicrotaskCategorySuggestionsOptions {
  signal?: AbortSignal
  /** Wikipedia language code (default `en`). */
  lang?: string
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new FetchMicrotaskCategorySuggestionsError('Request aborted', 'aborted')
  }
}

type CategorySuggestionsResponse = {
  results?: string[]
}

/**
 * Prefix-match category names from Microtask Generator.
 * @see wiki-signals/references/inference.md §26
 */
export async function fetchMicrotaskCategorySuggestions(
  query: string,
  options: FetchMicrotaskCategorySuggestionsOptions = {},
): Promise<string[]> {
  const trimmed = query.trim()
  if (!trimmed.length) {
    throw new FetchMicrotaskCategorySuggestionsError('Enter a topic', 'empty_query')
  }

  const lang = normalizeLang(options.lang ?? 'en')
  const params = new URLSearchParams({ lang, q: trimmed })
  const url = `${MICROTASK_BASE}/category-suggestions?${params.toString()}`

  assertNotAborted(options.signal)
  const response = await fetch(url, {
    signal: options.signal,
    headers: { 'User-Agent': USER_AGENT },
  })

  if (!response.ok) {
    throw new FetchMicrotaskCategorySuggestionsError(`HTTP ${response.status}`, 'http')
  }

  const data = (await response.json()) as CategorySuggestionsResponse
  return (data.results ?? []).filter((item): item is string => typeof item === 'string')
}
