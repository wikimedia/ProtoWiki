/**
 * Active discussions: busy threads on English Wikipedia's community
 * noticeboards (the help desk and the village pumps), from DiscussionTools.
 */

import { wikimediaApiFetchHeaders } from '@/config'

import { readDayCache, utcDayKey, writeDayCache } from './homeCache'
import { formatAgo } from './relativeTime'

const HOST = 'en.wikipedia.org'

/** enwiki's noticeboards for the Personal dashboard (`wgPersonalDashboardActiveDiscussionsPages`, T420785). */
const NOTICEBOARDS: readonly string[] = [
  'Wikipedia:Help desk',
  'Wikipedia:Village pump (miscellaneous)',
  'Wikipedia:Village pump (technical)',
  'Wikipedia:Village pump (idea lab)',
  'Wikipedia:Village pump (policy)',
  'Wikipedia:Village pump (proposals)',
]

const MAX_DISCUSSIONS = 20
/** Newest threads kept from every board, so the busiest one doesn't fill the list. */
const PER_BOARD_MIN = 2
const CACHE_SLOT = 'active-discussions'
/** Discussions move within the hour, so the day's list is refetched after one. */
const CACHE_MAX_AGE_MS = 60 * 60_000

/** One thread, as a discussion card shows it. */
export interface DiscussionCard {
  key: string
  title: string
  /** The noticeboard, without `Wikipedia:`. */
  board: string
  /** The thread on Wikipedia. */
  href: string
  /** "4 comments". */
  comments: string
  /** When the latest reply came, e.g. "3h ago". */
  ago: string
}

interface Thread {
  id: string
  title: string
  board: string
  comments: number
  latestReply: string
}

interface ApiThread {
  id: string
  headingLevel?: number | null
  html?: string
  commentCount?: number
  authorCount?: number
  latestReplyTimestamp?: string | null
}

/** A board's live threads: top-level sections where more than one person has spoken. */
async function fetchThreads(board: string, signal: AbortSignal): Promise<Thread[]> {
  const search = new URLSearchParams({
    action: 'discussiontoolspageinfo',
    page: board,
    prop: 'threaditemshtml',
    threaditemsflags: 'noreplies|excludesignatures|activity',
    format: 'json',
    formatversion: '2',
    origin: '*',
  })
  const response = await fetch(`https://${HOST}/w/api.php?${search.toString()}`, {
    signal,
    headers: wikimediaApiFetchHeaders('home-active-discussions'),
  })
  if (!response.ok) throw new Error(`Failed to load discussions (HTTP ${response.status}).`)
  const data = (await response.json()) as {
    discussiontoolspageinfo?: { threaditemshtml?: ApiThread[] }
  }

  return (data.discussiontoolspageinfo?.threaditemshtml ?? []).flatMap((item) => {
    // Subsections (h3…) repeat their parent's activity, so only whole threads count.
    if (item.headingLevel !== 2 || (item.authorCount ?? 0) < 2 || !item.latestReplyTimestamp) {
      return []
    }
    const title = new DOMParser().parseFromString(item.html ?? '', 'text/html').body.textContent
    if (!title?.trim()) return []
    return [
      {
        id: item.id,
        title: title.trim(),
        board,
        comments: item.commentCount ?? 0,
        latestReply: item.latestReplyTimestamp,
      },
    ]
  })
}

const byLatestReply = (a: Thread, b: Thread) => b.latestReply.localeCompare(a.latestReply)

/** The most recently active threads, with each board's newest few guaranteed a place. */
function mergeThreads(boards: Thread[][]): Thread[] {
  const sorted = boards.map((threads) => [...threads].sort(byLatestReply))
  const guaranteed = sorted.flatMap((threads) => threads.slice(0, PER_BOARD_MIN))
  const rest = sorted.flatMap((threads) => threads.slice(PER_BOARD_MIN)).sort(byLatestReply)
  return [...guaranteed, ...rest.slice(0, Math.max(0, MAX_DISCUSSIONS - guaranteed.length))].sort(
    byLatestReply,
  )
}

function toCard(thread: Thread): DiscussionCard {
  const url = `https://${HOST}/wiki/${encodeURI(thread.board.replace(/ /g, '_'))}`
  return {
    key: thread.id,
    title: thread.title,
    board: thread.board.replace(/^Wikipedia:/, ''),
    href: `${url}#${encodeURIComponent(thread.id)}`,
    comments: `${thread.comments} ${thread.comments === 1 ? 'comment' : 'comments'}`,
    ago: formatAgo(Date.parse(thread.latestReply)),
  }
}

/**
 * Busy threads, most recent reply first. Boards are read one at a time; one
 * failing only shortens the list, all of them failing is an error. The same for
 * every reader.
 */
export async function loadActiveDiscussions(signal: AbortSignal): Promise<DiscussionCard[]> {
  const day = utcDayKey()
  // Threads are cached rather than cards, so "3h ago" is worked out fresh each load.
  const cached = readDayCache<Thread>(CACHE_SLOT, day, CACHE_MAX_AGE_MS)
  if (cached) return cached.map(toCard)

  const results: (Thread[] | null)[] = []
  for (const page of NOTICEBOARDS) {
    results.push(
      await fetchThreads(page, signal).catch((error: unknown) => {
        if (signal.aborted) throw error
        return null
      }),
    )
  }
  if (results.every((threads) => threads === null)) {
    throw new Error("Couldn't reach any noticeboard")
  }

  const threads = mergeThreads(results.map((board) => board ?? []))
  writeDayCache(CACHE_SLOT, day, threads)
  return threads.map(toCard)
}
