import { FakeWiki } from 'fakewiki'
import type { FWCachedRevision } from 'fakewiki/types'

import type { ConfigUser, UserPageLists } from '@/lib/config'
import { normalizeLang, wikiBaseUrlFromLang } from '@/lib/config'
import {
  DASHPAGE_RC_API_USER_AGENT,
  DASHPAGE_RC_FALLBACK_PAGE,
  DASHPAGE_RC_KNOWN_ITEMS_MAX,
  DASHPAGE_RC_KNOWN_PAGES_MAX,
  DASHPAGE_RC_MORELIKE_ITEMS_MAX,
  DASHPAGE_RC_MORELIKE_PAGES_MAX,
  DASHPAGE_RC_WILDCARD_FALLBACK_LIMIT,
  DASHPAGE_RC_WILDCARD_MAX,
  DASHPAGE_RC_WILDCARD_MIN_WINDOW_MS,
} from '@/lib/dashpageRecentChangesConstants'
import type { RecentChangeFeedItem } from '@/lib/dashpageRecentChangesTypes'
import {
  enrichRevisionIncremental,
  type RecentChangeStructuredDeltaSegment,
  type RevisionCandidate,
} from '@/lib/dashpageRecentChangesSignals'
import {
  getPortfolioPagesForUser,
  pickUpToRandomPages,
  portfolioPoolForDashpage,
} from '@/lib/dashpageSuggestionCache'
import {
  FetchMorelikePageTitlesError,
  fetchMorelikePageTitles,
} from '@/lib/fetchMorelikePageTitles'
import { fetchPagePreviewMetadataBatch } from '@/lib/fetchUserEditedPageTitles'
import { formatDashpageEditSummaryHtml } from '@/lib/formatDashpageEditSummaryHtml'

export function createDashpageRecentChangesWiki(lang = 'en'): FakeWiki {
  return new FakeWiki(wikiBaseUrlFromLang(lang), {
    apiUserAgent: DASHPAGE_RC_API_USER_AGENT,
    historyFetchConcurrency: 1,
    liftWingRevisionConcurrency: 1,
  })
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }
}

function isMainNamespaceArticleTitle(title: string | undefined): boolean {
  if (!title?.trim()) return false
  return !title.includes(':')
}

/** Portfolio history depth — enough to skip a run of bot edits at the page top. */
const DASHPAGE_RC_PORTFOLIO_HISTORY_LIMIT = 10

function isBotEditByHeuristic(revision: {
  user?: { name?: string }
  tags?: string[]
  comment?: string
}): boolean {
  const userName = revision.user?.name?.trim().toLowerCase() ?? ''
  if (userName.includes('bot')) return true
  if (revision.tags?.includes('bot')) return true

  const comment = revision.comment ?? ''
  if (/#IABot\b/i.test(comment)) return true
  if (/Use this bot\]\]/i.test(comment)) return true
  if (/\[\[User:[^\]|]*Bot/i.test(comment)) return true

  return false
}

function isBotUserInfo(userInfo: { groups?: string[]; implicitgroups?: string[] } | null): boolean {
  if (!userInfo) return false
  return (
    userInfo.groups?.includes('bot') === true ||
    userInfo.implicitgroups?.includes('bot') === true
  )
}

function isCandidateHeuristicBot(candidate: RevisionCandidate): boolean {
  return isBotEditByHeuristic({
    user: { name: candidate.userName },
    comment: candidate.comment,
  })
}

function pickFirstNonBotHistoryRevision(
  revisions: FWCachedRevision[],
  excludeRevIds: ReadonlySet<number> = new Set(),
): { latest: FWCachedRevision; parent: FWCachedRevision | null } | null {
  for (let index = 0; index < revisions.length; index += 1) {
    const latest = revisions[index]
    if (!latest?.id || isBotEditByHeuristic(latest)) continue
    if (excludeRevIds.has(latest.id)) continue
    return {
      latest,
      parent: revisions[index + 1] ?? null,
    }
  }
  return null
}

