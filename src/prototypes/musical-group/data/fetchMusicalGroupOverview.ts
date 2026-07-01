import { loadConfig, PROTOWIKI_API_PROJECT_URL, PROTOWIKI_API_USER_AGENT, wikimediaApiFetchHeaders } from '@/config'

import { EN_WIKI_HOST, fetchWikibaseItemId, wikiActionUrl } from './enwikiTitle'
import { isExcludedEditOpportunityNeed, resolveEditOpportunityCopy } from './editOpportunityCopy'
import { fetchWithTimeout } from './fetchWithTimeout'
import type {
  MusicalGroupData,
  MusicalGroupInfobox,
  MusicalGroupInfoboxRow,
  MusicalGroupInfoboxValue,
  MusicalGroupOverviewData,
  MusicalGroupOverviewEditOpportunity,
  MusicalGroupOverviewRelated,
  MusicalGroupOverviewSnippet,
} from './types'

const MICROTASK_QUALITY_CHECK_URL = 'https://microtask-generator.toolforge.org/quality-check'

export interface FetchMusicalGroupOverviewOptions {
  signal?: AbortSignal
}

interface PageSummaryResponse {
  title?: string
  description?: string
  extract_html?: string
  thumbnail?: { source?: string }
  timestamp?: string
  content_urls?: { desktop?: { page?: string } }
}

interface SearchHit {
  title?: string
  wordcount?: number
  snippet?: string
}

interface QualityCheckPotentialNeed {
  need?: string
  score?: number
}

interface QualityCheckResult {
  title?: string
  exists?: boolean
  potential_needs?: QualityCheckPotentialNeed[]
}

function microtaskFetchHeaders(): HeadersInit {
  const contact = loadConfig().apiContact.trim() || 'contact unavailable'
  const userAgent = `${PROTOWIKI_API_USER_AGENT} (${PROTOWIKI_API_PROJECT_URL}; ${contact}) musical-group-quality-check`
  return {
    'Content-Type': 'application/json',
    'User-Agent': userAgent,
  }
}

async function fetchEditOpportunity(
  title: string,
  signal?: AbortSignal,
): Promise<MusicalGroupOverviewEditOpportunity | undefined> {
  try {
    const response = await fetchWithTimeout(MICROTASK_QUALITY_CHECK_URL, {
      method: 'POST',
      signal,
      headers: microtaskFetchHeaders(),
      body: JSON.stringify({ lang: 'en', titles: [title] }),
    })
    if (!response.ok) return undefined

    const json = (await response.json()) as { results?: QualityCheckResult[] }
    const result = json.results?.[0]
    if (!result?.exists) return undefined

    const needs = (result.potential_needs ?? [])
      .filter((item): item is { need: string; score: number } => {
        return typeof item.need === 'string' && typeof item.score === 'number'
      })
      .sort((a, b) => b.score - a.score)

    const top = needs.find((item) => !isExcludedEditOpportunityNeed(item.need))
    if (!top) return undefined

    const copy = resolveEditOpportunityCopy(top.need)
    return {
      title: copy.title,
      body: copy.body,
      need: top.need,
      score: top.score,
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    return undefined
  }
}

function normalizeTitle(title: string): string {
  return title.replace(/ /g, '_').toLowerCase()
}

function parseMediaWikiTimestamp(timestamp: string): Date {
  const trimmed = timestamp.trim()
  if (!trimmed.length) return new Date(Number.NaN)
  if (trimmed.includes('T')) {
    return new Date(trimmed.endsWith('Z') ? trimmed : `${trimmed}Z`)
  }
  return new Date(trimmed.replace(' ', 'T') + 'Z')
}

function toPageviewDateParam(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

function yesterdayPageviewDate(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return toPageviewDateParam(d)
}

function pageviewsArticleSlug(title: string): string {
  return encodeURIComponent(title.replace(/ /g, '_'))
}

function formatRelativeTime(isoTimestamp: string): string {
  const then = parseMediaWikiTimestamp(isoTimestamp).getTime()
  if (Number.isNaN(then)) return '—'
  const diffMs = Date.now() - then
  if (diffMs < 0) return 'just now'

  const minutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'just now'
  if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months === 1) return '1 month ago'
  return `${months} months ago`
}

function formatViewCount(total: number): string {
  if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1)}M`
  if (total >= 1000) return `${(total / 1000).toFixed(1)}k`
  return total.toLocaleString()
}

function startOfIsoWeekUtc(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d
}

function deadLinkExtractHtml(html: string): string {
  return html
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '<span class="overview-extract__link">$1</span>')
    .replace(/<\/?b>/gi, '')
    .replace(/<\/?strong>/gi, '')
}

async function fetchPageSummary(title: string, signal?: AbortSignal): Promise<PageSummaryResponse | null> {
  const slug = encodeURIComponent(title.replace(/ /g, '_'))
  const response = await fetchWithTimeout(`https://${EN_WIKI_HOST}/api/rest_v1/page/summary/${slug}`, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-page-summary'),
  })
  if (!response.ok) return null
  return (await response.json()) as PageSummaryResponse
}

