import { wikimediaApiFetchHeaders } from '@/config'

import { contentWikiHost, getContentLang } from '@/lib/contentLang'
import { fetchWikimedia } from '@/lib/fetchWikimedia'
import { normalizeQid } from './wikidataApi'

/** Content wiki host — follows `?lang=` (see `@/lib/contentLang`), English by default. */
export { contentWikiHost }

const EN_WIKI_PREFIXES = ['File:', 'Category:', 'Help:', 'Wikipedia:', 'Template:', 'Portal:']

/** Local namespace names (hrefs use these); canonical English ones always apply too. */
const LOCAL_NAMESPACE_PREFIXES: Record<string, string[]> = {
  fr: ['Fichier:', 'Catégorie:', 'Aide:', 'Wikipédia:', 'Modèle:', 'Portail:', 'Spécial:', 'Projet:'],
}

function nonArticlePrefixes(): string[] {
  return [...EN_WIKI_PREFIXES, ...(LOCAL_NAMESPACE_PREFIXES[getContentLang()] ?? [])]
}

export function wikiActionUrl(params: Record<string, string>): string {
  const search = new URLSearchParams({
    ...params,
    format: 'json',
    origin: '*',
  })
  return `https://${contentWikiHost()}/w/api.php?${search.toString()}`
}

export function normalizeEnwikiTitle(title: string): string {
  return title.trim().replace(/_/g, ' ').replace(/\s+/g, ' ')
}

export function enwikiArticleUrl(title: string): string {
  const slug = encodeURIComponent(title.replace(/ /g, '_'))
  return `https://${contentWikiHost()}/wiki/${slug}`
}

export function resolveExternalUrl(href: string): string {
  if (href.startsWith('//')) return `https:${href}`
  return href
}

/** True for off-wiki http(s) and protocol-relative URLs. */
export function isExternalHref(href: string): boolean {
  if (!href || href.startsWith('#') || href.startsWith('./') || href.startsWith('/wiki/')) {
    return false
  }

  if (href.startsWith('//')) return true

  if (!/^https?:\/\//i.test(href)) return false

  try {
    const host = new URL(href).hostname
    const wikiHost = contentWikiHost()
    return host !== wikiHost && host !== `www.${wikiHost}`
  } catch {
    return true
  }
}

export function enwikiTitlesMatch(a: string, b: string): boolean {
  return normalizeEnwikiTitle(a).toLowerCase() === normalizeEnwikiTitle(b).toLowerCase()
}

export function parseEnwikiArticleLink(href: string): {
  title: string | null
  fragment: string | null
} {
  if (!href) return { title: null, fragment: null }

  if (href.startsWith('#')) {
    return {
      title: null,
      fragment: decodeURIComponent(href.slice(1)),
    }
  }

  const hashIndex = href.indexOf('#')
  const fragment =
    hashIndex >= 0 ? decodeURIComponent(href.slice(hashIndex + 1)) : null
  const path = hashIndex >= 0 ? href.slice(0, hashIndex) : href

  return {
    title: parseEnwikiArticleTitle(path),
    fragment,
  }
}

/**
 * Parse an enwiki article title from a Parsoid / wiki anchor href, or null if not
 * a main-namespace article link.
 */
export function parseEnwikiArticleTitle(href: string): string | null {
  if (!href || href.startsWith('#')) return null

  let path = href
  if (/^https?:\/\//i.test(href)) {
    try {
      const url = new URL(href)
      const wikiHost = contentWikiHost()
      if (url.hostname !== wikiHost && url.hostname !== `www.${wikiHost}`) return null
      path = url.pathname
    } catch {
      return null
    }
  }

  let titlePart = ''
  if (path.startsWith('./')) {
    titlePart = decodeURIComponent(path.slice(2))
  } else {
    const wikiMatch = path.match(/\/wiki\/(.+)$/)
    if (!wikiMatch) return null
    titlePart = decodeURIComponent(wikiMatch[1])
  }

  titlePart = titlePart.replace(/_/g, ' ')
  const hashIndex = titlePart.indexOf('#')
  if (hashIndex >= 0) titlePart = titlePart.slice(0, hashIndex)

  const normalized = normalizeEnwikiTitle(titlePart)
  if (!normalized) return null

  for (const prefix of nonArticlePrefixes()) {
    if (normalized.startsWith(prefix)) return null
  }

  return normalized
}

/** Title → Wikidata id for this session; a page's item doesn't change under us. */
const wikibaseItemIdCache = new Map<string, string | undefined>()

export async function fetchWikibaseItemId(
  title: string,
  signal?: AbortSignal,
): Promise<string | undefined> {
  const cacheKey = normalizeEnwikiTitle(title)
  if (wikibaseItemIdCache.has(cacheKey)) return wikibaseItemIdCache.get(cacheKey)

  const url = wikiActionUrl({
    action: 'query',
    prop: 'pageprops',
    ppprop: 'wikibase_item',
    titles: title,
  })

  const response = await fetchWikimedia(url, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-wikibase-item'),
  })
  if (!response.ok) return undefined

  const json = (await response.json()) as {
    query?: { pages?: Record<string, { pageprops?: { wikibase_item?: string } }> }
  }
  const page = Object.values(json.query?.pages ?? {})[0]
  const itemId = normalizeQid(page?.pageprops?.wikibase_item) ?? undefined
  wikibaseItemIdCache.set(cacheKey, itemId)
  return itemId
}

export async function fetchWikibaseItemIds(
  titles: string[],
  signal?: AbortSignal,
): Promise<Map<string, string | undefined>> {
  const result = new Map<string, string | undefined>()
  const unique = [...new Set(titles.map(normalizeEnwikiTitle).filter(Boolean))]
  if (!unique.length) return result

  const url = wikiActionUrl({
    action: 'query',
    prop: 'pageprops',
    ppprop: 'wikibase_item',
    titles: unique.join('|'),
  })

  const response = await fetchWikimedia(url, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-wikibase-item-batch'),
  })
  if (!response.ok) {
    for (const title of unique) result.set(title, undefined)
    return result
  }

  const json = (await response.json()) as {
    query?: {
      pages?: Record<string, { title?: string; pageprops?: { wikibase_item?: string } }>
    }
  }

  for (const page of Object.values(json.query?.pages ?? {})) {
    const pageTitle = page.title ? normalizeEnwikiTitle(page.title) : undefined
    if (!pageTitle) continue
    result.set(pageTitle, normalizeQid(page.pageprops?.wikibase_item) ?? undefined)
  }

  for (const title of unique) {
    if (!result.has(title)) result.set(title, undefined)
  }

  return result
}