function revisionFromHistory(
  rev: FWCachedRevision,
  pageTitle: string,
  parentRevId: number | null,
  source: RevisionCandidate['source'],
): RevisionCandidate {
  return {
    revId: rev.id,
    parentRevId,
    pageTitle,
    userName: rev.user?.name ?? '',
    timestamp: rev.timestamp ?? '',
    comment: rev.comment ?? '',
    delta: rev.delta ?? 0,
    source,
  }
}

interface PortfolioStreamResult {
  enrichedCount: number
  timestamps: string[]
  pageTitles: Set<string>
}

function parseMediaWikiTimestampMs(timestamp: string): number {
  const trimmed = timestamp.trim()
  if (!trimmed.length) return Number.NaN
  if (trimmed.includes('T')) {
    return new Date(trimmed.endsWith('Z') ? trimmed : `${trimmed}Z`).getTime()
  }
  return new Date(trimmed.replace(' ', 'T') + 'Z').getTime()
}

function formatMediaWikiRcTimestamp(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function pickWildcardTimeWindows(
  portfolioTimestamps: string[],
  queryCount: number,
): Array<{ rcstart: string; rcend: string }> {
  const timesMs = portfolioTimestamps
    .map(parseMediaWikiTimestampMs)
    .filter((value) => !Number.isNaN(value))

  if (!timesMs.length || queryCount <= 0) return []

  const minMs = Math.min(...timesMs)
  const maxMs = Math.max(...timesMs)
  const spanMs = Math.max(maxMs - minMs, 1)
  const halfWindowMs = Math.max(
    DASHPAGE_RC_WILDCARD_MIN_WINDOW_MS,
    Math.floor(spanMs / 10),
  )

  const windows: Array<{ rcstart: string; rcend: string }> = []

  for (let index = 0; index < queryCount; index += 1) {
    const anchorMs = minMs + Math.random() * spanMs
    let rcstartMs = Math.min(maxMs, anchorMs + halfWindowMs)
    let rcendMs = Math.max(minMs, anchorMs - halfWindowMs)

    if (rcstartMs <= rcendMs) {
      rcstartMs = Math.min(maxMs, rcendMs + 1000)
    }

    windows.push({
      rcstart: formatMediaWikiRcTimestamp(new Date(rcstartMs)),
      rcend: formatMediaWikiRcTimestamp(new Date(rcendMs)),
    })
  }

  return windows
}

function isEligibleWildcardRevision(
  rev: FWCachedRevision,
  excludeRevIds: ReadonlySet<number>,
  excludePageTitles: ReadonlySet<string>,
): boolean {
  if (!rev.id || excludeRevIds.has(rev.id)) return false
  if (!isMainNamespaceArticleTitle(rev.pageName)) return false
  if (rev.pageName && excludePageTitles.has(rev.pageName)) return false
  if (isBotEditByHeuristic(rev)) return false
  return true
}

function pickWildcardCandidateFromResult(
  result: { revisions: FWCachedRevision[] },
  excludeRevIds: Set<number>,
  excludePageTitles: Set<string>,
): RevisionCandidate | null {
  for (const rev of result.revisions) {
    if (!isEligibleWildcardRevision(rev, excludeRevIds, excludePageTitles)) continue

    const pageTitle = rev.pageName ?? DASHPAGE_RC_FALLBACK_PAGE
    return revisionFromHistory(rev, pageTitle, null, 'wildcard')
  }
  return null
}

async function fetchWildcardCandidateAtWindow(
  wiki: FakeWiki,
  window: { rcstart: string; rcend: string },
  excludeRevIds: Set<number>,
  excludePageTitles: Set<string>,
  signal: AbortSignal,
): Promise<RevisionCandidate | null> {
  assertNotAborted(signal)

  let result = await wiki.getRecentChanges({
    limit: 1,
    onlyNeedsReview: true,
    rcstart: window.rcstart,
    rcend: window.rcend,
  })

  let candidate = pickWildcardCandidateFromResult(result, excludeRevIds, excludePageTitles)
  if (candidate) return candidate

  const startMs = parseMediaWikiTimestampMs(window.rcstart)
  const endMs = parseMediaWikiTimestampMs(window.rcend)
  if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && startMs > endMs) {
    const midMs = endMs + Math.floor((startMs - endMs) / 2)
    const expandedHalfWindow = Math.max(DASHPAGE_RC_WILDCARD_MIN_WINDOW_MS, startMs - endMs)
    const expandedWindow = {
      rcstart: formatMediaWikiRcTimestamp(new Date(Math.min(startMs + expandedHalfWindow, startMs))),
      rcend: formatMediaWikiRcTimestamp(new Date(Math.max(endMs, midMs - expandedHalfWindow))),
    }

    assertNotAborted(signal)
    result = await wiki.getRecentChanges({
      limit: 1,
      onlyNeedsReview: true,
      rcstart: expandedWindow.rcstart,
      rcend: expandedWindow.rcend,
    })

    candidate = pickWildcardCandidateFromResult(result, excludeRevIds, excludePageTitles)
  }

  return candidate
}

