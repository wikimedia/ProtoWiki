import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'
import { mapWithConcurrency } from '@/lib/mapWithConcurrency'
import type { WikitabCardData } from '../sections'
import {
  activeDiscussionCategoryLabel,
  articleTitleFromTalkPage,
  talkPageTitleFromArticle,
} from './activeDiscussionLabels'
import { pickSavedArticleSeeds } from './pickSavedArticleSeeds'
import {
  uniqueArticleSeedsFromSavedItems,
  type WikitabSavedArticleSeed,
} from './savedCardHelpers'
import { feedDiscussionPayloadToCardData } from './wikitabCardPayloadMappers'
import type { WikitabFeedDiscussionCardPayload } from './wikitabCardPayloadTypes'
import type { WikitabSavedItem } from './wikitabSavedItems'
import { WIKI_HOST, articleUrl } from './wikitabHtml'
import { WIKITAB_LANGUAGE } from './wikitabLanguage'
import { resolveSeedsForWiki } from './resolveSeedsForWiki'
import { seedArticle } from './wikitabSeedArticle'

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
/** How many saved-article talk pages to open per fetch / load-more batch. */
export const ACTIVE_DISCUSSIONS_SEED_BATCH = 6

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

export type WikitabDiscussionSource = 'noticeboard' | 'article'

interface ActiveDiscussion {
  key: string
  title: string
  /** Noticeboard page or `Talk:Article` title. */
  sourcePage: string
  source: WikitabDiscussionSource
  commentCount: number
  latestReplyTimestamp: string
  threadId: string
}

export interface ActiveDiscussionsFeedOptions {
  showNoticeboards: boolean
  showSavedTalk: boolean
  savedItems: readonly WikitabSavedItem[]
  day: string
  /**
   * Saved-talk seed window — `[offset, offset + limit)`. Defaults to the first
   * `ACTIVE_DISCUSSIONS_SEED_BATCH` seeds. Noticeboards ignore this (always full).
   */
  seedOffset?: number
  seedLimit?: number
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
  return `https://${WIKI_HOST}/w/api.php?${params.toString()}`
}

function discussionPageUrl(sourcePage: string, fragment?: string): string {
  const base = articleUrl(sourcePage)
  if (!fragment) return base
  return `${base}#${fragment}`
}

function stripHtml(html: string): string {
  if (!html?.trim()) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent?.trim() ?? ''
}

function mapThreadToDiscussion(
  item: ThreadItemHtml,
  sourcePage: string,
  source: WikitabDiscussionSource,
): ActiveDiscussion | null {
  if (item.headingLevel == null) return null
  if (!item.latestReplyTimestamp || !item.latestReply?.id || !item.id) return null

  const title = stripHtml(item.html ?? '')
  if (!title) return null

  return {
    key: item.latestReply.id,
    title,
    sourcePage,
    source,
    commentCount: item.commentCount ?? 0,
    latestReplyTimestamp: item.latestReplyTimestamp,
    threadId: item.id,
  }
}

function discussionToPayload(discussion: ActiveDiscussion): WikitabFeedDiscussionCardPayload {
  const category = activeDiscussionCategoryLabel(discussion.sourcePage)
  // Talk pages: article title first, thread topic as description.
  if (discussion.source === 'article') {
    return {
      key: discussion.key,
      url: discussionPageUrl(discussion.sourcePage, discussion.threadId),
      title: category,
      noticeboardTitle: discussion.title,
      commentCount: discussion.commentCount,
      latestReplyTimestamp: discussion.latestReplyTimestamp,
    }
  }

  return {
    key: discussion.key,
    url: discussionPageUrl(discussion.sourcePage, discussion.threadId),
    title: discussion.title,
    noticeboardTitle: category,
    commentCount: discussion.commentCount,
    latestReplyTimestamp: discussion.latestReplyTimestamp,
  }
}