async function fetchMorelikeHits(
  seedTitle: string,
  signal?: AbortSignal,
  limit = 5,
): Promise<SearchHit[]> {
  const url = wikiActionUrl({
    action: 'query',
    list: 'search',
    srsearch: `morelike:${seedTitle}`,
    srwhat: 'text',
    srnamespace: '0',
    srlimit: String(limit),
  })

  const response = await fetchWithTimeout(url, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-morelike'),
  })
  if (!response.ok) return []

  const json = (await response.json()) as { query?: { search?: SearchHit[] } }
  return json.query?.search ?? []
}

async function fetchMorelikeRelated(
  seedTitle: string,
  relatedToTitle: string,
  signal?: AbortSignal,
): Promise<MusicalGroupOverviewRelated | undefined> {
  const hits = await fetchMorelikeHits(seedTitle, signal)
  const normalizedSeed = normalizeTitle(seedTitle)
  const hit = hits.find((candidate) => {
    const title = candidate.title
    return title && normalizeTitle(title) !== normalizedSeed
  })
  if (!hit?.title) return undefined

  const relatedTitle = hit.title
  const [summary, views, wikibaseId] = await Promise.all([
    fetchPageSummary(relatedTitle, signal),
    resolvePageviewsLabel(relatedTitle, signal),
    fetchWikibaseItemId(relatedTitle, signal),
  ])
  const timestamp = summary?.timestamp ?? ''
  const relative = timestamp ? formatRelativeTime(timestamp) : '—'

  // Any article with a Wikidata item opens inside Wikita — the item view renders a
  // sparse entity (label, description, Commons images) when it isn't a performer or place.
  return {
    id: wikibaseId,
    title: summary?.title ?? relatedTitle,
    description: summary?.description ?? '',
    thumbnailUrl: summary?.thumbnail?.source,
    articleUrl:
      summary?.content_urls?.desktop?.page ??
      `https://${EN_WIKI_HOST}/wiki/${pageviewsArticleSlug(relatedTitle)}`,
    lastEditedTimestamp: timestamp,
    lastEditedLabel: timestamp ? `Updated ${relative}` : 'Updated —',
    viewCount: views.total,
    viewsLabel: views.label,
    relatedToTitle,
  }
}

async function fetchSnippetHits(
  seedTitle: string,
  signal?: AbortSignal,
): Promise<SearchHit[]> {
  const url = wikiActionUrl({
    action: 'query',
    list: 'search',
    // Exact-phrase search finds pages that mention the item by name, and returns
    // a highlighted snippet of where the mention occurs.
    srsearch: `"${seedTitle}"`,
    srwhat: 'text',
    srnamespace: '0',
    srprop: 'snippet',
    srlimit: '50',
  })

  const response = await fetchWithTimeout(url, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-snippet'),
  })
  if (!response.ok) return []

  const json = (await response.json()) as { query?: { search?: SearchHit[] } }
  return json.query?.search ?? []
}

/**
 * Structural / index pages that technically contain the phrase but aren't a
 * meaningful "mention" of the item (lists, discographies, year-in-x, etc.).
 */
function isLowValueMentionTitle(title: string): boolean {
  return (
    /^Main Page$/i.test(title) ||
    /^(List|Index|Outline|Timeline|Glossary|Comparison|Bibliography) of\b/i.test(title) ||
    /\bdiscography\b/i.test(title) ||
    /\(disambiguation\)$/i.test(title) ||
    /^\d{3,4} in\b/i.test(title)
  )
}

