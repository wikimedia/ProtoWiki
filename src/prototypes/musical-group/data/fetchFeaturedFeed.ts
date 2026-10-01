import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'
import { mapWithConcurrency } from '@/lib/mapWithConcurrency'

import { utcDayKey, utcDayParts } from './cacheKeys'
import { contentWikiHost, enwikiArticleUrl } from './enwikiTitle'
import { fetchEnwikiFeaturedFeedDay, wikimediaFeedErrorMessage } from './fetchEnwikiFeaturedFeedDay'
import {
  getCachedFeaturedTab,
  setCachedFeaturedTab,
} from './homeTabCache'
import { fetchPageSummary, type PageSummary } from './pageSummary'
import type { HomeBornOnThisDay, HomeDidYouKnow, HomeFeatured, HomeFeaturedTab } from './types'
import { normalizeQid } from './wikidataApi'
import {
  fetchFeaturedTitleFromWikitext,
  fetchMainPageFeatured,
  fetchMainPageHooks,
} from './fetchMainPageSection'
import { wikiCapabilities } from './wikiCapabilities'
import { getContentLang, isDefaultContentLang } from '@/lib/contentLang'
import { mintTranslate } from '@/lib/mint'

const MAX_DYK = 12
const MAX_BIRTHS = 5
const SUMMARY_CONCURRENCY = 3

/** Feed pages are full page summaries (on-this-day); DYK entries carry none. */
type FeedPage = PageSummary

interface FeedTfa {
  title?: string
  normalizedtitle?: string
  description?: string
  extract?: string
  thumbnail?: { source?: string }
  content_urls?: { desktop?: { page?: string } }
  wikibase_item?: string
}

interface FeedDyk {
  text?: string
  html?: string
  pages?: FeedPage[]
}

interface FeedBirth {
  text?: string
  year?: number
  pages?: FeedPage[]
}

interface FeaturedFeedResponse {
  tfa?: FeedTfa
  dyk?: FeedDyk[]
}

interface BirthsFeedResponse {
  births?: FeedBirth[]
}

let sessionCached: { day: string; value: HomeFeaturedTab } | null = null

function parseTfa(tfa: FeedTfa | undefined): HomeFeatured | undefined {
  if (!tfa?.title) return undefined

  const enwikiTitle = (tfa.normalizedtitle ?? tfa.title).replace(/_/g, ' ')
  return {
    title: enwikiTitle,
    enwikiTitle,
    description: tfa.description ?? tfa.extract ?? '',
    thumbnailUrl: tfa.thumbnail?.source,
    articleUrl: tfa.content_urls?.desktop?.page ?? enwikiArticleUrl(enwikiTitle),
    itemId: normalizeQid(tfa.wikibase_item) ?? undefined,
  }
}

/** A feed-embedded summary is as good as a fetched one when it has the card fields. */
function isCompleteFeedSummary(page: FeedPage | undefined): page is FeedPage {
  return Boolean(page?.title && page.content_urls?.desktop?.page)
}

async function pageCardFields(
  enwikiTitle: string,
  signal?: AbortSignal,
  embedded?: FeedPage,
): Promise<{
  title: string
  description?: string
  thumbnailUrl?: string
  articleUrl: string
  itemId?: string
}> {
  const summary = isCompleteFeedSummary(embedded)
    ? embedded
    : await fetchPageSummary(enwikiTitle, signal, 'musical-group-featured-feed')
  const title = (summary?.normalizedtitle ?? summary?.title ?? enwikiTitle).replace(/_/g, ' ')
  const description = summary?.description?.trim()
  return {
    title,
    description: description || undefined,
    thumbnailUrl: summary?.thumbnail?.source,
    articleUrl: summary?.content_urls?.desktop?.page ?? enwikiArticleUrl(enwikiTitle),
    itemId: normalizeQid(summary?.wikibase_item) ?? undefined,
  }
}

