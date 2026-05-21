/**
 * Live Impact stats for the "Real user" prototype mode.
 *
 * Data sources (all en.wikipedia.org unless noted):
 * - Total edits: Action API `list=users` → `editcount` (all namespaces, lifetime).
 * - Last edited / activity chart / longest streak: Action API `list=usercontribs` (article ns 0 only).
 * - Thanks received: not fetched (no simple public count); UI shows "?".
 * - Per-article views: Wikimedia Analytics `metrics/pageviews/per-article` on wikimedia.org,
 *   summed from the user's last edit on that article through yesterday (UTC). Metrics lag ~1 day.
 * - Thumbnails: Action API `pageimages`, then REST `/page/summary/{title}` as fallback.
 * - "Most viewed" rows: top 3 articles by those view counts (not merely the 3 most recent edits).
 */
import { normalizeWikiUsername } from '@/lib/config'
import type { ImpactData, ImpactMostViewedArticle } from '@/lib/impactTypes'

const WIKI_HOST = 'en.wikipedia.org'
const METRICS_HOST = 'wikimedia.org'
const TOP_MOST_VIEWED = 3
/** Max unique edited articles to query for pageviews (serial); then keep top 3 by views. */
const MAX_PAGEVIEW_ARTICLES = 15
const MAX_CONTRIB_PAGES = 5
const CONTRIBS_PER_PAGE = 500
const ACTIVITY_DAYS = 60

export class FetchUserImpactError extends Error {
  constructor(
    message: string,
    public readonly code: 'missing_username' | 'user_not_found' | 'aborted' | 'http',
  ) {
    super(message)
    this.name = 'FetchUserImpactError'
  }
}

export interface FetchUserImpactOptions {
  signal?: AbortSignal
  onProgress?: (step: string) => void
}

interface UserContrib {
  title: string
  timestamp: string
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new FetchUserImpactError('Request aborted', 'aborted')
  }
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  assertNotAborted(signal)
  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new FetchUserImpactError(`HTTP ${response.status}`, 'http')
  }
  return response.json()
}

function actionUrl(params: Record<string, string>): string {
  const search = new URLSearchParams({
    ...params,
    format: 'json',
    origin: '*',
  })
  return `https://${WIKI_HOST}/w/api.php?${search.toString()}`
}

/** Parse Action API timestamps (`2026-02-23T09:12:59Z` or `2013-07-31 11:54:03`). */
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

/** AQS daily metrics are typically available through yesterday (UTC). */
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

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function computeLongestStreak(contribDays: Set<string>): string {
  if (contribDays.size === 0) return '0 days'
  const sorted = [...contribDays].sort()
  let longest = 1
  let current = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T12:00:00Z').getTime()
    const curr = new Date(sorted[i] + 'T12:00:00Z').getTime()
    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24))
    if (diffDays === 1) {
      current++
      longest = Math.max(longest, current)
    } else {
      current = 1
    }
  }
  return longest === 1 ? '1 day' : `${longest} days`
}

function buildActivityHistogram(contribs: UserContrib[]): {
  recentActivityData: number[]
  activityStartDate: string
  activityEndDate: string
} {
  const end = new Date()
  end.setUTCHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - (ACTIVITY_DAYS - 1))

  const buckets = new Array<number>(ACTIVITY_DAYS).fill(0)
  const startMs = start.getTime()

  for (const c of contribs) {
    const day = c.timestamp.slice(0, 10)
    const dayDate = new Date(day + 'T12:00:00Z')
    const index = Math.floor((dayDate.getTime() - startMs) / (1000 * 60 * 60 * 24))
    if (index >= 0 && index < ACTIVITY_DAYS) {
      buckets[index]++
    }
  }

  return {
    recentActivityData: buckets,
    activityStartDate: formatShortDate(start),
    activityEndDate: formatShortDate(end),
  }
}

function formatViewCount(total: number): string {
  if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1)}M`
  if (total >= 1000) return `${(total / 1000).toFixed(1)}K`
  return total.toLocaleString()
}

async function fetchPageviewsSince(
  title: string,
  sinceIso: string,
  signal?: AbortSignal,
): Promise<{ total: number; daily: number[] }> {
  const article = pageviewsArticleSlug(title)
  let start = sinceIso
    ? toPageviewDateParam(parseMediaWikiTimestamp(sinceIso))
    : ''
  let end = yesterdayPageviewDate()

  if (!start || start.length !== 8 || Number.isNaN(Number(start))) {
    const fallback = new Date()
    fallback.setUTCDate(fallback.getUTCDate() - 60)
    start = toPageviewDateParam(fallback)
  }

  // Edit is newer than the latest pageview day — no post-edit views in metrics yet.
  if (start > end) {
    return { total: 0, daily: [] }
  }

  const url =
    `https://${METRICS_HOST}/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/all-agents/${article}/daily/${start}/${end}`

  try {
    assertNotAborted(signal)
    const response = await fetch(url, { signal })
    if (!response.ok) {
      return { total: 0, daily: [] }
    }
    const json = (await response.json()) as {
      items?: { views?: number }[]
    }
    const items = json.items ?? []
    const daily = items.map((i) => i.views ?? 0)
    const total = daily.reduce((s, v) => s + v, 0)
    return { total, daily }
  } catch {
    return { total: 0, daily: [] }
  }
}

