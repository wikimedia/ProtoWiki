import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'
import { mapWithConcurrency } from '@/lib/mapWithConcurrency'

import {
  fetchWikitabSearchTopTitles,
  type WikitabSearchTopTitle,
} from './fetchWikitabSearchArticles'
import { EN_WIKI_HOST } from './wikitabHtml'

export { fetchWikitabSearchTopTitles, type WikitabSearchTopTitle }

/** Revisions fetched per page when refilling the merge queue. */
export const REVISIONS_PER_FETCH = 5
const THUMBNAIL_SIZE = 200
/** MediaWiki list=users batch size. */
const USERS_PER_FETCH = 50

export type EditorKind = 'bot' | 'temporary' | 'user' | 'anonymous'

export interface WikitabSearchActivityItem {
  pageid: number
  title: string
  editSummary: string
  thumbnailUrl?: string
  charsAdded?: number
  charsRemoved?: number
  diffUrl: string
  revid: number
  reverted: boolean
  isLatest: boolean
  editedLabel: string
  editedTimestamp: string
  editorKind: EditorKind
}

interface RevisionRow {
  revid: number
  parentid: number
  size: number
  user: string
  userid: number
  comment: string
  parsedComment: string
  timestamp: string
  reverted: boolean
  charsAdded?: number
  charsRemoved?: number
}

interface ActivityCandidate {
  pageid: number
  title: string
  revision: RevisionRow
}

export interface PageRevisionState {
  pageid: number
  title: string
  oldestRevid?: number
  exhausted: boolean
  revSizesById: Map<number, number>
}

type RevisionApiRow = {
  revid?: number
  parentid?: number
  size?: number
  user?: string
  userid?: number
  comment?: string
  parsedcomment?: string
  timestamp?: string
  tags?: string[]
}

type UserApiRow = {
  name?: string
  missing?: string
  groups?: string[]
}

type RevisionPageRow = {
  title?: string
  pageid?: number
  missing?: string
  revisions?: RevisionApiRow[]
}

type ThumbnailPageRow = {
  title?: string
  missing?: string
  thumbnail?: { source?: string }
}

function titleKey(title: string): string {
  return title.trim().replace(/_/g, ' ').replace(/\s+/g, ' ').toLowerCase()
}

function userKey(user: string): string {
  return user.trim()
}

function classifyEditor(userid: number, groups: string[] | undefined): EditorKind {
  if (userid === 0) return 'anonymous'
  if (groups?.includes('bot')) return 'bot'
  if (groups?.includes('temp')) return 'temporary'
  return 'user'
}

function normalizeThumbnailUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  return url.startsWith('//') ? `https:${url}` : url
}

function wikiActionUrl(params: Record<string, string>): string {
  const query = new URLSearchParams({
    format: 'json',
    origin: '*',
    ...params,
  })
  return `https://${EN_WIKI_HOST}/w/api.php?${query.toString()}`
}

function parseRevisionRow(revision: RevisionApiRow): RevisionRow | null {
  if (!revision.revid || typeof revision.size !== 'number') return null

  return {
    revid: revision.revid,
    parentid: revision.parentid ?? 0,
    size: revision.size,
    user: revision.user ?? '',
    userid: revision.userid ?? 0,
    comment: revision.comment ?? '',
    parsedComment: revision.parsedcomment ?? '',
    timestamp: revision.timestamp ?? '',
    reverted: (revision.tags ?? []).includes('mw-reverted'),
  }
}

function computeDiffSize(
  revision: Pick<RevisionRow, 'parentid' | 'size'>,
  revSizesById: Map<number, number>,
): Pick<RevisionRow, 'charsAdded' | 'charsRemoved'> | null {
  if (!revision.parentid) return null
  const parentSize = revSizesById.get(revision.parentid)
  if (parentSize == null) return null

  const delta = revision.size - parentSize
  if (delta > 0) return { charsAdded: delta, charsRemoved: 0 }
  if (delta < 0) return { charsAdded: 0, charsRemoved: -delta }
  return { charsAdded: 0, charsRemoved: 0 }
}