/**
 * Tidy a search snippet for display:
 * - Merge adjacent `searchmatch` highlights separated only by spaces so a
 *   multi-word match reads as one continuous highlight ("Wet Leg", not
 *   "[Wet] [Leg]").
 * - Replace hard line breaks (fragment boundaries in the source text) with an
 *   ellipsis so the snippet doesn't read as one run-on sentence.
 * - Prefix a leading ellipsis when the snippet begins mid-text, so it reads as a
 *   continuation and matches the trailing ellipsis.
 */
function formatSnippetHtml(html: string): string {
  const formatted = html
    .replace(/<\/span>([^\S\r\n]+)<span class="searchmatch">/g, '$1')
    .replace(/\s*[\r\n]+\s*/g, ' … ')
    .trim()
  if (!formatted) return formatted
  return /^\s*(…|\.\.\.)/.test(formatted) ? formatted : `… ${formatted}`
}

/**
 * Find an article that mentions the item and return it as a Snippet card.
 *
 * Candidates come from a `morelike` query (the same topically-related pool the
 * Related card draws from), and we pick the highest-ranked related article that
 * actually mentions the item by name — showing the highlighted mention snippet.
 * Falls back to the top plain phrase-search mention when no related page mentions
 * it. Excludes the item's own page (`ownTitle`).
 */
