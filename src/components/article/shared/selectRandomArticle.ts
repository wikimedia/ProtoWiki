import { normalizeLang, wikiHostFromLang, wikimediaApiFetchHeaders } from '@/config'
import { getVitalTitles, VITAL_ARTICLES_LEVEL } from './vitalArticles'

/**
 * *Selects* which article to show — it does **not** fetch the article body.
 * Loading the body stays in **`ArticleLive`** (`page/html`). Selection is
 * `async` because it may need a lightweight, title-only network hop, but it
 * never downloads the full article.
 */

export type RandomArticleSource = 'random' | 'vital'

export interface SelectRandomArticleOptions {
  /** `'random'` = a live random page; `'vital'` = a Wikipedia Vital article. */
  source?: RandomArticleSource
  /** Languages to draw from; one is chosen at random per selection. */
  langs?: string[]
  /** Vital articles level to draw from (only used when `source` is `'vital'`). */
  vitalLevel?: number
}

export interface SelectedArticle {
  /** Wiki page title (spaces, not underscores). */
  title: string
  /** Language code the title belongs to. */
  lang: string
}

export const DEFAULT_RANDOM_LANGS = ['en']
export const DEFAULT_RANDOM_SOURCE: RandomArticleSource = 'random'

function titleFromWikiForm(raw: string): string {
  return raw.replace(/_/g, ' ').trim()
}

/** Pick a random, normalized language code from a list (defaults to `en`). */
export function pickRandomLang(langs?: string[]): string {
  const pool = (langs ?? DEFAULT_RANDOM_LANGS)
    .map((lang) => normalizeLang(lang))
    .filter((lang) => lang.length > 0)
  if (!pool.length) return 'en'
  return pool[Math.floor(Math.random() * pool.length)]
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/** One title-only request to the REST random endpoint for a given language. */
async function selectFromRandomPool(lang: string): Promise<string | null> {
  const host = wikiHostFromLang(lang)
  const url = `https://${host}/api/rest_v1/page/random/title`
  const response = await fetch(url, {
    headers: { Accept: 'application/json', ...wikimediaApiFetchHeaders('page-random') },
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`)
  }
  const data = await response.json()
  const first = Array.isArray(data?.items) ? data.items[0] : null
  const title = first && typeof first.title === 'string' ? first.title : null
  return title ? titleFromWikiForm(title) : null
}

/** Pick a Vital article title locally from the cached list for a language. */
async function selectFromVitalPool(lang: string, level: number): Promise<string | null> {
  const titles = await getVitalTitles(lang, level)
  if (!titles.length) return null
  return titleFromWikiForm(pickRandom(titles))
}

/**
 * Remembers the current selection per `source`+`langs` so component remounts
 * (and HMR while editing) reuse the same article instead of re-selecting.
 * A hard page refresh re-initialises this module, clearing the memo — which is
 * what yields a fresh article on manual refresh. Stashing it on
 * `import.meta.hot.data` keeps it across HMR of this module too.
 */
const selectionCache: Map<string, SelectedArticle> =
  import.meta.hot?.data.selectionCache ?? new Map<string, SelectedArticle>()
if (import.meta.hot) import.meta.hot.data.selectionCache = selectionCache

function selectionCacheKey(source: RandomArticleSource, langs: string[] | undefined, level: number): string {
  return `${source}|${(langs ?? DEFAULT_RANDOM_LANGS).join(',')}|${level}`
}

/**
 * Select an article to display. Chooses a random language from `langs`, then a
 * title from the requested `source`. The `vital` pool falls back to the random
 * pool when a language has no Vital articles list. The result is memoized (see
 * `selectionCache`) so remounts reuse it; a manual page refresh picks anew.
 */
export async function selectRandomArticle(
  options: SelectRandomArticleOptions = {},
): Promise<SelectedArticle> {
  const source = options.source ?? DEFAULT_RANDOM_SOURCE
  const level = options.vitalLevel ?? VITAL_ARTICLES_LEVEL
  const cacheKey = selectionCacheKey(source, options.langs, level)

  const remembered = selectionCache.get(cacheKey)
  if (remembered) return remembered

  const lang = pickRandomLang(options.langs)

  let selected: SelectedArticle | null = null
  if (source === 'vital') {
    const vital = await selectFromVitalPool(lang, level)
    if (vital) selected = { title: vital, lang }
    // else: no Vital articles list for this language — fall back to random.
  }
  if (!selected) {
    const random = await selectFromRandomPool(lang)
    if (random) selected = { title: random, lang }
  }
  if (!selected) {
    throw new Error(`Couldn't select a random article for language "${lang}".`)
  }

  selectionCache.set(cacheKey, selected)
  return selected
}