function extractDykEmphasis(html: string): string | undefined {
  const match = html.match(/<b[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i)
  if (!match) return undefined

  return match[1]
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitTextEmphasis(
  text: string,
  emphasis: string,
): { before: string; match: string; after: string } | null {
  const pattern = emphasis
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '[\\u00a0 ]+')
  const match = text.match(new RegExp(pattern))
  if (!match?.index && match?.index !== 0) return null

  return {
    before: text.slice(0, match.index),
    match: match[0],
    after: text.slice(match.index + match[0].length),
  }
}

function resolveDykEmphasis(text: string, html?: string): string | undefined {
  if (!html) return undefined
  const emphasis = extractDykEmphasis(html)
  if (!emphasis || !splitTextEmphasis(text, emphasis)) return undefined
  return emphasis
}

function dykPrimaryPageTitle(item: FeedDyk): string | undefined {
  const fromPages = item.pages?.[0]?.title
  if (fromPages) return fromPages

  const html = item.html
  if (!html) return undefined

  const match = html.match(/href="(?:https:\/\/en\.wikipedia\.org\/wiki\/|\.\/)([^"?#]+)"/i)
  if (!match) return undefined

  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

async function parseDidYouKnow(
  items: FeedDyk[] | undefined,
  signal?: AbortSignal,
): Promise<HomeDidYouKnow[]> {
  if (!items?.length) return []

  const slice = items.slice(0, MAX_DYK)

  const results = await mapWithConcurrency(
    slice,
    SUMMARY_CONCURRENCY,
    async (item) => {
      const text = item.text?.trim()
      if (!text) return null

      const emphasis = resolveDykEmphasis(text, item.html)
      const pageTitle = dykPrimaryPageTitle(item)
      if (!pageTitle) {
        return {
          text,
          ...(emphasis ? { emphasis } : {}),
        } satisfies HomeDidYouKnow
      }

      const fields = await pageCardFields(pageTitle, signal)
      return {
        text,
        ...(emphasis ? { emphasis } : {}),
        enwikiTitle: pageTitle.replace(/_/g, ' '),
        title: fields.title,
        thumbnailUrl: fields.thumbnailUrl,
        articleUrl: fields.articleUrl,
        itemId: fields.itemId,
      } satisfies HomeDidYouKnow
    },
    signal,
  )

  return results.filter((entry): entry is HomeDidYouKnow => entry !== null)
}

async function parseBornOnThisDay(
  items: FeedBirth[] | undefined,
  signal?: AbortSignal,
): Promise<HomeBornOnThisDay[]> {
  if (!items?.length) return []

  const slice = items
    .slice(0, MAX_BIRTHS)
    .filter((item) => item.pages?.[0]?.title && item.text?.trim() && item.year != null)

  return mapWithConcurrency(
    slice,
    SUMMARY_CONCURRENCY,
    async (item) => {
      const page = item.pages![0]
      const pageTitle = page.title!
      const fields = await pageCardFields(pageTitle, signal, page)
      return {
        year: item.year!,
        text: item.text!.trim(),
        title: fields.title,
        description: fields.description,
        enwikiTitle: pageTitle.replace(/_/g, ' '),
        thumbnailUrl: fields.thumbnailUrl,
        articleUrl: fields.articleUrl,
        itemId: fields.itemId,
      } satisfies HomeBornOnThisDay
    },
    signal,
  )
}

export function isUsableFeaturedTab(tab: HomeFeaturedTab): boolean {
  return Boolean(tab.article) || tab.didYouKnow.length > 0 || tab.bornOnThisDay.length > 0
}

export function clearFeaturedTabSessionCache(): void {
  sessionCached = null
}

/** Today's featured tab: article of the day, Did you know, and Born on this day. */
export async function fetchFeaturedTabContent(signal?: AbortSignal): Promise<HomeFeaturedTab> {
  const dayKey = utcDayKey()

  const stored = getCachedFeaturedTab(dayKey)
  if (stored && isUsableFeaturedTab(stored)) {
    sessionCached = { day: dayKey, value: stored }
    return stored
  }

  if (sessionCached && sessionCached.day === dayKey && isUsableFeaturedTab(sessionCached.value)) {
    return sessionCached.value
  }

  const { mm, dd } = utcDayParts()
  const birthsUrl = `https://${contentWikiHost()}/api/rest_v1/feed/onthisday/births/${mm}/${dd}`

  const [{ ok: featuredOk, json: featuredJson, status: featuredStatus }, birthsResponse] =
    await Promise.all([
      fetchEnwikiFeaturedFeedDay(signal, 'musical-group-featured-feed'),
      fetchWikimedia(birthsUrl, {
        signal,
        headers: wikimediaApiFetchHeaders('musical-group-born-on-this-day'),
      }),
    ])

  if (!featuredOk) {
    throw new Error(wikimediaFeedErrorMessage(featuredStatus, 'featured'))
  }

  const featured = (featuredJson ?? {}) as FeaturedFeedResponse
  const birthsJson = birthsResponse.ok
    ? ((await birthsResponse.json()) as BirthsFeedResponse)
    : {}

  const [article, didYouKnow, bornOnThisDay] = await Promise.all([
    resolveFeaturedArticle(featured.tfa, signal),
    resolveDidYouKnow(featured.dyk, signal),
    parseBornOnThisDay(birthsJson.births, signal),
  ])

  const value: HomeFeaturedTab = { article, didYouKnow, bornOnThisDay }

  sessionCached = { day: dayKey, value }
  if (isUsableFeaturedTab(value)) {
    setCachedFeaturedTab(dayKey, value)
  }
  return value
}

/*
 * Wikis without `tfa` / `dyk` in the feed: the community's own main-page
 * picks first, then (where enabled) English Wikipedia's, machine-translated.
 */

async function resolveFeaturedArticle(
  tfa: FeedTfa | undefined,
  signal?: AbortSignal,
): Promise<HomeFeatured | undefined> {
  const fromFeed = parseTfa(tfa)
  if (fromFeed || isDefaultContentLang()) return fromFeed

  const { featuredPage, featuredTitleSource, mintFallback } = wikiCapabilities()
  const native = featuredTitleSource
    ? await fetchFeaturedTitleFromWikitext(
        featuredTitleSource.wikitext,
        featuredTitleSource.param,
        signal,
      )
        .then((title) => (title ? { title, extract: '' } : undefined))
        .catch(() => undefined)
    : featuredPage
      ? await fetchMainPageFeatured(featuredPage, signal).catch(() => undefined)
      : undefined
  if (native) {
    const fields = await pageCardFields(native.title, signal)
    return {
      title: fields.title,
      enwikiTitle: native.title,
      description: fields.description ?? native.extract,
      thumbnailUrl: fields.thumbnailUrl,
      articleUrl: fields.articleUrl,
      itemId: fields.itemId,
    }
  }

  return mintFallback ? translatedEnglishFeatured(signal) : undefined
}

async function resolveDidYouKnow(
  items: FeedDyk[] | undefined,
  signal?: AbortSignal,
): Promise<HomeDidYouKnow[]> {
  if (items?.length || isDefaultContentLang()) return parseDidYouKnow(items, signal)

  const { didYouKnowPage, mintFallback } = wikiCapabilities()
  if (didYouKnowPage) {
    const hooks = await fetchMainPageHooks(didYouKnowPage, signal).catch(() => [])
    if (hooks.length) {
      const results = await mapWithConcurrency(
        hooks.slice(0, MAX_DYK),
        SUMMARY_CONCURRENCY,
        async (hook): Promise<HomeDidYouKnow> => {
          if (!hook.title) return { text: hook.text, ...(hook.emphasis ? { emphasis: hook.emphasis } : {}) }
          const fields = await pageCardFields(hook.title, signal)
          return {
            text: hook.text,
            ...(hook.emphasis ? { emphasis: hook.emphasis } : {}),
            enwikiTitle: hook.title,
            title: fields.title,
            thumbnailUrl: fields.thumbnailUrl,
            articleUrl: fields.articleUrl,
            itemId: fields.itemId,
          }
        },
        signal,
      )
      return results
    }
  }

  return mintFallback ? translatedEnglishDidYouKnow(signal) : []
}

const ENGLISH_WIKI_HOST = 'en.wikipedia.org'

async function fetchEnglishFeaturedFeed(signal?: AbortSignal): Promise<FeaturedFeedResponse | null> {
  const { yyyy, mm, dd } = utcDayParts()
  const response = await fetchWikimedia(
    `https://${ENGLISH_WIKI_HOST}/api/rest_v1/feed/featured/${yyyy}/${mm}/${dd}`,
    { signal, headers: wikimediaApiFetchHeaders('wikita-lite-mint-source-feed') },
  ).catch(() => null)
  if (!response?.ok) return null
  return (await response.json()) as FeaturedFeedResponse
}

/** English title → content-wiki title, via enwiki langlinks. Missing = no local article. */
async function localTitlesFor(
  englishTitles: string[],
  signal?: AbortSignal,
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  const unique = [...new Set(englishTitles.filter(Boolean))]
  if (!unique.length) return result

  const params = new URLSearchParams({
    action: 'query',
    prop: 'langlinks',
    lllang: getContentLang(),
    titles: unique.join('|'),
    redirects: '1',
    formatversion: '2',
    format: 'json',
    origin: '*',
  })
  const response = await fetchWikimedia(`https://${ENGLISH_WIKI_HOST}/w/api.php?${params}`, {
    signal,
    headers: wikimediaApiFetchHeaders('wikita-lite-mint-langlinks'),
  }).catch(() => null)
  if (!response?.ok) return result

  const json = (await response.json()) as {
    query?: {
      normalized?: { from: string; to: string }[]
      redirects?: { from: string; to: string }[]
      pages?: { title: string; langlinks?: { title: string }[] }[]
    }
  }
  const byEnglish = new Map<string, string>()
  for (const page of json.query?.pages ?? []) {
    const local = page.langlinks?.[0]?.title
    if (local) byEnglish.set(page.title, local)
  }
  const resolve = (title: string) => {
    let current = title
    for (const step of [...(json.query?.normalized ?? []), ...(json.query?.redirects ?? [])]) {
      if (step.from === current) current = step.to
    }
    return byEnglish.get(current)
  }
  for (const title of unique) {
    const local = resolve(title)
    if (local) result.set(title, local)
  }
  return result
}

async function translatedEnglishFeatured(signal?: AbortSignal): Promise<HomeFeatured | undefined> {
  const english = parseTfa((await fetchEnglishFeaturedFeed(signal))?.tfa)
  if (!english) return undefined

  // A local article beats a translation of the English one.
  const local = (await localTitlesFor([english.enwikiTitle], signal)).get(english.enwikiTitle)
  if (local) {
    const fields = await pageCardFields(local, signal)
    return {
      title: fields.title,
      enwikiTitle: local,
      description: fields.description ?? '',
      thumbnailUrl: fields.thumbnailUrl,
      articleUrl: fields.articleUrl,
      itemId: fields.itemId ?? english.itemId,
    }
  }

  const description = await mintTranslate({
    from: 'en',
    to: getContentLang(),
    content: english.description,
    signal,
  })
  return { ...english, ...(description ? { description, machineTranslated: true } : {}) }
}

async function translatedEnglishDidYouKnow(signal?: AbortSignal): Promise<HomeDidYouKnow[]> {
  const items = (await fetchEnglishFeaturedFeed(signal))?.dyk?.slice(0, MAX_DYK) ?? []
  const subjects = items.map((item) => dykPrimaryPageTitle(item)?.replace(/_/g, ' ') ?? '')
  const localTitles = await localTitlesFor(subjects, signal)
  const to = getContentLang()

  const results = await mapWithConcurrency(
    items.map((item, index) => ({ item, subject: subjects[index] })),
    SUMMARY_CONCURRENCY,
    async ({ item, subject }): Promise<HomeDidYouKnow | null> => {
      // "... that X" reads as a fragment once translated; send the claim alone.
      const source = item.text?.trim().replace(/^(?:\.\.\.|…)\s*(?:that\s+)?/i, '')
      if (!source) return null
      const text = await mintTranslate({ from: 'en', to, content: source, signal })
      if (!text) return null

      const local = localTitles.get(subject)
      const fields = local ? await pageCardFields(local, signal) : undefined
      return {
        text,
        machineTranslated: true,
        ...(fields
          ? {
              enwikiTitle: local,
              title: fields.title,
              thumbnailUrl: fields.thumbnailUrl,
              articleUrl: fields.articleUrl,
              itemId: fields.itemId,
            }
          : {}),
      }
    },
    signal,
  )
  return results.filter((entry): entry is HomeDidYouKnow => entry !== null)
}

/** Today's featured article only — convenience wrapper. */
export async function fetchFeaturedArticle(signal?: AbortSignal): Promise<HomeFeatured | undefined> {
  return (await fetchFeaturedTabContent(signal)).article
}