function attachDiffSizes(revisions: RevisionRow[], revSizesById: Map<number, number>): void {
  for (const revision of revisions) {
    revSizesById.set(revision.revid, revision.size)
  }

  for (const revision of revisions) {
    const diffSize = computeDiffSize(revision, revSizesById)
    if (!diffSize) continue
    revision.charsAdded = diffSize.charsAdded
    revision.charsRemoved = diffSize.charsRemoved
  }
}

function diffUrl(title: string, revid: number): string {
  const params = new URLSearchParams({
    title: title.replace(/ /g, '_'),
    diff: 'prev',
    oldid: String(revid),
  })
  return `https://${EN_WIKI_HOST}/w/index.php?${params.toString()}`
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
  if (minutes < 60) return minutes === 1 ? '1 min ago' : `${minutes} mins ago`
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months === 1) return '1 month ago'
  return `${months} months ago`
}

function formatEditMetaLabel(timestamp: string, user: string): string {
  const relative = formatRelativeTime(timestamp)
  const editor = user.trim() || 'Anonymous'
  return `${editor}, ${relative}`
}

function formatEditSummary(parsedComment: string, comment: string): string {
  const raw = parsedComment.trim() || comment.trim()
  if (!raw) return ''
  const doc = new DOMParser().parseFromString(raw, 'text/html')
  return (doc.body.textContent ?? raw).trim()
}

async function fetchRevisionsForTitle(
  title: string,
  limit: number,
  olderThanRevid: number | undefined,
  signal: AbortSignal | undefined,
): Promise<RevisionRow[]> {
  const params: Record<string, string> = {
    action: 'query',
    prop: 'revisions',
    titles: title,
    rvprop: 'ids|timestamp|user|userid|comment|parsedcomment|tags|size',
    rvlimit: String(limit),
  }
  if (olderThanRevid != null) {
    params.rvstartid = String(olderThanRevid)
    params.rvdir = 'older'
  }

  const response = await fetchWikimedia(wikiActionUrl(params), {
    signal,
    headers: wikimediaApiFetchHeaders('wikitab-search-activity'),
  })
  if (!response.ok) return []

  const json = (await response.json()) as {
    query?: { pages?: Record<string, RevisionPageRow> }
  }

  for (const page of Object.values(json.query?.pages ?? {})) {
    if (page.missing !== undefined || !page.title) continue
    return (page.revisions ?? [])
      .map((row) => parseRevisionRow(row))
      .filter((revision): revision is RevisionRow => revision !== null)
  }

  return []
}

/** rvlimit is single-page only — fetch the tip revision per title with low concurrency. */
async function fetchLatestRevisionsForTitles(
  titles: string[],
  signal: AbortSignal | undefined,
): Promise<Map<string, RevisionRow>> {
  const revisions = new Map<string, RevisionRow>()
  if (!titles.length) return revisions

  const results = await mapWithConcurrency(
    titles,
    2,
    async (title) => {
      const rows = await fetchRevisionsForTitle(title, 1, undefined, signal)
      return { title, revision: rows[0] ?? null }
    },
    signal,
  )

  for (const { title, revision } of results) {
    if (!revision) continue
    revisions.set(titleKey(title), revision)
  }

  return revisions
}

async function fetchPageThumbnails(
  titles: string[],
  signal: AbortSignal | undefined,
): Promise<Map<string, string>> {
  const thumbnails = new Map<string, string>()
  if (!titles.length) return thumbnails

  const response = await fetchWikimedia(
    wikiActionUrl({
      action: 'query',
      prop: 'pageimages',
      titles: titles.join('|'),
      piprop: 'thumbnail',
      pithumbsize: String(THUMBNAIL_SIZE),
    }),
    {
      signal,
      headers: wikimediaApiFetchHeaders('wikitab-search-activity'),
    },
  )
  if (!response.ok) return thumbnails

  const json = (await response.json()) as {
    query?: { pages?: Record<string, ThumbnailPageRow> }
  }

  for (const page of Object.values(json.query?.pages ?? {})) {
    if (page.missing !== undefined || !page.title) continue
    const url = normalizeThumbnailUrl(page.thumbnail?.source)
    if (url) thumbnails.set(titleKey(page.title), url)
  }

  return thumbnails
}