async function fetchFallbackWildcardCandidate(
  wiki: FakeWiki,
  excludeRevIds: Set<number>,
  excludePageTitles: Set<string>,
  signal: AbortSignal,
): Promise<RevisionCandidate | null> {
  assertNotAborted(signal)

  let rccontinue: string | undefined

  while (true) {
    assertNotAborted(signal)

    const result = await wiki.getRecentChanges({
      limit: DASHPAGE_RC_WILDCARD_FALLBACK_LIMIT,
      onlyNeedsReview: true,
      rccontinue,
    })

    const candidate = pickWildcardCandidateFromResult(result, excludeRevIds, excludePageTitles)
    if (candidate) return candidate

    if (!result.rccontinue) break
    rccontinue = result.rccontinue
  }

  return null
}

async function streamPortfolioRevisions(
  wiki: FakeWiki,
  user: ConfigUser,
  pageLists: UserPageLists,
  cachedRealTitles: string[],
  excludeRevIds: Set<number>,
  signal: AbortSignal,
  onCandidate: (candidate: RevisionCandidate) => Promise<boolean>,
  lang = 'en',
): Promise<PortfolioStreamResult> {
  const portfolio = getPortfolioPagesForUser(user, pageLists, cachedRealTitles)
  const portfolioPool = portfolioPoolForDashpage(user, portfolio)

  const portfolioPicks = pickUpToRandomPages(portfolioPool, DASHPAGE_RC_KNOWN_PAGES_MAX)

  assertNotAborted(signal)

  let enrichedCount = 0
  const timestamps: string[] = []
  const pageTitles = new Set<string>(portfolioPicks)

  async function tryPageTitle(pageTitle: string): Promise<boolean> {
    assertNotAborted(signal)

    const history = await wiki.getPageHistory(pageTitle, {
      limit: DASHPAGE_RC_PORTFOLIO_HISTORY_LIMIT,
    })
    const revisions = history.revisions ?? []
    if (!revisions.length) return false

    const picked = pickFirstNonBotHistoryRevision(revisions, excludeRevIds)
    if (!picked?.latest.id) return false

    const candidate = revisionFromHistory(
      picked.latest,
      pageTitle,
      picked.parent?.id ?? null,
      'portfolio',
    )

    if (excludeRevIds.has(candidate.revId)) return false

    const added = await onCandidate(candidate)
    if (!added) return false

    excludeRevIds.add(candidate.revId)
    pageTitles.add(pageTitle)
    if (candidate.timestamp) {
      timestamps.push(candidate.timestamp)
    }
    enrichedCount += 1
    return true
  }

  let knownCount = 0
  for (const pageTitle of portfolioPicks) {
    if (knownCount >= DASHPAGE_RC_KNOWN_ITEMS_MAX) break
    if (await tryPageTitle(pageTitle)) {
      knownCount += 1
    }
  }

  let morelikePicks: string[] = []
  if (knownCount < DASHPAGE_RC_KNOWN_ITEMS_MAX || DASHPAGE_RC_MORELIKE_ITEMS_MAX > 0) {
    try {
      morelikePicks = await fetchMorelikePageTitles(portfolioPicks, {
        limit: DASHPAGE_RC_MORELIKE_PAGES_MAX,
        excludeTitles: portfolioPicks,
        signal,
        lang,
      })
    } catch (caught) {
      if (caught instanceof FetchMorelikePageTitlesError && caught.code === 'aborted') {
        throw caught
      }
    }
  }

  for (const pageTitle of morelikePicks) {
    pageTitles.add(pageTitle)
  }

  let morelikeCount = 0
  for (const pageTitle of morelikePicks) {
    if (morelikeCount >= DASHPAGE_RC_MORELIKE_ITEMS_MAX) break
    if (await tryPageTitle(pageTitle)) {
      morelikeCount += 1
    }
  }

  return { enrichedCount, timestamps, pageTitles }
}

