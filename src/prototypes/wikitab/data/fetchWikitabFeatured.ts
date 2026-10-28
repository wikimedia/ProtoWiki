import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'

import type { FeaturedFeedResponse } from './fetchDailyFeed'
import { getFeaturedPayload } from './fetchDailyFeed'
import { previousUtcDay } from './feedCache'
import { readCachedFeatured, utcDayKey, writeCachedFeatured } from './featuredCache'
import {
  WIKITAB_FEED_CARD_THUMB_WIDTH,
  wikimediaThumbnailAtLeast,
} from './wikimediaThumbnailUrl'
import { fetchWikitabPageSummary } from './fetchWikitabPageSummary'
import { quoteHookHtml } from './wikitabCardPayloadMappers'
import {
  EN_WIKI_HOST,
  articleTitleFromWikiUrl,
  normalizeFeedHtml,
  wikiArticleUrl,
} from './wikitabHtml'
import { seedArticle } from './wikitabSeedArticle'
import { commonsPotdPageUrl, wikipediaPotdPageUrl } from './fetchPictureOfTheDay'
import {
  WIKITAB_FEATURED_SPOTLIGHT_KINDS,
  WIKITAB_FEATURED_USE_PORTRAIT_IMAGE_CARDS,
  type WikitabCardLoading,
  type WikitabFeaturedSpotlight,
  type WikitabFeaturedSpotlightKind,
} from '../sections'

const WIKTIONARY_HOST = 'en.wiktionary.org'
const WIKIQUOTE_HOST = 'en.wikiquote.org'

interface ParseResponse {
  parse?: { text?: string; title?: string }
}

interface SpotlightMeta {
  kind: WikitabFeaturedSpotlightKind
  supportingLabel: string
}

const SPOTLIGHT_META: Record<WikitabFeaturedSpotlightKind, Omit<SpotlightMeta, 'kind'>> = {
  tfa: { supportingLabel: "Today's featured article" },
  tfp: { supportingLabel: "Today's featured picture" },
  potd: { supportingLabel: 'Picture of the day' },
  wotd: { supportingLabel: 'Word of the day' },
  qotd: { supportingLabel: 'Quote of the day' },
  tfl: { supportingLabel: "Today's featured list" },
}

const SPOTLIGHT_CATALOG: readonly SpotlightMeta[] = WIKITAB_FEATURED_SPOTLIGHT_KINDS.map(
  (kind) => ({ kind, ...SPOTLIGHT_META[kind] }),
)

/** Wider thumbs when {@link WIKITAB_FEATURED_USE_PORTRAIT_IMAGE_CARDS} is on. */
const PORTRAIT_SPOTLIGHT_THUMB_WIDTH = 400

function featuredImageThumbWidth(): number {
  return WIKITAB_FEATURED_USE_PORTRAIT_IMAGE_CARDS
    ? PORTRAIT_SPOTLIGHT_THUMB_WIDTH
    : WIKITAB_FEED_CARD_THUMB_WIDTH
}

function metaFor(kind: WikitabFeaturedSpotlightKind): SpotlightMeta {
  return SPOTLIGHT_CATALOG.find((entry) => entry.kind === kind)!
}

function supportingText(meta: SpotlightMeta): string {
  return meta.supportingLabel
}

function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}

function stripQuoteTildes(text: string): string {
  return text.replace(/~/g, '').replace(/\s+/g, ' ').trim()
}

/** Pre-fetch card for a slot — only the static spotlight label is known. */
export function featuredSpotlightShell(kind: WikitabFeaturedSpotlightKind): WikitabFeaturedSpotlight {
  return {
    key: `featured:${kind}`,
    kind,
    supportingText: supportingText(metaFor(kind)),
  }
}

/** Reports one spotlight as soon as its own fetch lands; `loading` names fields still to come. */
export type WikitabFeaturedSpotlightUpdate = (
  spotlight: WikitabFeaturedSpotlight,
  loading: WikitabCardLoading,
) => void