async function fetchEditorKindsForBatch(
  usernames: string[],
  signal: AbortSignal | undefined,
): Promise<Map<string, EditorKind>> {
  const kinds = new Map<string, EditorKind>()
  if (!usernames.length) return kinds

  const response = await fetchWikimedia(
    wikiActionUrl({
      action: 'query',
      list: 'users',
      ususers: usernames.join('|'),
      usprop: 'groups',
    }),
    {
      signal,
      headers: wikimediaApiFetchHeaders('wikitab-search-activity'),
    },
  )
  if (!response.ok) return kinds

  const json = (await response.json()) as {
    query?: { users?: UserApiRow[] }
  }

  for (const row of json.query?.users ?? []) {
    if (!row.name) continue
    const kind = row.missing !== undefined ? 'user' : classifyEditor(1, row.groups)
    kinds.set(userKey(row.name), kind)
  }

  return kinds
}

async function fetchEditorKinds(
  usernames: string[],
  signal: AbortSignal | undefined,
): Promise<Map<string, EditorKind>> {
  const unique = [...new Set(usernames.map(userKey).filter(Boolean))]
  const kinds = new Map<string, EditorKind>()
  if (!unique.length) return kinds

  for (let index = 0; index < unique.length; index += USERS_PER_FETCH) {
    const batch = unique.slice(index, index + USERS_PER_FETCH)
    const batchKinds = await fetchEditorKindsForBatch(batch, signal)
    for (const [name, kind] of batchKinds.entries()) {
      kinds.set(name, kind)
    }
  }

  return kinds
}

function mapCandidate(
  candidate: ActivityCandidate,
  latestRevidByTitle: Map<string, number>,
  thumbnailByTitle: Map<string, string>,
  editorKindByUser: Map<string, EditorKind>,
): WikitabSearchActivityItem {
  const key = titleKey(candidate.title)
  const wikiLatestRevid = latestRevidByTitle.get(key)
  const isLatest = wikiLatestRevid != null && candidate.revision.revid === wikiLatestRevid

  return {
    pageid: candidate.pageid,
    title: candidate.title,
    editSummary: formatEditSummary(
      candidate.revision.parsedComment,
      candidate.revision.comment,
    ),
    thumbnailUrl: thumbnailByTitle.get(key),
    charsAdded: candidate.revision.charsAdded,
    charsRemoved: candidate.revision.charsRemoved,
    diffUrl: diffUrl(candidate.title, candidate.revision.revid),
    revid: candidate.revision.revid,
    reverted: candidate.revision.reverted,
    isLatest,
    editedLabel: formatEditMetaLabel(candidate.revision.timestamp, candidate.revision.user),
    editedTimestamp: candidate.revision.timestamp,
    editorKind:
      editorKindByUser.get(userKey(candidate.revision.user)) ??
      classifyEditor(candidate.revision.userid, undefined),
  }
}

async function fetchNextActivityCandidates(
  pageStates: PageRevisionState[],
  seenRevids: Set<number>,
  signal: AbortSignal | undefined,
  limit = REVISIONS_PER_FETCH,
): Promise<ActivityCandidate[]> {
  const activePages = pageStates.filter((state) => !state.exhausted)
  if (!activePages.length) return []

  const batches = await mapWithConcurrency(
    activePages,
    2,
    async (state) => {
      const revisions = await fetchRevisionsForTitle(
        state.title,
        limit,
        state.oldestRevid,
        signal,
      )
      return { state, revisions }
    },
    signal,
  )

  const candidates: ActivityCandidate[] = []

  for (const { state, revisions } of batches) {
    if (!revisions.length) {
      state.exhausted = true
      continue
    }

    attachDiffSizes(revisions, state.revSizesById)

    state.oldestRevid = revisions[revisions.length - 1].revid
    if (revisions.length < limit) {
      state.exhausted = true
    }

    for (const revision of revisions) {
      if (seenRevids.has(revision.revid)) continue
      seenRevids.add(revision.revid)
      candidates.push({
        pageid: state.pageid,
        title: state.title,
        revision,
      })
    }
  }

  candidates.sort((a, b) => b.revision.timestamp.localeCompare(a.revision.timestamp))
  return candidates
}