async function fetchSnippetMention(
  searchTerm: string,
  ownTitle: string,
  signal?: AbortSignal,
): Promise<MusicalGroupOverviewSnippet | undefined> {
  const [morelikeHits, mentionHits] = await Promise.all([
    fetchMorelikeHits(ownTitle, signal, 15),
    fetchSnippetHits(searchTerm, signal),
  ])

  const normalizedOwn = normalizeTitle(ownTitle)

  // Which pages actually mention the item, and the snippet of that mention.
  const snippetByTitle = new Map<string, string>()
  for (const candidate of mentionHits) {
    if (candidate.title && candidate.snippet) {
      snippetByTitle.set(normalizeTitle(candidate.title), candidate.snippet)
    }
  }

  const usable = (title: string | undefined): title is string =>
    Boolean(title) &&
    normalizeTitle(title as string) !== normalizedOwn &&
    !isLowValueMentionTitle(title as string)

  let mentionTitle: string | undefined
  let snippet: string | undefined

  // Prefer a topically-related (morelike) page that mentions the item.
  for (const candidate of morelikeHits) {
    if (!usable(candidate.title)) continue
    const related = snippetByTitle.get(normalizeTitle(candidate.title))
    if (!related) continue
    mentionTitle = candidate.title
    snippet = related
    break
  }

  // Fall back to the strongest plain mention if no related page mentions it.
  if (!mentionTitle) {
    const hit = mentionHits.find(
      (candidate) => usable(candidate.title) && Boolean(candidate.snippet),
    )
    mentionTitle = hit?.title
    snippet = hit?.snippet
  }

  if (!mentionTitle || !snippet) return undefined

  const [summary, wikibaseId] = await Promise.all([
    fetchPageSummary(mentionTitle, signal),
    fetchWikibaseItemId(mentionTitle, signal),
  ])

  return {
    id: wikibaseId,
    title: summary?.title ?? mentionTitle,
    snippetHtml: formatSnippetHtml(snippet),
    thumbnailUrl: summary?.thumbnail?.source,
    articleUrl:
      summary?.content_urls?.desktop?.page ??
      `https://${EN_WIKI_HOST}/wiki/${pageviewsArticleSlug(mentionTitle)}`,
  }
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function cleanInfoboxCell(scope: Element): void {
  scope
    .querySelectorAll('style, sup.reference, .mw-editsection, .mw-valign-text-top')
    .forEach((node) => node.remove())
  scope.querySelectorAll('.ib-settlement-fn sup:not(.reference)').forEach((node) => node.remove())
}

function cellLabel(cell: Element): string {
  const clone = cell.cloneNode(true) as Element
  cleanInfoboxCell(clone)
  return normalizeInfoboxLabel(collapseWhitespace(clone.textContent ?? ''))
}

function normalizeInfoboxLabel(label: string): string {
  return label.replace(/\s*:\s*$/, '').trim()
}

function consolidateInfoboxRows(rows: MusicalGroupInfoboxRow[]): MusicalGroupInfoboxRow[] {
  const consolidated: MusicalGroupInfoboxRow[] = []

  for (const row of rows) {
    const label = normalizeInfoboxLabel(row.label)
    if (!label) continue

    const normalized = { ...row, label }

    if (row.variant === 'header') {
      consolidated.push(normalized)
      continue
    }

    const previous = consolidated[consolidated.length - 1]
    if (previous && previous.variant !== 'header' && previous.label === label) {
      previous.values.push(...row.values)
      continue
    }

    consolidated.push(normalized)
  }

  return consolidated
}

function splitOnBreaks(cell: Element): Element[] {
  if (!cell.querySelector('br')) return [cell]

  const segments: Element[] = []
  let bucket = cell.ownerDocument!.createElement('span')

  for (const node of Array.from(cell.childNodes)) {
    if (node.nodeName === 'BR') {
      if (collapseWhitespace(bucket.textContent ?? '')) segments.push(bucket)
      bucket = cell.ownerDocument!.createElement('span')
      continue
    }
    bucket.appendChild(node.cloneNode(true))
  }

  if (collapseWhitespace(bucket.textContent ?? '')) segments.push(bucket)
  return segments.length ? segments : [cell]
}

function externalHref(scope: Element): string | undefined {
  const anchors = Array.from(scope.querySelectorAll('a'))
  for (const anchor of anchors) {
    const href = anchor.getAttribute('href') ?? ''
    if (!href) continue
    if (anchor.classList.contains('external') || /^https?:\/\//i.test(href)) {
      return href.startsWith('//') ? `https:${href}` : href
    }
  }
  return undefined
}

function toValue(scope: Element): MusicalGroupInfoboxValue | null {
  const text = collapseWhitespace(scope.textContent ?? '')
  if (!text) return null
  const href = externalHref(scope)
  return href ? { text, href } : { text }
}

function cellValues(cell: Element): MusicalGroupInfoboxValue[] {
  const clone = cell.cloneNode(true) as Element
  cleanInfoboxCell(clone)

  const listItems = Array.from(clone.querySelectorAll('li'))
  if (listItems.length) {
    return listItems
      .map((item) => toValue(item))
      .filter((value): value is MusicalGroupInfoboxValue => value !== null)
  }

  const segments = splitOnBreaks(clone)
  if (segments.length > 1) {
    return segments
      .map((segment) => toValue(segment))
      .filter((value): value is MusicalGroupInfoboxValue => value !== null)
  }

  const single = toValue(clone)
  return single ? [single] : []
}

function directRowCells(row: Element): { ths: Element[]; tds: Element[] } {
  return {
    ths: Array.from(row.children).filter((cell) => cell.tagName === 'TH'),
    tds: Array.from(row.children).filter((cell) => cell.tagName === 'TD'),
  }
}

function hasColspanTwo(cell: Element): boolean {
  return cell.getAttribute('colspan') === '2'
}

function isIndentedValueDiv(element: Element): boolean {
  return (element.getAttribute('style') ?? '').includes('padding-left')
}

function colspanTwoCell(row: Element): Element | undefined {
  const { ths, tds } = directRowCells(row)
  if (ths.length !== 0 || tds.length !== 1 || !hasColspanTwo(tds[0])) return undefined
  return tds[0]
}

function isColspanTwoDataRow(row: Element): boolean {
  const cell = colspanTwoCell(row)
  if (!cell) return false
  if (Array.from(cell.querySelectorAll('div')).some(isIndentedValueDiv)) return false

  const values = cellValues(cell)
  return values.length > 0
}

function parseStackedColspanRow(cell: Element): MusicalGroupInfoboxRow | undefined {
  const valueDivs = Array.from(cell.querySelectorAll('div')).filter(isIndentedValueDiv)
  if (!valueDivs.length) return undefined

  const values = valueDivs.flatMap((valueDiv) => cellValues(valueDiv))
  if (!values.length) return undefined

  const labelCell = cell.cloneNode(true) as Element
  labelCell.querySelectorAll('div').forEach((div) => {
    if (isIndentedValueDiv(div)) div.remove()
  })

  const label = cellLabel(labelCell)
  if (!label) return undefined

  return { label, values }
}

function parseStandardInfoboxRows(infobox: Element): MusicalGroupInfoboxRow[] {
  const rows: MusicalGroupInfoboxRow[] = []

  for (const row of Array.from(infobox.querySelectorAll('tr'))) {
    const labelCell = row.querySelector('.infobox-label')
    const dataCell = row.querySelector('.infobox-data')
    if (!labelCell || !dataCell) continue

    const label = cellLabel(labelCell)
    if (!label) continue

    const values = cellValues(dataCell)
    if (!values.length) continue

    rows.push({ label, values })
  }

  return rows
}

function parseLegacyInfoboxRows(infobox: Element): MusicalGroupInfoboxRow[] {
  const tableRows = Array.from(infobox.querySelectorAll('tr'))
  const rows: MusicalGroupInfoboxRow[] = []

  for (let index = 0; index < tableRows.length; index++) {
    const row = tableRows[index]
    const { ths, tds } = directRowCells(row)

    if (ths.length === 1 && tds.length === 0 && hasColspanTwo(ths[0])) {
      const label = cellLabel(ths[0])
      if (!label) continue

      const nextRow = tableRows[index + 1]
      if (nextRow && isColspanTwoDataRow(nextRow)) {
        const cell = colspanTwoCell(nextRow)
        const values = cell ? cellValues(cell) : []
        if (values.length) rows.push({ label, values })
        index++
        continue
      }

      rows.push({ label, values: [], variant: 'header' })
      continue
    }

    if (tds.length === 1 && hasColspanTwo(tds[0])) {
      const stacked = parseStackedColspanRow(tds[0])
      if (stacked) rows.push(stacked)
      continue
    }

    if (tds.length === 2 && ths.length === 0) {
      const label = cellLabel(tds[0])
      const values = cellValues(tds[1])
      if (!label || !values.length) continue

      rows.push({ label, values })
    }
  }

  return rows
}

async function fetchInfobox(title: string, signal?: AbortSignal): Promise<MusicalGroupInfobox | undefined> {
  const url = wikiActionUrl({
    action: 'parse',
    page: title,
    prop: 'text',
    section: '0',
    disablelimitreport: '1',
    disableeditsection: '1',
  })

  const response = await fetchWithTimeout(url, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-infobox'),
  })
  if (!response.ok) return undefined

  const json = (await response.json()) as { parse?: { text?: { '*'?: string } } }
  const html = json.parse?.text?.['*']
  if (!html) return undefined

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const infobox = doc.querySelector('table.infobox')
  if (!infobox) return undefined

  const standard = parseStandardInfoboxRows(infobox)
  const parsed = standard.length ? standard : parseLegacyInfoboxRows(infobox)
  const rows = consolidateInfoboxRows(parsed)

  if (!rows.length) return undefined
  return { rows }
}

