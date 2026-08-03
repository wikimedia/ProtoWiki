import { wikimediaApiFetchHeaders, wikiHostFromLang } from '@/config'

const THUMBNAIL_SIZE = 800

export interface ArticleView {
  title: string
  description: string
  thumbnailUrl: string | null
}

/** Fetches the lead image + short description for an article — the "view" for a reading screen's hero. */
export async function fetchArticleView(
  title: string,
  options: { signal?: AbortSignal; lang?: string } = {},
): Promise<ArticleView> {
  const trimmed = title.trim()
  if (!trimmed.length) {
    throw new Error('No article title given.')
  }

  const lang = options.lang ?? 'en'
  const host = wikiHostFromLang(lang)

  const params = new URLSearchParams({
    action: 'query',
    prop: 'pageimages|description',
    titles: trimmed,
    piprop: 'thumbnail',
    pithumbsize: String(THUMBNAIL_SIZE),
    format: 'json',
    formatversion: '2',
    origin: '*',
  })

  const response = await fetch(`https://${host}/w/api.php?${params.toString()}`, {
    signal: options.signal,
    headers: wikimediaApiFetchHeaders('article-view'),
  })

  if (!response.ok) {
    throw new Error(`Failed to load "${trimmed}".`)
  }

  const data = (await response.json()) as {
    query?: {
      pages?: Array<{
        title?: string
        description?: string
        thumbnail?: { source?: string }
        missing?: boolean
      }>
    }
  }

  const page = data.query?.pages?.[0]
  if (!page || page.missing || typeof page.title !== 'string') {
    throw new Error(`"${trimmed}" was not found.`)
  }

  return {
    title: page.title,
    description: page.description ?? '',
    thumbnailUrl: page.thumbnail?.source ?? null,
  }
}
