import { wikimediaApiFetchHeaders } from '@/config'

function extractBody(raw: string): string {
  const match = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  return match ? match[1] : raw
}

/** Full parsed article body via REST `page/html` — the same source `ArticleLive` uses. */
export async function fetchArticleHtml(
  title: string,
  options: { signal?: AbortSignal; host?: string } = {},
): Promise<string> {
  const trimmed = title.trim()
  if (!trimmed.length) return ''

  const host = options.host ?? 'en.wikipedia.org'

  const response = await fetch(
    `https://${host}/api/rest_v1/page/html/${encodeURIComponent(trimmed)}`,
    {
      signal: options.signal,
      headers: {
        Accept: 'text/html; charset=utf-8',
        ...wikimediaApiFetchHeaders('page-html'),
      },
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to load "${trimmed}".`)
  }

  const text = await response.text()
  return extractBody(text)
}
