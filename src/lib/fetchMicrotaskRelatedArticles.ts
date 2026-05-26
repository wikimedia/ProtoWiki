import { normalizeLang } from '@/lib/config'

const MICROTASK_BASE = 'https://microtask-generator.toolforge.org'
const USER_AGENT =
  'ProtoWiki/0.1 (https://github.com/wikimedia-research/protowiki) topic-picker'

const DEFAULT_LIMIT = 10

export class FetchMicrotaskRelatedArticlesError extends Error {
  constructor(
    message: string,
    public readonly code: 'empty_category' | 'aborted' | 'http',
  ) {
    super(message)
    this.name = 'FetchMicrotaskRelatedArticlesError'
  }
}

export interface FetchMicrotaskRelatedArticlesOptions {
  signal?: AbortSignal
  /** Wikipedia language code (default `en`). */
  lang?: string
  /** Max titles per category (default 10). */
  limit?: number
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new FetchMicrotaskRelatedArticlesError('Request aborted', 'aborted')
  }
}

type RelatedArticlesResponse = {
  results?: string[]
}

/**
 * Article titles related to a category from Microtask Generator.
 * @see wiki-signals/references/inference.md §25
 */
export async function fetchMicrotaskRelatedArticles(
  category: string,
  options: FetchMicrotaskRelatedArticlesOptions = {},
): Promise<string[]> {
  const trimmed = category.trim()
  if (!trimmed.length) {
    throw new FetchMicrotaskRelatedArticlesError('Category is required', 'empty_category')
  }

  const lang = normalizeLang(options.lang ?? 'en')
  const limit = Math.max(1, Math.min(options.limit ?? DEFAULT_LIMIT, 50))

  assertNotAborted(options.signal)
  const response = await fetch(`${MICROTASK_BASE}/related-articles`, {
    method: 'POST',
    signal: options.signal,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify({ lang, category: trimmed, limit }),
  })

  if (!response.ok) {
    throw new FetchMicrotaskRelatedArticlesError(`HTTP ${response.status}`, 'http')
  }

  const data = (await response.json()) as RelatedArticlesResponse
  return (data.results ?? []).filter((item): item is string => typeof item === 'string')
}