/** Stateful feed: merged chronological edits across the top search-result pages. */
export class WikitabSearchActivityFeed {
  private readonly pageStates: PageRevisionState[]
  private readonly queue: ActivityCandidate[] = []
  private readonly seenRevids = new Set<number>()
  private latestRevidByTitle = new Map<string, number>()
  private thumbnailByTitle = new Map<string, string>()
  private readonly editorKindByUser = new Map<string, EditorKind>()

  constructor(titles: WikitabSearchTopTitle[]) {
    this.pageStates = titles.map((title) => ({
      pageid: title.pageid,
      title: title.title,
      exhausted: false,
      revSizesById: new Map<number, number>(),
    }))

    for (const title of titles) {
      const url = normalizeThumbnailUrl(title.thumbnailUrl)
      if (url) this.thumbnailByTitle.set(titleKey(title.title), url)
    }
  }

  get hasMore(): boolean {
    return this.queue.length > 0 || this.pageStates.some((state) => !state.exhausted)
  }

  async initialize(signal: AbortSignal): Promise<void> {
    const titles = this.pageStates.map((state) => state.title)
    const missingThumbnails = titles.filter((title) => !this.thumbnailByTitle.has(titleKey(title)))

    const [latestRevisions, fetchedThumbnails] = await Promise.all([
      fetchLatestRevisionsForTitles(titles, signal),
      fetchPageThumbnails(missingThumbnails, signal),
    ])

    this.latestRevidByTitle = new Map(
      [...latestRevisions.entries()].map(([key, revision]) => [key, revision.revid]),
    )
    for (const [key, url] of fetchedThumbnails.entries()) {
      this.thumbnailByTitle.set(key, url)
    }

    await this.refillQueue(signal)
  }

  async takeNext(signal: AbortSignal): Promise<WikitabSearchActivityItem | null> {
    if (!this.queue.length) {
      await this.refillQueue(signal)
    }

    const candidate = this.queue.shift()
    if (!candidate) return null

    return mapCandidate(
      candidate,
      this.latestRevidByTitle,
      this.thumbnailByTitle,
      this.editorKindByUser,
    )
  }

  private async ensureEditorKinds(
    candidates: ActivityCandidate[],
    signal: AbortSignal,
  ): Promise<void> {
    const unknown: string[] = []

    for (const candidate of candidates) {
      const { user, userid } = candidate.revision
      const key = userKey(user)
      if (this.editorKindByUser.has(key)) continue

      if (userid === 0) {
        this.editorKindByUser.set(key, 'anonymous')
        continue
      }

      unknown.push(user)
    }

    if (!unknown.length) return

    const fetched = await fetchEditorKinds(unknown, signal)
    for (const [name, kind] of fetched.entries()) {
      this.editorKindByUser.set(name, kind)
    }

    for (const user of unknown) {
      const key = userKey(user)
      if (!this.editorKindByUser.has(key)) {
        this.editorKindByUser.set(key, 'user')
      }
    }
  }

  private async refillQueue(signal: AbortSignal): Promise<void> {
    const fresh = await fetchNextActivityCandidates(
      this.pageStates,
      this.seenRevids,
      signal,
    )
    if (!fresh.length) return

    await this.ensureEditorKinds(fresh, signal)
    this.queue.push(...fresh)
  }
}

export async function createWikitabSearchActivityFeed(
  query: string,
  options: {
    signal?: AbortSignal
    knownTitles?: WikitabSearchTopTitle[]
  } = {},
): Promise<WikitabSearchActivityFeed | null> {
  const titles =
    options.knownTitles?.length
      ? options.knownTitles.slice(0, 6)
      : await fetchWikitabSearchTopTitles(query, { signal: options.signal, limit: 6 })

  if (!titles.length) return null

  const feed = new WikitabSearchActivityFeed(titles)
  await feed.initialize(options.signal)
  return feed
}