async function fetchArticleWordCount(title: string, signal?: AbortSignal): Promise<number | undefined> {
  const url = wikiActionUrl({
    action: 'query',
    list: 'search',
    srsearch: title,
    srnamespace: '0',
    srlimit: '5',
  })

  const response = await fetchWithTimeout(url, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-wordcount'),
  })
  if (!response.ok) return undefined

  const json = (await response.json()) as { query?: { search?: SearchHit[] } }
  const hits = json.query?.search ?? []
  const normalized = title.replace(/ /g, '_').toLowerCase()
  const match =
    hits.find((hit) => hit.title?.replace(/ /g, '_').toLowerCase() === normalized) ?? hits[0]
  return match?.wordcount
}

function sumPageviewsInRange(
  pageviews: Record<string, number | null>,
  start: string,
  end: string,
): number {
  let total = 0
  for (const [isoDate, views] of Object.entries(pageviews)) {
    if (views == null) continue
    const ymd = isoDate.replace(/-/g, '')
    if (ymd >= start && ymd <= end) {
      total += views
    }
  }
  return total
}

async function fetchArticlePageviews(
  title: string,
  signal?: AbortSignal,
): Promise<{ pageviews: Record<string, number | null>; ok: boolean }> {
  const url = wikiActionUrl({
    action: 'query',
    prop: 'pageviews',
    titles: title,
    pvipdays: '31',
  })

  try {
    const response = await fetchWithTimeout(url, {
      signal,
      headers: wikimediaApiFetchHeaders('musical-group-pageviews'),
    })
    if (!response.ok) {
      return { pageviews: {}, ok: false }
    }

    const json = (await response.json()) as {
      query?: { pages?: Record<string, { missing?: boolean; pageviews?: Record<string, number | null> }> }
    }
    const page = Object.values(json.query?.pages ?? {})[0]
    if (!page || page.missing) {
      return { pageviews: {}, ok: false }
    }

    return { pageviews: page.pageviews ?? {}, ok: true }
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    return { pageviews: {}, ok: false }
  }
}

