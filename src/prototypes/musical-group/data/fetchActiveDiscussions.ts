import { wikimediaApiFetchHeaders } from '@/config'

import { mapWithConcurrency } from '@/lib/mapWithConcurrency'
import { fetchWikimedia } from '@/lib/fetchWikimedia'

import { utcDayKey } from './cacheKeys'
import { enwikiArticleUrl, normalizeEnwikiTitle, wikiActionUrl } from './enwikiTitle'
import { getCachedActiveDiscussions, setCachedActiveDiscussions } from './homeTabCache'
import type { HomeActiveDiscussion } from './types'

/** Production enwiki noticeboards from wgPersonalDashboardActiveDiscussionsPages (T420785). */
export const ENWIKI_ACTIVE_DISCUSSION_PAGES = [
  'Wikipedia:Help desk',
  'Wikipedia:Village pump (miscellaneous)',
  'Wikipedia:Village pump (technical)',
  'Wikipedia:Village pump (idea_lab)',
  'Wikipedia:Village pump (policy)',
  'Wikipedia:Village pump (proposals)',
] as const

const FETCH_CONCURRENCY = 3
/** Minimum threads to retain per noticeboard so tab previews can show two cards. */
const PER_NOTICEBOARD_MIN = 2
const DEFAULT_LIMIT = 20

let sessionCached: { day: string; value: HomeActiveDiscussion[] } | null = null

interface ThreadItemHtml {
  headingLevel?: number | null
  type?: string
  id?: string
  html?: string
  commentCount?: number
  authorCount?: number
  latestReplyTimestamp?: string | null
  latestReply?: { id?: string } | null
}

function parseMediaWikiTimestamp(timestamp: string): Date {
  const trimmed = timestamp.trim()
  if (!trimmed.length) return new Date(Number.NaN)
  if (trimmed.includes('T')) {
    return new Date(trimmed.endsWith('Z') ? trimmed : `${trimmed}Z`)
  }
  return new Date(trimmed.replace(' ', 'T') + 'Z')
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

function stripHtml(html: string): string {
  if (!html?.trim()) return ''
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return doc.body.textContent?.trim() ?? ''
  }
  return html.replace(/<[^>]+>/g, '').trim()
}

function noticeboardUrl(noticeboardPage: string, fragment?: string): string {
  const base = enwikiArticleUrl(noticeboardPage)
  if (!fragment) return base
  return `${base}#${fragment}`
}

function mapThreadToDiscussion(
  item: ThreadItemHtml,
  noticeboardPage: string,
): HomeActiveDiscussion | null {
  if (item.headingLevel == null) return null
  if ((item.authorCount ?? 0) <= 1) return null
  if (!item.latestReplyTimestamp || !item.latestReply?.id || !item.id) return null

  const title = stripHtml(item.html ?? '')
  if (!title) return null

  const noticeboardTitle = normalizeEnwikiTitle(noticeboardPage)
  const relative = formatRelativeTime(item.latestReplyTimestamp)

  return {
    id: item.latestReply.id,
    title,
    noticeboardTitle,
    noticeboardPage,
    commentCount: item.commentCount ?? 0,
    participantCount: item.authorCount ?? 0,
    latestReplyTimestamp: item.latestReplyTimestamp,
    latestCommentLabel: relative,
    discussionUrl: noticeboardUrl(noticeboardPage, item.id),
    latestCommentUrl: noticeboardUrl(noticeboardPage, item.latestReply.id),
  }
}

async function fetchNoticeboardDiscussions(
  noticeboardPage: string,
  signal?: AbortSignal,
): Promise<HomeActiveDiscussion[]> {
  const url = wikiActionUrl({
    action: 'discussiontoolspageinfo',
    prop: 'threaditemshtml',
    threaditemsflags: 'noreplies|excludesignatures|activity',
    page: noticeboardPage,
    formatversion: '2',
  })

  const response = await fetchWikimedia(url, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-active-discussions'),
  })
  if (!response.ok) {
    throw new Error(`Could not load discussions from ${noticeboardPage} (${response.status})`)
  }

  const json = (await response.json()) as {
    discussiontoolspageinfo?: { threaditemshtml?: ThreadItemHtml[] }
  }

  const items = json.discussiontoolspageinfo?.threaditemshtml ?? []
  return items
    .map((item) => mapThreadToDiscussion(item, noticeboardPage))
    .filter((item): item is HomeActiveDiscussion => item !== null)
}

export function clearActiveDiscussionsSessionCache(): void {
  sessionCached = null
}

function mergeActiveDiscussions(batches: HomeActiveDiscussion[][]): HomeActiveDiscussion[] {
  const sortedBatches = batches.map((batch) =>
    [...batch].sort((a, b) => b.latestReplyTimestamp.localeCompare(a.latestReplyTimestamp)),
  )

  const guaranteed = sortedBatches.flatMap((batch) => batch.slice(0, PER_NOTICEBOARD_MIN))
  const guaranteedIds = new Set(guaranteed.map((d) => d.id))

  const remainder = sortedBatches
    .flat()
    .filter((d) => !guaranteedIds.has(d.id))
    .sort((a, b) => b.latestReplyTimestamp.localeCompare(a.latestReplyTimestamp))

  return [...guaranteed, ...remainder]
    .sort((a, b) => b.latestReplyTimestamp.localeCompare(a.latestReplyTimestamp))
    .slice(0, DEFAULT_LIMIT)
}

/** Active discussions from configured enwiki noticeboards, sorted by latest reply. */
export async function fetchActiveDiscussions(
  signal?: AbortSignal,
  limit = DEFAULT_LIMIT,
): Promise<HomeActiveDiscussion[]> {
  const dayKey = utcDayKey()

  const stored = getCachedActiveDiscussions(dayKey)
  if (stored?.length) {
    return stored.slice(0, limit)
  }

  if (sessionCached && sessionCached.day === dayKey && sessionCached.value.length) {
    return sessionCached.value.slice(0, limit)
  }

  const batches = await mapWithConcurrency(
    [...ENWIKI_ACTIVE_DISCUSSION_PAGES],
    FETCH_CONCURRENCY,
    (page) => fetchNoticeboardDiscussions(page, signal),
    signal,
  )

  const merged = mergeActiveDiscussions(batches)

  sessionCached = { day: dayKey, value: merged }
  if (merged.length) {
    setCachedActiveDiscussions(dayKey, merged)
  }

  return merged.slice(0, limit)
}
