import { wikiHostFromLang } from '@/lib/config'

const API_USER_AGENT =
  'ProtoWiki/0.1 (https://github.com/wikimedia-research/protowiki) article-categories'

export class FetchArticleCategoriesError extends Error {
  constructor(
    message: string,
    public readonly code: 'empty_title' | 'page_not_found' | 'aborted' | 'http',
  ) {
    super(message)
    this.name = 'FetchArticleCategoriesError'
  }
}

export interface FetchArticleCategoriesOptions {
  signal?: AbortSignal
  /** Wikipedia language code (default `en`). */
  lang?: string
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new FetchArticleCategoriesError('Request aborted', 'aborted')
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

function stripCategoryPrefix(title: string): string {
  return title.replace(/^Category:/i, '').trim()
}

/**
 * Categories assigned to a Wikipedia article (hidden categories excluded).
 */
export async function fetchArticleCategories(
  pageTitle: string,
  options: FetchArticleCategoriesOptions = {},
): Promise<string[]> {
  const trimmed = pageTitle.trim()
  if (!trimmed.length) {
    throw new FetchArticleCategoriesError('Enter an article title', 'empty_title')
  }

  const wikiHost = wikiHostFromLang(options.lang ?? 'en')

  assertNotAborted(options.signal)
  const response = await fetch(
    actionUrl(wikiHost, {
      action: 'query',
      prop: 'categories',
      titles: trimmed,
      cllimit: 'max',
      clshow: '!hidden',
    }),
    {
      signal: options.signal,
      headers: { 'Api-User-Agent': API_USER_AGENT },
    },
  )

  if (!response.ok) {
    throw new FetchArticleCategoriesError(`HTTP ${response.status}`, 'http')
  }

  const data = (await response.json()) as {
    query?: {
      pages?: Array<{
        title?: string
        missing?: boolean
        categories?: Array<{ title?: string }>
      }>
    }
    error?: { code?: string; info?: string }
  }

  const page = data.query?.pages?.[0]
  if (!page || page.missing) {
    throw new FetchArticleCategoriesError('Article not found', 'page_not_found')
  }

  const categories = (page.categories ?? [])
    .map((category) =>
      typeof category.title === 'string' ? stripCategoryPrefix(category.title) : '',
    )
    .filter(Boolean)

  return [...new Set(categories)].sort((a, b) => a.localeCompare(b))
}