async function resolvePageviewsLabel(
  title: string,
  signal?: AbortSignal,
): Promise<{ total: number; label: string }> {
  const fetched = await fetchArticlePageviews(title, signal)
  if (!fetched.ok) {
    return { total: 0, label: '—' }
  }

  const { pageviews } = fetched
  const end = yesterdayPageviewDate()
  const yesterday = new Date()
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)

  const weekStart = toPageviewDateParam(startOfIsoWeekUtc(yesterday))
  const weekTotal = sumPageviewsInRange(pageviews, weekStart, end)
  if (weekTotal > 0) {
    return {
      total: weekTotal,
      label: `${formatViewCount(weekTotal)} views this week`,
    }
  }

  const sevenDaysAgo = new Date(yesterday)
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6)
  const sevenStart = toPageviewDateParam(sevenDaysAgo)
  const sevenTotal = sumPageviewsInRange(pageviews, sevenStart, end)
  if (sevenTotal > 0) {
    return {
      total: sevenTotal,
      label: `${formatViewCount(sevenTotal)} views in the last 7 days`,
    }
  }

  const thirtyDaysAgo = new Date(yesterday)
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29)
  const monthStart = toPageviewDateParam(thirtyDaysAgo)
  const monthTotal = sumPageviewsInRange(pageviews, monthStart, end)
  if (monthTotal > 0) {
    return {
      total: monthTotal,
      label: `${formatViewCount(monthTotal)} views this month`,
    }
  }

  return { total: 0, label: '—' }
}

export async function fetchMusicalGroupOverview(
  data: MusicalGroupData,
  options: FetchMusicalGroupOverviewOptions = {},
): Promise<MusicalGroupOverviewData> {
  const { signal } = options
  const fetchedAt = Date.now()

  if (!data.enwikiTitle) {
    return { noEnglishArticle: true, fetchedAt }
  }

  const title = data.enwikiTitle

  const [summary, wordCount, views, infobox, related, snippet, editOpportunity] =
    await Promise.all([
      fetchPageSummary(title, signal),
      fetchArticleWordCount(title, signal),
      resolvePageviewsLabel(title, signal),
      fetchInfobox(title, signal).catch(() => undefined),
      fetchMorelikeRelated(title, data.label, signal).catch(() => undefined),
      fetchSnippetMention(data.label, title, signal).catch(() => undefined),
      fetchEditOpportunity(title, signal).catch(() => undefined),
    ])

  if (!summary) {
    return { noEnglishArticle: true, infobox, fetchedAt }
  }

  const extractHtml = deadLinkExtractHtml(summary.extract_html ?? '')
  const timestamp = summary.timestamp ?? ''
  const relative = timestamp ? formatRelativeTime(timestamp) : '—'

  return {
    infobox,
    related,
    snippet,
    editOpportunity,
    article: {
      title: summary.title ?? title,
      extractHtml,
      thumbnailUrl: summary.thumbnail?.source,
      articleUrl: summary.content_urls?.desktop?.page ?? `https://${EN_WIKI_HOST}/wiki/${pageviewsArticleSlug(title)}`,
      lastEditedTimestamp: timestamp,
      lastEditedLabel: timestamp ? `Updated ${relative}` : 'Updated —',
      viewCount: views.total,
      viewsLabel: views.label,
      wordCount: wordCount ?? 0,
      wordCountLabel: wordCount ? `${wordCount.toLocaleString()} words` : '',
    },
    fetchedAt,
  }
}
