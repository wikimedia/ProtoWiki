import { wikiHostFromLang } from '@/lib/config'

const API_USER_AGENT =
  'ProtoWiki/0.1 (https://github.com/wikimedia-research/protowiki) article-categories'

const DEFAULT_LIMIT = 10

export class FetchCategoryMemberTitlesError extends Error {
  constructor(
    message: string,
    public readonly code: 'empty_category' | 'aborted' | 'http',
  ) {
    super(message)
    this.name = 'FetchCategoryMemberTitlesError'
  }
}

export interface FetchCategoryMemberTitlesOptions {
  signal?: AbortSignal
  /** Wikipedia language code (default `en`). */
  lang?: string
  /** Max article titles to return (default 10, max 50). */
  limit?: number
  /** Exclude this article title from results (case-insensitive). */
  excludeTitle?: string
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new FetchCategoryMemberTitlesError('Request aborted', 'aborted')
  }
}

function actionUrl(wikiHost: string, params: Record<string, string>): string {
  const search = new URLSearchParams({
    ...params,
    format: 'json',
    formatversion: '2',
    origin: '*',
  })
  return `https://${wikiHost}/w/api.php?${search.toString()}`
}

function normalizeTitleKey(title: string): string {
  return title.trim().replace(/_/g, ' ').toLowerCase()
}

function categoryTitle(category: string): string {
  const trimmed = category.trim()
  if (!trimmed.length) return ''
  return trimmed.startsWith('Category:') ? trimmed : `Category:${trimmed.replace(/ /g, '_')}`
}

/**
 * Article titles in a Wikipedia category (namespace 0 only).
 */
export async function fetchCategoryMemberTitles(
  category: string,
  options: FetchCategoryMemberTitlesOptions = {},
): Promise<string[]> {
  const cmtitle = categoryTitle(category)
  if (!cmtitle.length) {
    throw new FetchCategoryMemberTitlesError('Category is required', 'empty_category')
  }

  const wikiHost = wikiHostFromLang(options.lang ?? 'en')
  const limit = Math.max(1, Math.min(options.limit ?? DEFAULT_LIMIT, 50))
  const excludeKey = options.excludeTitle?.trim()
    ? normalizeTitleKey(options.excludeTitle)
    : null

  assertNotAborted(options.signal)
  const response = await fetch(
    actionUrl(wikiHost, {
      action: 'query',
      list: 'categorymembers',
      cmtitle,
      cmnamespace: '0',
      cmlimit: String(limit),
    }),
    {
      signal: options.signal,
      headers: { 'Api-User-Agent': API_USER_AGENT },
    },
  )

  if (!response.ok) {
    throw new FetchCategoryMemberTitlesError(`HTTP ${response.status}`, 'http')
  }

  const data = (await response.json()) as {
    query?: {
      categorymembers?: Array<{ ns?: number; title?: string }>
    }
  }

  const titles: string[] = []
  const seen = new Set<string>()

  for (const member of data.query?.categorymembers ?? []) {
    if (member.ns !== 0) continue
    const title = typeof member.title === 'string' ? member.title.trim() : ''
    if (!title.length) continue

    const key = normalizeTitleKey(title)
    if (excludeKey && key === excludeKey) continue
    if (seen.has(key)) continue

    seen.add(key)
    titles.push(title)
  }

  return titles
}
