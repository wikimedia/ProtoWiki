import { articleTitleKey, isEnWikiMainNamespaceArticleTitle } from './wikitabHtml'

export type WikitabSeedArticleVia =
  | 'self'
  | 'hook-link'
  | 'edited-page'
  | 'caption-link'
  | 'quote-author'
  | 'wiktionary-sister'
  | 'search-query'

/**
 * The enwiki article a card (and anything saved from it) contributes to
 * saved-driven modules. Resolved at card fetch time — never at save time.
 */
export interface WikitabSeedArticle {
  title: string
  titleKey: string
  via: WikitabSeedArticleVia
}

const SEED_VIAS = new Set<WikitabSeedArticleVia>([
  'self',
  'hook-link',
  'edited-page',
  'caption-link',
  'quote-author',
  'wiktionary-sister',
  'search-query',
])

/** `undefined` for empty or non-mainspace titles — those never seed. */
export function seedArticle(
  title: string | undefined,
  via: WikitabSeedArticleVia,
): WikitabSeedArticle | undefined {
  const display = title?.trim().replace(/_/g, ' ')
  if (!display || !isEnWikiMainNamespaceArticleTitle(display)) return undefined
  const titleKey = articleTitleKey(display)
  if (!titleKey) return undefined
  return { title: display, titleKey, via }
}

export function parseSeedArticle(raw: unknown): WikitabSeedArticle | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const record = raw as Record<string, unknown>
  const title = typeof record.title === 'string' ? record.title : undefined
  const via = record.via
  if (typeof via !== 'string' || !SEED_VIAS.has(via as WikitabSeedArticleVia)) return undefined
  return seedArticle(title, via as WikitabSeedArticleVia)
}