function mapDiscussionToCard(discussion: ActiveDiscussion): WikitabCardData {
  const card: WikitabCardData = {
    ...feedDiscussionPayloadToCardData(discussionToPayload(discussion)),
    discussionSource: discussion.source,
    latestReplyTimestamp: discussion.latestReplyTimestamp,
  }

  if (discussion.source === 'article') {
    const articleTitle = articleTitleFromTalkPage(discussion.sourcePage)
    const seed = seedArticle(articleTitle ?? undefined, 'talk-page')
    if (seed) card.seedArticle = seed
  }

  return card
}

export interface ActiveDiscussionsFeedPools {
  noticeboards: WikitabCardData[]
  articles: WikitabCardData[]
}

const EMPTY_POOLS: ActiveDiscussionsFeedPools = {
  noticeboards: [],
  articles: [],
}

/** Newest-first merge of both source card lists (All tab). Uncapped. */
export function mergeActiveDiscussionCardLists(
  noticeboards: readonly WikitabCardData[],
  articles: readonly WikitabCardData[],
): WikitabCardData[] {
  const seen = new Set<string>()
  const merged: WikitabCardData[] = []

  const sorted = [...noticeboards, ...articles].sort((a, b) =>
    (b.latestReplyTimestamp ?? '').localeCompare(a.latestReplyTimestamp ?? ''),
  )

  for (const card of sorted) {
    if (seen.has(card.key)) continue
    seen.add(card.key)
    merged.push(card)
  }

  return merged
}

/** Newest-first union of card lists (dedupe by key). */
export function mergeDiscussionCardsChronologically(
  ...lists: readonly (readonly WikitabCardData[])[]
): WikitabCardData[] {
  const seen = new Set<string>()
  const merged: WikitabCardData[] = []
  for (const list of lists) {
    for (const card of list) {
      if (seen.has(card.key)) continue
      seen.add(card.key)
      merged.push(card)
    }
  }
  return merged.sort((a, b) =>
    (b.latestReplyTimestamp ?? '').localeCompare(a.latestReplyTimestamp ?? ''),
  )
}

/** Deterministic daily shuffle of all unique article seeds (same salt as the feed). */
export function shuffledActiveDiscussionArticleSeeds(
  savedItems: readonly WikitabSavedItem[],
  day: string,
): WikitabSavedArticleSeed[] {
  const seeds = uniqueArticleSeedsFromSavedItems(savedItems)
  return pickSavedArticleSeeds(seeds, day, seeds.length, 'active-discussions')
}

async function fetchPageDiscussions(
  page: string,
  source: WikitabDiscussionSource,
  signal?: AbortSignal,
): Promise<ActiveDiscussion[]> {
  try {
    const response = await fetchWikimedia(discussionToolsUrl(page), {
      signal,
      headers: wikimediaApiFetchHeaders('wikitab-discussions'),
    })
    if (!response.ok) return []

    const json = (await response.json()) as {
      discussiontoolspageinfo?: { threaditemshtml?: ThreadItemHtml[] }
    }

    const items = json.discussiontoolspageinfo?.threaditemshtml ?? []
    return items
      .map((item) => mapThreadToDiscussion(item, page, source))
      .filter((item): item is ActiveDiscussion => item !== null)
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error
    return []
  }
}

function sortByLatestReply(items: ActiveDiscussion[]): ActiveDiscussion[] {
  return [...items].sort((a, b) => b.latestReplyTimestamp.localeCompare(a.latestReplyTimestamp))
}

/** Noticeboard batches — at least two per board, then fill by recency. */
function mergeNoticeboardDiscussions(batches: ActiveDiscussion[][]): ActiveDiscussion[] {
  const sortedBatches = batches.map((batch) => sortByLatestReply(batch))

  const guaranteed = sortedBatches.flatMap((batch) => batch.slice(0, PER_NOTICEBOARD_MIN))
  const guaranteedKeys = new Set(guaranteed.map((d) => d.key))

  const remainder = sortedBatches
    .flat()
    .filter((d) => !guaranteedKeys.has(d.key))
    .sort((a, b) => b.latestReplyTimestamp.localeCompare(a.latestReplyTimestamp))

  return sortByLatestReply([...guaranteed, ...remainder])
}