function unavailableSpotlight(meta: SpotlightMeta): WikitabFeaturedSpotlight {
  return {
    key: `featured:${meta.kind}`,
    kind: meta.kind,
    unavailable: true,
    title: 'Unavailable right now',
    supportingText: supportingText(meta),
  }
}

function spotlightDates(day: string): {
  year: number
  monthLong: string
  dayNum: number
  wotdPage: string
  qotdPage: string
  tflPage: string
} {
  const [yearRaw, monthRaw, dayRaw] = day.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const dayNum = Number(dayRaw)
  const date = new Date(Date.UTC(year, month - 1, dayNum))
  const monthLong = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(
    date,
  )
  return {
    year,
    monthLong,
    dayNum,
    wotdPage: `Wiktionary:Word_of_the_day/${year}/${monthLong}_${dayNum}`,
    qotdPage: `Wikiquote:Quote of the day/${monthLong}_${dayNum}`,
    tflPage: `Wikipedia:Today's featured list/${monthLong} ${dayNum}, ${year}`,
  }
}

function parseApiUrl(host: string, page: string): string {
  const params = new URLSearchParams({
    action: 'parse',
    page,
    prop: 'text',
    formatversion: '2',
    format: 'json',
    origin: '*',
  })
  return `https://${host}/w/api.php?${params.toString()}`
}

function normalizeImageUrl(src: string | null | undefined): string | undefined {
  if (!src) return undefined
  const cleaned = src.split('?')[0] ?? src
  if (cleaned.startsWith('//')) return `https:${cleaned}`
  return cleaned
}

function normalizeWikiHtml(html: string, host: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild as HTMLElement | null
  if (!root) return html.trim()

  for (const anchor of Array.from(root.querySelectorAll('a'))) {
    const href = anchor.getAttribute('href') ?? ''
    if (href.startsWith('./')) {
      anchor.setAttribute('href', wikiArticleUrl(host, href.slice(2).replace(/_/g, ' ')))
    } else if (href.startsWith('/wiki/')) {
      anchor.setAttribute('href', `https://${host}${href}`)
    }
    anchor.setAttribute('target', '_blank')
    anchor.setAttribute('rel', 'noreferrer')
  }

  return root.innerHTML.trim()
}

async function fetchParseHtml(
  host: string,
  page: string,
  purpose: string,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const response = await fetchWikimedia(parseApiUrl(host, page), {
      signal,
      headers: wikimediaApiFetchHeaders(purpose),
    })
    if (!response.ok) return null
    const data = (await response.json()) as ParseResponse
    const text = data.parse?.text
    return typeof text === 'string' ? text : null
  } catch {
    return null
  }
}

function mapTfa(payload: FeaturedFeedResponse): WikitabFeaturedSpotlight | null {
  const meta = metaFor('tfa')
  const raw = payload.tfa
  if (!raw || typeof raw.title !== 'string') return null

  const displayTitle = raw.normalizedtitle ?? raw.title.replace(/_/g, ' ')
  const description = raw.description?.trim() || undefined
  const thumbnailUrl = wikimediaThumbnailAtLeast(raw.thumbnail?.source, WIKITAB_FEED_CARD_THUMB_WIDTH)

  return {
    key: 'featured:tfa',
    kind: 'tfa',
    url: wikiArticleUrl(EN_WIKI_HOST, raw.title),
    title: displayTitle,
    description,
    thumbnailUrl: thumbnailUrl ?? undefined,
    supportingText: supportingText(meta),
    seedArticle: seedArticle(displayTitle, 'self'),
  }
}

function findTfpCaptionCell(block: HTMLElement): Element | null {
  const legacyCaptionRow = block.querySelector('tr:nth-child(2) td')
  if (legacyCaptionRow?.querySelector('p, b a')) return legacyCaptionRow

  const firstRow = block.querySelector('tr')
  if (firstRow) {
    for (const cell of firstRow.querySelectorAll('td')) {
      if (cell.closest('.potd-recent')) continue
      if (cell.querySelector('img') && !cell.querySelector('p, b a')) continue
      if (cell.querySelector('p, b a')) return cell
    }
    const cells = firstRow.querySelectorAll('td')
    if (cells.length >= 2) return cells[cells.length - 1]
  }

  return null
}

