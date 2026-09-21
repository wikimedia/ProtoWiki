import { wikimediaApiFetchHeaders } from '@/config'
import { cdxIconSpeechBubbles } from '@wikimedia/codex-icons'
import { fetchWikimedia } from '@/lib/fetchWikimedia'
import { mapWithConcurrency } from '@/lib/mapWithConcurrency'
import type { WikitabCardData } from '../sections'
import { activeDiscussionCategoryLabel } from './activeDiscussionLabels'
import { EN_WIKI_HOST, articleUrl } from './wikitabHtml'

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
/** Minimum threads to retain per noticeboard so the feed stays diverse. */
const PER_NOTICEBOARD_MIN = 2
const DEFAULT_LIMIT = 20

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

interface ActiveDiscussion {
  key: string
  title: string
  noticeboardPage: string
  commentCount: number
  latestReplyTimestamp: string
  threadId: string
}

function discussionToolsUrl(page: string): string {
  const params = new URLSearchParams({
    action: 'discussiontoolspageinfo',
    prop: 'threaditemshtml',
    threaditemsflags: 'noreplies|excludesignatures|activity',
    page,
    formatversion: '2',
    format: 'json',
    origin: '*',
  })
  return `https://${EN_WIKI_HOST}/w/api.php?${params.toString()}`
}

function noticeboardUrl(noticeboardPage: string, fragment?: string): string {
  const base = articleUrl(noticeboardPage)
  if (!fragment) return base
  return `${base}#${fragment}`
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
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function stripHtml(html: string): string {
  if (!html?.trim()) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent?.trim() ?? ''
}

function mapThreadToDiscussion(
  item: ThreadItemHtml,
  noticeboardPage: string,
): ActiveDiscussion | null {
  if (item.headingLevel == null) return null
  if ((item.authorCount ?? 0) <= 1) return null
  if (!item.latestReplyTimestamp || !item.latestReply?.id || !item.id) return null

  const title = stripHtml(item.html ?? '')
  if (!title) return null

  return {
    key: item.latestReply.id,
    title,
    noticeboardPage,
    commentCount: item.commentCount ?? 0,
    latestReplyTimestamp: item.latestReplyTimestamp,
    threadId: item.id,
  }
}

function formatCommentCount(count: number): string {
  return `${count} ${count === 1 ? 'comment' : 'comments'}`
}

function mapDiscussionToCard(discussion: ActiveDiscussion): WikitabCardData {
  const relative = formatRelativeTime(discussion.latestReplyTimestamp)
  return {
    key: discussion.key,
    title: discussion.title,
    description: activeDiscussionCategoryLabel(discussion.noticeboardPage),
    supportingSignals: [
      { icon: cdxIconSpeechBubbles, text: formatCommentCount(discussion.commentCount) },
    ],
    supportingTextEnd: relative,
    href: noticeboardUrl(discussion.noticeboardPage, discussion.threadId),
    linkTitle: discussion.title,
  }
}

async function fetchNoticeboardDiscussions(
  noticeboardPage: string,
  signal?: AbortSignal,
): Promise<ActiveDiscussion[]> {
  try {
    const response = await fetchWikimedia(discussionToolsUrl(noticeboardPage), {
      signal,
      headers: wikimediaApiFetchHeaders('wikitab-discussions'),
    })
    if (!response.ok) return []

    const json = (await response.json()) as {
      discussiontoolspageinfo?: { threaditemshtml?: ThreadItemHtml[] }
    }

    const items = json.discussiontoolspageinfo?.threaditemshtml ?? []
    return items
      .map((item) => mapThreadToDiscussion(item, noticeboardPage))
      .filter((item): item is ActiveDiscussion => item !== null)
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error
    return []
  }
}

function mergeActiveDiscussions(batches: ActiveDiscussion[][]): ActiveDiscussion[] {
  const sortedBatches = batches.map((batch) =>
    [...batch].sort((a, b) => b.latestReplyTimestamp.localeCompare(a.latestReplyTimestamp)),
  )

  const guaranteed = sortedBatches.flatMap((batch) => batch.slice(0, PER_NOTICEBOARD_MIN))
  const guaranteedKeys = new Set(guaranteed.map((d) => d.key))

  const remainder = sortedBatches
    .flat()
    .filter((d) => !guaranteedKeys.has(d.key))
    .sort((a, b) => b.latestReplyTimestamp.localeCompare(a.latestReplyTimestamp))

  return [...guaranteed, ...remainder]
    .sort((a, b) => b.latestReplyTimestamp.localeCompare(a.latestReplyTimestamp))
    .slice(0, DEFAULT_LIMIT)
}

/** Active discussions from configured enwiki noticeboards, sorted by latest reply. */
export async function fetchActiveDiscussions(signal?: AbortSignal): Promise<WikitabCardData[]> {
  try {
    const batches = await mapWithConcurrency(
      [...ENWIKI_ACTIVE_DISCUSSION_PAGES],
      FETCH_CONCURRENCY,
      (page) => fetchNoticeboardDiscussions(page, signal),
      signal,
    )

    return mergeActiveDiscussions(batches).map(mapDiscussionToCard)
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error
    return []
  }
}