async function streamWildcardRevisions(
  wiki: FakeWiki,
  excludeRevIds: Set<number>,
  excludePageTitles: Set<string>,
  portfolioTimestamps: string[],
  signal: AbortSignal,
  onCandidate: (candidate: RevisionCandidate) => Promise<boolean>,
): Promise<number> {
  if (DASHPAGE_RC_WILDCARD_MAX <= 0) return 0

  assertNotAborted(signal)

  const timeWindows = pickWildcardTimeWindows(portfolioTimestamps, DASHPAGE_RC_WILDCARD_MAX)
  let enrichedCount = 0

  for (let index = 0; index < DASHPAGE_RC_WILDCARD_MAX; index += 1) {
    if (enrichedCount >= DASHPAGE_RC_WILDCARD_MAX) break

    assertNotAborted(signal)

    let candidate: RevisionCandidate | null = null

    const window = timeWindows[index]
    if (window) {
      candidate = await fetchWildcardCandidateAtWindow(
        wiki,
        window,
        excludeRevIds,
        excludePageTitles,
        signal,
      )
    }

    if (!candidate) {
      candidate = await fetchFallbackWildcardCandidate(
        wiki,
        excludeRevIds,
        excludePageTitles,
        signal,
      )
    }

    if (!candidate) continue

    const added = await onCandidate(candidate)
    if (!added) continue

    excludeRevIds.add(candidate.revId)
    enrichedCount += 1
  }

  return enrichedCount
}

function createSkeletonFromCandidate(
  wiki: FakeWiki,
  candidate: RevisionCandidate,
): RecentChangeFeedItem {
  return {
    revId: candidate.revId,
    parentRevId: candidate.parentRevId,
    pageTitle: candidate.pageTitle,
    userName: candidate.userName,
    timestamp: candidate.timestamp,
    comment: candidate.comment,
    delta: candidate.delta,
    source: candidate.source,
    diffUrl: wiki.getRevisionUrl(candidate.revId, candidate.pageTitle),
  }
}

async function isBotUser(wiki: FakeWiki, userName: string): Promise<boolean> {
  if (!userName.trim()) return false
  const usersInfo = await wiki.getUsersInfo([userName])
  return isBotUserInfo(usersInfo[userName] ?? null)
}

async function fetchStructuredDeltaSegments(
  wiki: FakeWiki,
  revId: number,
  lang: string,
): Promise<RecentChangeStructuredDeltaSegment[] | null> {
  try {
    const result = await wiki.getStructuredDeltasFromRevision(revId, { lang: normalizeLang(lang) })
    if (!result?.segments?.length) return null
    return result.segments.map((segment) => ({
      text: segment.text,
      deltaClass: segment.deltaClass,
    }))
  } catch {
    return null
  }
}