function findTfpCaptionElement(root: Element): Element | null {
  const captionCell = root instanceof HTMLElement && root.id === 'mp-tfp' ? findTfpCaptionCell(root) : null
  const searchRoot = captionCell ?? root

  for (const paragraph of searchRoot.querySelectorAll('p')) {
    if (paragraph.closest('.potd-recent')) continue
    if (paragraph.querySelector('small')) continue
    if (paragraph.querySelector('b a, a')) return paragraph
  }

  for (const div of searchRoot.querySelectorAll('div')) {
    if (div.closest('.potd-recent, .boilerplate, .noprint, [role="navigation"]')) continue
    if (div.querySelector('img, .mw-file-element')) continue
    if (div.querySelector('b a')) return div
  }

  return null
}

/** Main Page `#mp-tfp` or `Template:POTD/YYYY-MM-DD` — distinct from Wikifeeds `image`. */
function parseTfpHtml(
  html: string,
  day: string,
  rootSelector?: string,
): Omit<WikitabFeaturedSpotlight, 'kind'> | null {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const root =
    (rootSelector ? doc.querySelector(rootSelector) : null) ??
    doc.getElementById('mp-tfp') ??
    doc.querySelector('.mw-parser-output') ??
    doc.body
  if (!root) return null

  const thumb = normalizeImageUrl(root.querySelector('img')?.getAttribute('src'))
  const mainCaption = findTfpCaptionElement(root)
  if (!mainCaption) return null

  const primaryLink = mainCaption.querySelector('b a, a')
  const titleAttr = primaryLink?.getAttribute('title') ?? primaryLink?.textContent?.trim()
  if (!titleAttr) return null

  const captionHtml = normalizeFeedHtml(mainCaption.innerHTML)
  const meta = metaFor('tfp')

  return {
    key: 'featured:tfp',
    url: wikipediaPotdPageUrl(day),
    description: captionHtml,
    thumbnailUrl: wikimediaThumbnailAtLeast(thumb, featuredImageThumbWidth()),
    supportingText: supportingText(meta),
    seedArticle: seedArticle(titleAttr, 'caption-link'),
  }
}

function parseMainPageTfpHtml(
  html: string,
  day: string,
): Omit<WikitabFeaturedSpotlight, 'kind'> | null {
  return parseTfpHtml(html, day, '#mp-tfp')
}

async function resolveTfpSpotlight(
  day: string,
  mainPageHtml: string | null,
  signal?: AbortSignal,
): Promise<WikitabFeaturedSpotlight | null> {
  const meta = metaFor('tfp')

  if (mainPageHtml) {
    const tfp = parseMainPageTfpHtml(mainPageHtml, day)
    if (tfp) {
      return { ...tfp, kind: 'tfp' }
    }
  }

  const tryTemplateForDay = async (templateDay: string): Promise<WikitabFeaturedSpotlight | null> => {
    const html = await fetchParseHtml(
      EN_WIKI_HOST,
      `Template:POTD/${templateDay}`,
      'wikitab-featured-tfp-template',
      signal,
    )
    if (!html) return null
    const tfp = parseTfpHtml(html, templateDay)
    if (!tfp) return null
    return { ...tfp, kind: 'tfp' }
  }

  const todayTemplate = await tryTemplateForDay(day)
  if (todayTemplate) return todayTemplate

  return tryTemplateForDay(previousUtcDay(day))
}

interface ParsedTflBase {
  listTitle: string
  spotlight: Omit<WikitabFeaturedSpotlight, 'kind' | 'description'>
}