async function fetchThumbnail(title: string, signal?: AbortSignal): Promise<string | undefined> {
  const url = actionUrl({
    action: 'query',
    titles: title,
    prop: 'pageimages',
    pithumbsize: '96',
    redirects: '1',
  })
  try {
    const json = (await fetchJson(url, signal)) as {
      query?: { pages?: Record<string, { thumbnail?: { source?: string } }> }
    }
    const pages = json.query?.pages ?? {}
    for (const page of Object.values(pages)) {
      if (page.thumbnail?.source) return page.thumbnail.source
    }
  } catch {
    // try REST summary below
  }

  try {
    assertNotAborted(signal)
    const slug = encodeURIComponent(title.replace(/ /g, '_'))
    const response = await fetch(`https://${WIKI_HOST}/api/rest_v1/page/summary/${slug}`, {
      signal,
    })
    if (!response.ok) return undefined
    const json = (await response.json()) as { thumbnail?: { source?: string } }
    return json.thumbnail?.source
  } catch {
    return undefined
  }
}

export async function fetchUserImpact(
  rawUsername: string,
  options: FetchUserImpactOptions = {},
): Promise<ImpactData> {
  const { signal, onProgress } = options
  const username = normalizeWikiUsername(rawUsername)
  if (!username.length) {
    throw new FetchUserImpactError('Enter a Wikipedia username', 'missing_username')
  }

  assertNotAborted(signal)
  onProgress?.('user')

  const usersJson = (await fetchJson(
    actionUrl({
      action: 'query',
      list: 'users',
      ususers: username,
      usprop: 'editcount',
    }),
    signal,
  )) as {
    query?: { users?: { name?: string; missing?: boolean; editcount?: number }[] }
  }

  const userInfo = usersJson.query?.users?.[0]
  if (!userInfo || userInfo.missing) {
    throw new FetchUserImpactError(`User "${username}" not found`, 'user_not_found')
  }

  const totalEdits = userInfo.editcount ?? 0

  assertNotAborted(signal)
  onProgress?.('contributions')

  const allContribs: UserContrib[] = []
  let uccontinue: string | undefined

  for (let page = 0; page < MAX_CONTRIB_PAGES; page++) {
    assertNotAborted(signal)
    const params: Record<string, string> = {
      action: 'query',
      list: 'usercontribs',
      ucuser: username,
      ucnamespace: '0',
      uclimit: String(CONTRIBS_PER_PAGE),
    }
    if (uccontinue) params.uccontinue = uccontinue

    const json = (await fetchJson(actionUrl(params), signal)) as {
      query?: { usercontribs?: UserContrib[] }
      continue?: { uccontinue?: string }
    }

    const batch = json.query?.usercontribs ?? []
    allContribs.push(...batch)

    uccontinue = json.continue?.uccontinue
    if (!uccontinue) break
  }

  const lastEdited = allContribs[0]
    ? formatRelativeTime(allContribs[0].timestamp)
    : undefined

  const contribDays = new Set(allContribs.map((c) => c.timestamp.slice(0, 10)))
  const longestStreak = computeLongestStreak(contribDays)

  const { recentActivityData, activityStartDate, activityEndDate } =
    buildActivityHistogram(allContribs)

  const titleToLatestEdit = new Map<string, string>()
  for (const c of allContribs) {
    if (!titleToLatestEdit.has(c.title)) {
      titleToLatestEdit.set(c.title, c.timestamp)
    }
  }

  const editedPageTitles = [...titleToLatestEdit.keys()]

  const titlesForPageviews = editedPageTitles.slice(0, MAX_PAGEVIEW_ARTICLES)
  const viewRows: { title: string; total: number; daily: number[] }[] = []

  for (const title of titlesForPageviews) {
    assertNotAborted(signal)
    onProgress?.(`pageviews:${title}`)

    const since = titleToLatestEdit.get(title) ?? ''
    const { total, daily } = await fetchPageviewsSince(title, since, signal)
    viewRows.push({ title, total, daily })
  }

  viewRows.sort((a, b) => b.total - a.total)

  const aggregateViews = viewRows.reduce((sum, row) => sum + row.total, 0)
  const topByViews = viewRows.slice(0, TOP_MOST_VIEWED)
  const mostViewed: ImpactMostViewedArticle[] = []

  for (const row of topByViews) {
    assertNotAborted(signal)
    onProgress?.(`thumbnail:${row.title}`)

    const thumbnailSrc = await fetchThumbnail(row.title, signal)

    mostViewed.push({
      title: row.title,
      views: row.total,
      sparklineData: row.daily.length >= 2 ? row.daily.slice(-10) : undefined,
      thumbnailSrc,
      href: `https://${WIKI_HOST}/wiki/${encodeURIComponent(row.title.replace(/ /g, '_'))}`,
    })
  }

  const viewCount =
    aggregateViews > 0 ? formatViewCount(aggregateViews) : totalEdits > 0 ? '—' : undefined

  const sparklineSource = topByViews[0]?.daily ?? []
  const sparklineData =
    sparklineSource.length >= 2
      ? sparklineSource
      : totalEdits > 0
        ? new Array(40).fill(0)
        : []

  return {
    totalEdits,
    thanksReceived: '?',
    lastEdited,
    longestStreak,
    recentActivityData,
    activityStartDate,
    activityEndDate,
    viewCount,
    viewLabel: "Views on articles you've edited",
    sparklineData,
    mostViewed,
    viewAllEditsHref: `https://${WIKI_HOST}/wiki/Special:Contributions/${encodeURIComponent(username)}`,
    editedPageTitles,
  }
}