async function enrichCandidateItem(
  wiki: FakeWiki,
  candidate: RevisionCandidate,
  handlers: DashpageRecentChangesHandlers,
  lang: string,
  signal?: AbortSignal,
): Promise<boolean> {
  if (isCandidateHeuristicBot(candidate)) return false

  assertNotAborted(signal)

  handlers.onSkeleton(createSkeletonFromCandidate(wiki, candidate))

  if (await isBotUser(wiki, candidate.userName)) {
    handlers.onRemove(candidate.revId)
    return false
  }

  await enrichRevisionIncremental(wiki, candidate, (patch) => {
    handlers.onPatch(candidate.revId, patch)
  }, lang)

  assertNotAborted(signal)
  const structuredDeltaSegments = await fetchStructuredDeltaSegments(wiki, candidate.revId, lang)
  handlers.onPatch(candidate.revId, { structuredDeltaSegments })

  if (candidate.comment.trim()) {
    const commentHtml = await formatDashpageEditSummaryHtml(
      wiki,
      candidate.comment,
      candidate.pageTitle,
    )
    if (commentHtml) {
      handlers.onPatch(candidate.revId, { commentHtml })
    }
  }

  assertNotAborted(signal)
  const previews = await fetchPagePreviewMetadataBatch([candidate.pageTitle], { signal, lang })
  const shortDescription = previews[candidate.pageTitle]?.shortDescription
  if (shortDescription) {
    handlers.onPatch(candidate.revId, { shortDescription })
  }

  return true
}

export interface DashpageRecentChangesHandlers {
  onSkeleton: (item: RecentChangeFeedItem) => void
  onPatch: (revId: number, patch: Partial<RecentChangeFeedItem>) => void
  onRemove: (revId: number) => void
}

export interface FetchDashpageRecentChangesOptions {
  user: ConfigUser
  pageLists: UserPageLists
  cachedRealTitles: string[]
  excludeRevIds?: number[]
  /** Total feed items to return (portfolio + wildcards). Defaults to fullscreen max. */
  targetCount?: number
  signal?: AbortSignal
  wiki?: FakeWiki
  /** Wikipedia language code (default `en`). */
  lang?: string
  handlers?: DashpageRecentChangesHandlers
}

export async function runDashpageRecentChangesPipeline(
  options: FetchDashpageRecentChangesOptions,
): Promise<void> {
  const lang = options.lang ?? 'en'
  const wiki = options.wiki ?? createDashpageRecentChangesWiki(lang)
  const signal = options.signal
  const handlers = options.handlers
  if (!handlers) return

  const excludeRevIds = new Set(options.excludeRevIds ?? [])

  const activeSignal = signal ?? new AbortController().signal

  const enrichCandidate = async (candidate: RevisionCandidate): Promise<boolean> => {
    if (excludeRevIds.has(candidate.revId)) return false
    return enrichCandidateItem(wiki, candidate, handlers, lang, activeSignal)
  }

  const portfolioResult = await streamPortfolioRevisions(
    wiki,
    options.user,
    options.pageLists,
    options.cachedRealTitles,
    excludeRevIds,
    activeSignal,
    enrichCandidate,
    lang,
  )

  await streamWildcardRevisions(
    wiki,
    excludeRevIds,
    portfolioResult.pageTitles,
    portfolioResult.timestamps,
    activeSignal,
    enrichCandidate,
  )
}

export async function fetchDashpageRecentChanges(
  options: FetchDashpageRecentChangesOptions,
): Promise<RecentChangeFeedItem[]> {
  const items: RecentChangeFeedItem[] = []
  const byRevId = new Map<number, RecentChangeFeedItem>()

  await runDashpageRecentChangesPipeline({
    ...options,
    handlers: {
      onSkeleton: (item) => {
        items.push(item)
        byRevId.set(item.revId, item)
        options.handlers?.onSkeleton(item)
      },
      onPatch: (revId, patch) => {
        const item = byRevId.get(revId)
        if (item) Object.assign(item, patch)
        options.handlers?.onPatch(revId, patch)
      },
      onRemove: (revId) => {
        const index = items.findIndex((item) => item.revId === revId)
        if (index >= 0) items.splice(index, 1)
        byRevId.delete(revId)
        options.handlers?.onRemove(revId)
      },
    },
  })

  return items
}