function parseTflHtml(html: string): ParsedTflBase | null {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const thumb = doc.querySelector('.thumb img, figure img, .mw-file-element')?.getAttribute('src')
  const blurbP = doc.querySelector('.mw-parser-output > p')
  if (!blurbP) return null

  const primaryLink = blurbP.querySelector('b a, a')
  const titleAttr = primaryLink?.getAttribute('title') ?? primaryLink?.textContent?.trim()
  if (!titleAttr) return null

  const displayTitle = titleAttr.replace(/_/g, ' ')
  const meta = metaFor('tfl')

  return {
    listTitle: titleAttr,
    spotlight: {
      key: 'featured:tfl',
      url: wikiArticleUrl(EN_WIKI_HOST, titleAttr),
      title: displayTitle,
      thumbnailUrl: wikimediaThumbnailAtLeast(normalizeImageUrl(thumb), WIKITAB_FEED_CARD_THUMB_WIDTH),
      supportingText: supportingText(meta),
      seedArticle: seedArticle(displayTitle, 'self'),
    },
  }
}

async function mapTflFromSubpage(
  html: string,
  signal?: AbortSignal,
): Promise<WikitabFeaturedSpotlight | null> {
  const parsed = parseTflHtml(html)
  if (!parsed) return null

  const summary = await fetchWikitabPageSummary(
    parsed.listTitle,
    signal,
    'wikitab-featured-tfl-summary',
  )

  return {
    ...parsed.spotlight,
    description: summary?.description,
    thumbnailUrl: parsed.spotlight.thumbnailUrl ?? summary?.thumbnailUrl,
    kind: 'tfl',
  }
}

function mapPotd(payload: FeaturedFeedResponse, day: string): WikitabFeaturedSpotlight | null {
  const meta = metaFor('potd')
  const image = payload.image
  if (!image) return null

  const thumbnailUrl = wikimediaThumbnailAtLeast(
    image.thumbnail?.source,
    featuredImageThumbWidth(),
  )
  const descriptionHtml =
    typeof image.description?.html === 'string' ? normalizeFeedHtml(image.description.html) : ''

  if (!thumbnailUrl && !descriptionHtml) return null

  return {
    key: 'featured:potd',
    kind: 'potd',
    url: commonsPotdPageUrl(day),
    description: descriptionHtml || undefined,
    thumbnailUrl: thumbnailUrl ?? undefined,
    supportingText: supportingText(meta),
    seedArticle: seedArticle(firstEnWikiLinkTitle(descriptionHtml), 'caption-link'),
  }
}

/** Interwiki-prefixed titles (`de:Foo`) point off enwiki — lowercase prefix, unlike `Star Wars: …`. */
function isInterwikiPrefixedTitle(title: string): boolean {
  return /^[a-z][a-z-]{1,11}:/.test(title)
}

/** Commons captions link out to enwiki as absolute interwiki URLs; bold links win. */
function firstEnWikiLinkTitle(html: string): string | undefined {
  if (!html) return undefined
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const anchors = [
    ...doc.querySelectorAll('b a[href]'),
    ...doc.querySelectorAll('a[href]'),
  ]
  for (const anchor of anchors) {
    const href = anchor.getAttribute('href') ?? ''
    const absolute = href.startsWith('//') ? `https:${href}` : href
    if (!absolute.startsWith(`https://${EN_WIKI_HOST}/wiki/`)) continue
    const title = articleTitleFromWikiUrl(absolute)
    if (title && !isInterwikiPrefixedTitle(title)) return title
  }
  return undefined
}

interface PagePropsResponse {
  query?: { pages?: { pageprops?: { wikibase_item?: string } }[] }
}

interface WikidataSitelinksResponse {
  entities?: Record<string, { sitelinks?: { enwiki?: { title?: string } } }>
}

async function fetchJson<T>(url: string, purpose: string, signal?: AbortSignal): Promise<T | null> {
  const response = await fetchWikimedia(url, { signal, headers: wikimediaApiFetchHeaders(purpose) })
  return response.ok ? ((await response.json()) as T) : null
}

