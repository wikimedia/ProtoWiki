import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'

import { parseEnwikiArticleTitle, wikiActionUrl } from './enwikiTitle'

/**
 * Featured content curated on a wiki's main page, for wikis whose REST
 * featured feed has no `tfa` / `dyk` (see `wikiCapabilities.ts`). Parses the
 * rendered subpage rather than wikitext so local templates don't matter.
 */

export interface MainPageFeatured {
  title: string
  /** First paragraph as plain text, the card's fallback description. */
  extract: string
}

export interface MainPageHook {
  text: string
  /** The bold, linked hook subject. */
  emphasis?: string
  /** Article the hook is about (the bold link's target). */
  title?: string
}

async function fetchParsedBody(page: string, signal?: AbortSignal): Promise<HTMLElement | null> {
  if (typeof DOMParser === 'undefined') return null

  const url = wikiActionUrl({
    action: 'parse',
    page,
    prop: 'text',
    formatversion: '2',
    disableeditsection: '1',
    redirects: '1',
  })
  const response = await fetchWikimedia(url, {
    signal,
    headers: wikimediaApiFetchHeaders('wikita-lite-main-page-section'),
  })
  if (!response.ok) return null

  const json = (await response.json()) as { parse?: { text?: string } }
  const html = json.parse?.text
  if (!html) return null

  const body = new DOMParser().parseFromString(html, 'text/html').body
  // Bot notices ("Ne modifiez pas cette page…"), images and their captions.
  body.querySelectorAll('.bandeau-container, .metadata, figure, .mw-empty-elt').forEach((el) => el.remove())
  return body
}

/** `<a title="…">` holds the normalized page title; skip red links and other namespaces. */
function articleTitleFromLink(link: Element | null | undefined): string | undefined {
  if (!link || link.classList.contains('new')) return undefined
  const parsed = parseEnwikiArticleTitle(link.getAttribute('href') ?? '')
  if (!parsed) return undefined
  return link.getAttribute('title')?.trim() || parsed
}

function cleanText(text: string | null | undefined): string {
  return (text ?? '')
    .replace(/\((?:photo|image|illustration)\)/gi, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,)])/g, '$1')
    .trim()
}

export async function fetchMainPageFeatured(
  page: string,
  signal?: AbortSignal,
): Promise<MainPageFeatured | undefined> {
  const body = await fetchParsedBody(page, signal)
  if (!body) return undefined

  for (const paragraph of body.querySelectorAll('p')) {
    const title = articleTitleFromLink(paragraph.querySelector('b a, a b')?.closest('a'))
    if (!title) continue
    return { title, extract: cleanText(paragraph.textContent) }
  }
  return undefined
}

/** Featured title from a template parameter (`| título = …`) in expanded wikitext. */
export async function fetchFeaturedTitleFromWikitext(
  wikitext: string,
  param: string,
  signal?: AbortSignal,
): Promise<string | undefined> {
  const url = wikiActionUrl({
    action: 'expandtemplates',
    text: wikitext,
    prop: 'wikitext',
    formatversion: '2',
  })
  const response = await fetchWikimedia(url, {
    signal,
    headers: wikimediaApiFetchHeaders('wikita-lite-main-page-section'),
  })
  if (!response.ok) return undefined

  const json = (await response.json()) as { expandtemplates?: { wikitext?: string } }
  // msgnw escapes the source as HTML entities.
  const source = new DOMParser().parseFromString(json.expandtemplates?.wikitext ?? '', 'text/html')
    .documentElement.textContent ?? ''
  const escaped = param.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = source.match(new RegExp(`\\|\\s*${escaped}\\s*=\\s*([^\\n|}]+)`))
  return match?.[1].trim() || undefined
}

export async function fetchMainPageHooks(
  page: string,
  signal?: AbortSignal,
): Promise<MainPageHook[]> {
  const body = await fetchParsedBody(page, signal)
  if (!body) return []

  const hooks: MainPageHook[] = []
  for (const item of body.querySelectorAll('li')) {
    const text = cleanText(item.textContent)
    if (!text) continue
    const boldLink = item.querySelector('b a, a b')?.closest('a')
    const emphasis = cleanText(boldLink?.textContent) || undefined
    hooks.push({
      text,
      ...(emphasis && text.includes(emphasis) ? { emphasis } : {}),
      title: articleTitleFromLink(boldLink),
    })
  }
  return hooks
}