async function fetchNoticeboardSource(signal?: AbortSignal): Promise<ActiveDiscussion[]> {
  const batches = await mapWithConcurrency(
    [...ENWIKI_ACTIVE_DISCUSSION_PAGES],
    FETCH_CONCURRENCY,
    (page) => fetchPageDiscussions(page, 'noticeboard', signal),
    signal,
  )
  return mergeNoticeboardDiscussions(batches)
}

async function fetchSavedTalkForSeeds(
  seeds: readonly WikitabSavedArticleSeed[],
  signal?: AbortSignal,
): Promise<ActiveDiscussion[]> {
  if (!seeds.length) return []

  // Seeds saved on another wiki are swapped for this wiki's article (or dropped).
  const resolved = await resolveSeedsForWiki(seeds, WIKITAB_LANGUAGE, signal)
  const talkPages = resolved.map((seed) => talkPageTitleFromArticle(seed.title))
  const batches = await mapWithConcurrency(
    talkPages,
    FETCH_CONCURRENCY,
    (page) => fetchPageDiscussions(page, 'article', signal),
    signal,
  )

  return sortByLatestReply(batches.flat())
}

/**
 * Active discussions from noticeboards and/or saved-article talk pages.
 * Returns full per-source pools (newest-first; noticeboards keep per-board
 * diversity). Saved-talk seeds are windowed via `seedOffset` / `seedLimit`.
 * Returns `null` when both sources are off (caller shows the enable panel).
 */
export async function fetchActiveDiscussionsFeed(
  options: ActiveDiscussionsFeedOptions,
  signal?: AbortSignal,
): Promise<ActiveDiscussionsFeedPools | null> {
  const { showNoticeboards, showSavedTalk, savedItems, day } = options
  const seedOffset = Math.max(0, options.seedOffset ?? 0)
  const seedLimit = Math.max(0, options.seedLimit ?? ACTIVE_DISCUSSIONS_SEED_BATCH)

  if (!showNoticeboards && !showSavedTalk) return null

  try {
    const shuffled = showSavedTalk
      ? shuffledActiveDiscussionArticleSeeds(savedItems, day)
      : []
    const seedWindow = shuffled.slice(seedOffset, seedOffset + seedLimit)

    const [noticeboards, savedTalk] = await Promise.all([
      showNoticeboards ? fetchNoticeboardSource(signal) : Promise.resolve([] as ActiveDiscussion[]),
      showSavedTalk
        ? fetchSavedTalkForSeeds(seedWindow, signal)
        : Promise.resolve([] as ActiveDiscussion[]),
    ])

    return {
      noticeboards: showNoticeboards ? noticeboards.map(mapDiscussionToCard) : [],
      articles: showSavedTalk ? savedTalk.map(mapDiscussionToCard) : [],
    }
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error
    return { ...EMPTY_POOLS }
  }
}

/** Fetch the next saved-talk seed window only (for Show more). */
export async function fetchActiveDiscussionsArticleBatch(
  options: {
    savedItems: readonly WikitabSavedItem[]
    day: string
    seedOffset: number
    seedLimit?: number
  },
  signal?: AbortSignal,
): Promise<WikitabCardData[]> {
  const seedLimit = Math.max(0, options.seedLimit ?? ACTIVE_DISCUSSIONS_SEED_BATCH)
  const shuffled = shuffledActiveDiscussionArticleSeeds(options.savedItems, options.day)
  const seedWindow = shuffled.slice(options.seedOffset, options.seedOffset + seedLimit)
  if (!seedWindow.length) return []

  try {
    const savedTalk = await fetchSavedTalkForSeeds(seedWindow, signal)
    return savedTalk.map(mapDiscussionToCard)
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error
    return []
  }
}

/** @deprecated Prefer `fetchActiveDiscussionsFeed` with explicit source options. */
export async function fetchActiveDiscussions(signal?: AbortSignal): Promise<WikitabCardData[]> {
  const pools = await fetchActiveDiscussionsFeed(
    {
      showNoticeboards: true,
      showSavedTalk: false,
      savedItems: [],
      day: new Date().toISOString().slice(0, 10),
    },
    signal,
  )
  return pools?.noticeboards ?? []
}