/**
 * Wikiquote page → Wikidata item → enwiki sitelink. Resolved on Wikiquote first
 * because QOTD attributions often link redirects, which `wbgetentities` won't follow.
 */
async function enwikiTitleForWikiquotePage(
  wikiquoteTitle: string,
  signal?: AbortSignal,
): Promise<string | undefined> {
  const pageParams = new URLSearchParams({
    action: 'query',
    titles: wikiquoteTitle,
    redirects: '1',
    prop: 'pageprops',
    ppprop: 'wikibase_item',
    format: 'json',
    formatversion: '2',
    origin: '*',
  })
  try {
    const pageData = await fetchJson<PagePropsResponse>(
      `https://${WIKIQUOTE_HOST}/w/api.php?${pageParams}`,
      'wikitab-featured-qotd-seed',
      signal,
    )
    const itemId = pageData?.query?.pages?.[0]?.pageprops?.wikibase_item
    if (!itemId) return undefined

    const entityParams = new URLSearchParams({
      action: 'wbgetentities',
      ids: itemId,
      props: 'sitelinks',
      sitefilter: 'enwiki',
      format: 'json',
      formatversion: '2',
      origin: '*',
    })
    const entityData = await fetchJson<WikidataSitelinksResponse>(
      `https://www.wikidata.org/w/api.php?${entityParams}`,
      'wikitab-featured-qotd-seed',
      signal,
    )
    return entityData?.entities?.[itemId]?.sitelinks?.enwiki?.title
  } catch {
    return undefined
  }
}

/** The entry's English "Wikipedia has an article on" box (`{{wikipedia}}`), if any. */
function wiktionarySisterWikipediaTitle(html: string): string | undefined {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  for (const anchor of doc.querySelectorAll('.sister-wikipedia b[lang="en"] a[title^="w:"]')) {
    const title = anchor.getAttribute('title')?.slice(2).trim()
    if (!title || isInterwikiPrefixedTitle(title)) continue
    return title.charAt(0).toUpperCase() + title.slice(1)
  }
  return undefined
}

function wotdGlossHtmlFromDescription(descEl: HTMLElement): string | undefined {
  for (const li of descEl.querySelectorAll('li')) {
    if (li.classList.contains('mw-empty-elt')) continue
    const text = li.textContent?.replace(/\s+/g, ' ').trim()
    if (!text) continue
    const glossHtml = normalizeWikiHtml(li.innerHTML.trim(), WIKTIONARY_HOST)
    if (htmlToPlainText(glossHtml).trim()) return glossHtml
  }

  const glossDoc = new DOMParser().parseFromString(
    `<div>${descEl.innerHTML.trim()}</div>`,
    'text/html',
  )
  const root = glossDoc.body.firstElementChild
  if (!root) return undefined

  for (const paragraph of root.querySelectorAll('p')) {
    if (paragraph.querySelector('img[src*="PointingHand"], a[href*="PointingHand"]')) {
      paragraph.remove()
    }
  }

  const glossHtml = normalizeWikiHtml(root.innerHTML.trim(), WIKTIONARY_HOST)
  return htmlToPlainText(glossHtml).trim() ? glossHtml : undefined
}

