import { wikimediaApiFetchHeaders } from '@/config'

import { EN_WIKI_HOST, normalizeEnwikiTitle } from './enwikiTitle'
import { fetchWithTimeout } from './fetchWithTimeout'

export interface FetchWikitaArticleOptions {
  signal?: AbortSignal
}

const articleHtmlCache = new Map<string, string>()
const inFlightFetches = new Map<string, Promise<string>>()

function extractParserOutput(raw: string): string {
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) return bodyMatch[1]
  return raw
}

function cacheKey(title: string): string {
  return normalizeEnwikiTitle(title).toLowerCase()
}

export async function fetchWikitaArticleHtml(
  title: string,
  options: FetchWikitaArticleOptions = {},
): Promise<string> {
  const normalized = normalizeEnwikiTitle(title)
  if (!normalized) {
    throw new Error('Missing article title')
  }

  const key = cacheKey(normalized)
  const cached = articleHtmlCache.get(key)
  if (cached) return cached

  let bodyPromise = inFlightFetches.get(key)
  if (!bodyPromise) {
    bodyPromise = (async () => {
      const slug = encodeURIComponent(normalized.replace(/ /g, '_'))
      const url = `https://${EN_WIKI_HOST}/api/rest_v1/page/html/${slug}`
      const response = await fetchWithTimeout(url, {
        signal: options.signal,
        headers: {
          Accept: 'text/html; charset=utf-8',
          ...wikimediaApiFetchHeaders('musical-group-article-html'),
        },
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const text = await response.text()
      const html = extractParserOutput(text)
      articleHtmlCache.set(key, html)
      return html
    })().finally(() => {
      inFlightFetches.delete(key)
    })
    inFlightFetches.set(key, bodyPromise)
  }

  return bodyPromise
}