function parseWotdHtml(html: string): Omit<WikitabFeaturedSpotlight, 'kind'> | null {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const wordEl = doc.getElementById('WOTD-rss-title')
  const word = wordEl?.textContent?.trim()
  if (!word) return null

  const wordLink = doc.querySelector('#WOTD-rss-title')?.closest('a')?.getAttribute('href')
  const titleKey = wordLink?.replace(/^\/wiki\//, '').split('#')[0]?.replace(/_/g, ' ') ?? word

  const descEl = doc.getElementById('WOTD-rss-description')
  const glossHtml = descEl ? wotdGlossHtmlFromDescription(descEl) : undefined

  return {
    key: 'featured:wotd',
    url: wikiArticleUrl(WIKTIONARY_HOST, titleKey),
    title: word,
    description: glossHtml,
    supportingText: supportingText(metaFor('wotd')),
  }
}

function findQotdQuoteCell(doc: Document): Element | null {
  const cquote = doc.querySelector('table.cquote td[valign="top"]')
  if (cquote?.querySelector('p')) return cquote

  const centered = doc.querySelectorAll('.mw-parser-output table td[align="center"]')
  return (
    [...centered].find(
      (cell) => cell.querySelectorAll('p').length >= 1 && cell.textContent?.includes('~'),
    ) ?? null
  )
}

/** The quotee's Wikiquote page — linked in the attribution line after the quote. */
function qotdAuthorWikiquoteTitle(quoteCell: Element): string | undefined {
  const paragraphs = quoteCell.querySelectorAll('p')
  const attribution = paragraphs.length > 1 ? paragraphs[paragraphs.length - 1] : quoteCell
  const links = [
    ...attribution.querySelectorAll('a[href^="/wiki/"]:not([href^="/wiki/File:"])'),
  ]
  const link = links[links.length - 1]
  if (!link) return undefined
  const title = link.getAttribute('title')?.trim()
  if (title) return title
  try {
    return decodeURIComponent((link.getAttribute('href') ?? '').replace(/^\/wiki\//, ''))
      .split('#')[0]
      ?.replace(/_/g, ' ')
  } catch {
    return undefined
  }
}

function parseQotdAuthorPage(html: string): string | undefined {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const quoteCell = findQotdQuoteCell(doc)
  return quoteCell ? qotdAuthorWikiquoteTitle(quoteCell) : undefined
}

function parseQotdHtml(
  html: string,
  qotdPage: string,
): Omit<WikitabFeaturedSpotlight, 'kind'> | null {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const quoteCell = findQotdQuoteCell(doc)
  if (!quoteCell) return null

  const paragraphs = quoteCell.querySelectorAll('p')
  let quoteText = paragraphs[0]?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
  if (!quoteText) {
    const raw = quoteCell.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    quoteText = raw.replace(/\s*~\s*.+\s*~\s*$/, '').trim()
  }
  if (!quoteText) return null

  let personName =
    paragraphs[1]?.textContent?.replace(/\s+/g, ' ').trim() ??
    quoteCell.querySelector('a[href^="/wiki/"]:not([href^="/wiki/File:"])')?.textContent?.trim() ??
    ''
  personName = stripQuoteTildes(personName)

  const href = wikiArticleUrl(WIKIQUOTE_HOST, qotdPage)

  return {
    key: 'featured:qotd',
    url: href,
    title: quoteHookHtml(quoteText),
    description: personName || undefined,
    supportingText: supportingText(metaFor('qotd')),
  }
}

async function fetchSpotlightsForDay(
  day: string,
  signal?: AbortSignal,
  onSpotlight?: WikitabFeaturedSpotlightUpdate,
): Promise<WikitabFeaturedSpotlight[]> {
  const dates = spotlightDates(day)
  const report = (spotlight: WikitabFeaturedSpotlight, loading: WikitabCardLoading = false) => {
    if (!signal?.aborted) onSpotlight?.(spotlight, loading)
  }

  const mapped: Partial<Record<WikitabFeaturedSpotlightKind, WikitabFeaturedSpotlight>> = {}

  const [, mainPageHtml, wotdHtml, qotdHtml, tflHtml] = await Promise.all([
    getFeaturedPayload(day, signal).then((payload) => {
      const tfa = mapTfa(payload)
      if (tfa) {
        mapped.tfa = tfa
        report(tfa)
      }
      const potd = mapPotd(payload, day)
      if (potd) {
        mapped.potd = potd
        report(potd)
      }
      return payload
    }),
    fetchParseHtml(EN_WIKI_HOST, 'Main_Page', 'wikitab-featured-main-page', signal),
    fetchParseHtml(WIKTIONARY_HOST, dates.wotdPage, 'wikitab-featured-wotd', signal).then(
      (html) => {
        const wotd = html ? parseWotdHtml(html) : null
        if (wotd) report({ ...wotd, kind: 'wotd' })
        return html
      },
    ),
    fetchParseHtml(WIKIQUOTE_HOST, dates.qotdPage, 'wikitab-featured-qotd', signal).then(
      (html) => {
        const qotd = html ? parseQotdHtml(html, dates.qotdPage) : null
        if (qotd) report({ ...qotd, kind: 'qotd' })
        return html
      },
    ),
    fetchParseHtml(EN_WIKI_HOST, dates.tflPage, 'wikitab-featured-tfl', signal).then((html) => {
      const parsed = html ? parseTflHtml(html) : null
      if (parsed) report({ ...parsed.spotlight, kind: 'tfl' }, { description: true })
      return html
    }),
  ])

  mapped.tfp = (await resolveTfpSpotlight(day, mainPageHtml, signal)) ?? undefined
  if (mapped.tfp) report(mapped.tfp)

  const wotd = wotdHtml ? parseWotdHtml(wotdHtml) : null
  const qotd = qotdHtml ? parseQotdHtml(qotdHtml, dates.qotdPage) : null
  const wotdEntryTitle = wotd?.url ? articleTitleFromWikiUrl(wotd.url) : undefined
  const qotdAuthorPage = qotd && qotdHtml ? parseQotdAuthorPage(qotdHtml) : undefined

  const [wotdSeedTitle, qotdSeedTitle] = await Promise.all([
    wotdEntryTitle
      ? fetchParseHtml(WIKTIONARY_HOST, wotdEntryTitle, 'wikitab-featured-wotd-seed', signal).then(
          (html) => (html ? wiktionarySisterWikipediaTitle(html) : undefined),
        )
      : undefined,
    qotdAuthorPage ? enwikiTitleForWikiquotePage(qotdAuthorPage, signal) : undefined,
  ])

  if (wotd) {
    mapped.wotd = {
      ...wotd,
      kind: 'wotd',
      seedArticle: seedArticle(wotdSeedTitle, 'wiktionary-sister'),
    }
  }

  if (qotd) {
    mapped.qotd = {
      ...qotd,
      kind: 'qotd',
      seedArticle: seedArticle(qotdSeedTitle, 'quote-author'),
    }
  }

  if (tflHtml) {
    const tfl = await mapTflFromSubpage(tflHtml, signal)
    if (tfl) mapped.tfl = tfl
  }

  if (!mapped.tfl) {
    const yesterday = previousUtcDay(day)
    const fallbackPage = spotlightDates(yesterday).tflPage
    const fallbackHtml = await fetchParseHtml(
      EN_WIKI_HOST,
      fallbackPage,
      'wikitab-featured-tfl-fallback',
      signal,
    )
    const parsed = fallbackHtml ? parseTflHtml(fallbackHtml) : null
    if (fallbackHtml && parsed) {
      report({ ...parsed.spotlight, kind: 'tfl' }, { description: true })
      const tfl = await mapTflFromSubpage(fallbackHtml, signal)
      if (tfl) mapped.tfl = tfl
    }
  }
  if (mapped.tfl) report(mapped.tfl)

  return SPOTLIGHT_CATALOG.map((meta) => mapped[meta.kind] ?? unavailableSpotlight(meta))
}

/** Daily sister-wiki spotlights for the Featured home module. */
export async function fetchWikitabFeatured(
  day: string = utcDayKey(),
  signal?: AbortSignal,
  onSpotlight?: WikitabFeaturedSpotlightUpdate,
): Promise<WikitabFeaturedSpotlight[]> {
  const cached = readCachedFeatured(day)
  if (cached) return cached

  const items = await fetchSpotlightsForDay(day, signal, onSpotlight)
  writeCachedFeatured(day, items)
  return items.map((item) => ({ ...item }))
}
