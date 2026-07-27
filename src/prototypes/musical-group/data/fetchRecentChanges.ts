import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'
import { mapWithConcurrency } from '@/lib/mapWithConcurrency'

import { bookmarksKey } from './cacheKeys'
import { EN_WIKI_HOST, normalizeEnwikiTitle, wikiActionUrl } from './enwikiTitle'
import { formatEditSummaryDisplay } from './editSummaryDisplay'
import { getCachedRecentChangesPreview, setCachedRecentChangesPreview } from './homeTabCache'
import { predictGoodFaith, predictReferenceNeed, predictRevertRisk, predictTone } from './liftWing'
import type { HomeRecentChange, HomeRecentChangeFlag, HomeSavedItem } from './types'

/** How many saved pages to show in the home Activity preview. */
const MAX_RECENT_CHANGES = 2
/** Titles per batch revision metadata query. */
const REVISION_BATCH_SIZE = 50
/** Revisions fetched per saved page per Activity feed page. */
export const ACTIVITY_REVISIONS_PER_FETCH = 5
const TONE_THRESHOLD = 0.8
const REVERT_RISK_THRESHOLD = 0.7
/** Child-minus-parent reference-need increase that flags an edit. */
const REFERENCE_NEED_DELTA_THRESHOLD = 0.05
/** Edit Check addReference minimum net new visible text length. */
const UNSOURCED_ADDITION_MIN_CHARS = 50
/** Edit count below which a registered editor is treated as a newcomer. */
const NEW_EDITOR_MAX_EDITS = 10
const DIFF_TEXT_LIMIT = 2000

export interface LatestRevision {
  revid: number
  parentid: number
  user: string
  userid: number
  comment: string
  parsedComment: string
  anon: boolean
  timestamp: string
  reverted: boolean
}

export interface ActivityCandidate {
  item: HomeSavedItem
  revision: LatestRevision
}

type RevisionApiRow = {
  revid?: number
  parentid?: number
  user?: string
  userid?: number
  comment?: string
  parsedcomment?: string
  anon?: string
  timestamp?: string
  tags?: string[]
}

type RevisionPageRow = {
  title?: string
  missing?: string
  revisions?: RevisionApiRow[]
}

function titleKey(title: string): string {
  return normalizeEnwikiTitle(title).toLowerCase()
}

function parseRevisionRow(revision: RevisionApiRow): LatestRevision | null {
  if (!revision.revid) return null

  return {
    revid: revision.revid,
    parentid: revision.parentid ?? 0,
    user: revision.user ?? '',
    userid: revision.userid ?? 0,
    comment: revision.comment ?? '',
    parsedComment: revision.parsedcomment ?? '',
    anon: revision.anon !== undefined,
    timestamp: revision.timestamp ?? '',
    reverted: (revision.tags ?? []).includes('mw-reverted'),
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
  if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months === 1) return '1 month ago'
  return `${months} months ago`
}

export function formatEditMetaLabel(timestamp: string, user: string): string {
  const relative = formatRelativeTime(timestamp)
  const editor = user.trim() || 'Anonymous'
  return `${relative} by ${editor}`
}

/** Footer status for activity cards. */
export function formatEditStatusLabel(
  reverted: boolean,
  _isLatest: boolean,
): string {
  if (reverted) return 'Reverted'
  return ''
}

/** MediaWiki temporary accounts use a ~-prefixed auto-generated username. */
export function isTemporaryUser(user: string): boolean {
  return user.startsWith('~')
}

export interface PageActivityState {
  item: HomeSavedItem & { enwikiTitle: string }
  /** Oldest revid already queued; the next fetch starts before this id. */
  oldestRevid?: number
  exhausted: boolean
}

async function fetchLatestRevision(
  title: string,
  signal?: AbortSignal,
): Promise<LatestRevision | null> {
  const revisions = await fetchRevisionsForTitle(title, 1, undefined, signal)
  return revisions[0] ?? null
}

/**
 * Fetch up to `limit` revisions for one title. Pass `olderThanRevid` to page
 * backward through history (MediaWiki returns newest first).
 */
export async function fetchRevisionsForTitle(
  title: string,
  limit: number,
  olderThanRevid?: number,
  signal?: AbortSignal,
): Promise<LatestRevision[]> {
  const params: Record<string, string> = {
    action: 'query',
    prop: 'revisions',
    titles: title,
    rvprop: 'ids|timestamp|user|userid|comment|parsedcomment|tags|flags',
    rvlimit: String(limit),
  }
  if (olderThanRevid != null) {
    params.rvstartid = String(olderThanRevid)
    params.rvdir = 'older'
  }

  const response = await fetchWikimedia(wikiActionUrl(params), {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-activity'),
  })
  if (!response.ok) return []

  const json = (await response.json()) as {
    query?: { pages?: Record<string, RevisionPageRow> }
  }

  for (const page of Object.values(json.query?.pages ?? {})) {
    if (page.missing !== undefined || !page.title) continue
    return (page.revisions ?? [])
      .map((row) => parseRevisionRow(row))
      .filter((revision): revision is LatestRevision => revision !== null)
  }

  return []
}

/** Batch-fetch the latest revision metadata for up to 50 titles per API call. */
export async function fetchLatestRevisionsForTitles(
  titles: string[],
  signal?: AbortSignal,
): Promise<{ revisions: Map<string, LatestRevision>; lookupFailed: boolean }> {
  const revisions = new Map<string, LatestRevision>()
  if (!titles.length) return { revisions, lookupFailed: false }

  let anyOk = false
  let anyFailed = false

  for (let offset = 0; offset < titles.length; offset += REVISION_BATCH_SIZE) {
    const batch = titles.slice(offset, offset + REVISION_BATCH_SIZE)
    const url = wikiActionUrl({
      action: 'query',
      prop: 'revisions',
      titles: batch.join('|'),
      rvprop: 'ids|timestamp|user|userid|comment|parsedcomment|tags|flags',
      rvlimit: '1',
    })

    const response = await fetchWikimedia(url, {
      signal,
      headers: wikimediaApiFetchHeaders('musical-group-activity'),
    })
    if (!response.ok) {
      anyFailed = true
      continue
    }

    anyOk = true

    const json = (await response.json()) as {
      query?: { pages?: Record<string, RevisionPageRow> }
    }

    for (const page of Object.values(json.query?.pages ?? {})) {
      if (page.missing !== undefined || !page.title) continue
      const revision = parseRevisionRow(page.revisions?.[0] ?? {})
      if (!revision) continue
      revisions.set(titleKey(page.title), revision)
    }
  }

  return { revisions, lookupFailed: anyFailed && !anyOk }
}

export function initPageActivityStates(
  items: HomeSavedItem[],
): PageActivityState[] {
  return items
    .filter((item): item is HomeSavedItem & { enwikiTitle: string } => Boolean(item.enwikiTitle))
    .map((item) => ({ item, exhausted: false }))
}

/**
 * Fetch the next batch of revisions for each non-exhausted saved page, merge
 * into candidates sorted by edit timestamp descending.
 */
export async function fetchNextActivityCandidates(
  pageStates: PageActivityState[],
  seenRevids: Set<number>,
  signal?: AbortSignal,
  limit = ACTIVITY_REVISIONS_PER_FETCH,
): Promise<ActivityCandidate[]> {
  const activePages = pageStates.filter((state) => !state.exhausted)
  if (!activePages.length) return []

  const batches = await mapWithConcurrency(
    activePages,
    2,
    async (state) => {
      const revisions = await fetchRevisionsForTitle(
        state.item.enwikiTitle,
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

    state.oldestRevid = revisions[revisions.length - 1].revid
    if (revisions.length < limit) {
      state.exhausted = true
    }

    for (const revision of revisions) {
      if (seenRevids.has(revision.revid)) continue
      seenRevids.add(revision.revid)
      candidates.push({ item: state.item, revision })
    }
  }

  candidates.sort((a, b) => b.revision.timestamp.localeCompare(a.revision.timestamp))
  return candidates
}

async function fetchEditorEditCount(
  user: string,
  signal?: AbortSignal,
): Promise<number | undefined> {
  if (!user) return undefined

  const url = wikiActionUrl({
    action: 'query',
    list: 'users',
    ususers: user,
    usprop: 'editcount|registration',
  })

  const response = await fetchWikimedia(url, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-user-info'),
  })
  if (!response.ok) return undefined

  const json = (await response.json()) as {
    query?: { users?: { editcount?: number; missing?: string; invalid?: string }[] }
  }
  const info = json.query?.users?.[0]
  if (!info || info.missing !== undefined || info.invalid !== undefined) return undefined
  return typeof info.editcount === 'number' ? info.editcount : undefined
}

function collectText(nodes: NodeListOf<Element>): string {
  const parts: string[] = []
  for (const node of Array.from(nodes)) {
    const text = node.textContent?.trim()
    if (text) parts.push(text)
  }
  return parts.join(' ').slice(0, DIFF_TEXT_LIMIT)
}

function collectWikitext(nodes: NodeListOf<Element>): string {
  const parts: string[] = []
  for (const node of Array.from(nodes)) {
    const text = node.textContent?.trim()
    if (text) parts.push(text)
  }
  return parts.join('\n').slice(0, DIFF_TEXT_LIMIT)
}

/** Strip wikitext markup for a rough visible-character count. */
function visibleWikitextLength(wikitext: string): number {
  return wikitext
    .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/''+/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim().length
}

/** Edit Check–style rule: substantial net-new prose without a citation. */
function unsourcedNetAdditionNeedsReference(addedWikitext: string, removedWikitext: string): boolean {
  const trimmedAdded = addedWikitext.trim()
  if (!trimmedAdded) return false

  const netGrowth =
    visibleWikitextLength(trimmedAdded) - visibleWikitextLength(removedWikitext.trim())
  // Compare API emits whole changed lines as added; require real net-new text.
  if (netGrowth < UNSOURCED_ADDITION_MIN_CHARS) return false

  if (/<ref[\s>]/i.test(trimmedAdded)) return false
  if (/^\[\[(Category|File|Image|WP|Wikipedia):[^\]]+\]\]\s*$/i.test(trimmedAdded)) return false
  return true
}

export interface RevisionDiff {
  addedPlain: string
  removedPlain: string
  addedWikitext: string
  removedWikitext: string
}

async function fetchRevisionDiff(
  fromRev: number,
  toRev: number,
  signal?: AbortSignal,
): Promise<RevisionDiff> {
  const url = wikiActionUrl({
    action: 'compare',
    fromrev: String(fromRev),
    torev: String(toRev),
    prop: 'diff',
  })

  const response = await fetchWikimedia(url, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-compare'),
  })
  if (!response.ok) {
    return { addedPlain: '', removedPlain: '', addedWikitext: '', removedWikitext: '' }
  }

  const json = (await response.json()) as { compare?: { '*'?: string } }
  const html = json.compare?.['*']
  if (!html) {
    return { addedPlain: '', removedPlain: '', addedWikitext: '', removedWikitext: '' }
  }

  const doc = new DOMParser().parseFromString(`<table>${html}</table>`, 'text/html')
  return {
    addedPlain: collectText(doc.querySelectorAll('.diff-addedline')),
    removedPlain: collectText(doc.querySelectorAll('.diff-deletedline')),
    addedWikitext: collectWikitext(doc.querySelectorAll('.diff-addedline')),
    removedWikitext: collectWikitext(doc.querySelectorAll('.diff-deletedline')),
  }
}

function diffNetGrowth(diff: RevisionDiff): number {
  return (
    visibleWikitextLength(diff.addedWikitext) - visibleWikitextLength(diff.removedWikitext)
  )
}

async function needsReferenceFlag(
  revision: LatestRevision,
  diff: RevisionDiff | undefined,
  signal?: AbortSignal,
): Promise<boolean> {
  const netGrowth = diff ? diffNetGrowth(diff) : 0
  if (netGrowth < UNSOURCED_ADDITION_MIN_CHARS) return false

  if (revision.parentid) {
    const [childScore, parentScore] = await Promise.all([
      predictReferenceNeed(revision.revid, 'en', signal),
      predictReferenceNeed(revision.parentid, 'en', signal),
    ])
    if (
      childScore != null &&
      parentScore != null &&
      childScore - parentScore >= REFERENCE_NEED_DELTA_THRESHOLD
    ) {
      return true
    }
  }

  if (diff && unsourcedNetAdditionNeedsReference(diff.addedWikitext, diff.removedWikitext)) {
    return true
  }
  return false
}

async function thankableFlag(
  revision: LatestRevision,
  signal?: AbortSignal,
): Promise<HomeRecentChangeFlag> {
  const goodFaith = await predictGoodFaith(revision.revid, signal)
  if (goodFaith !== true) return 'none'

  const registered = !revision.anon && revision.userid > 0
  if (!registered || isTemporaryUser(revision.user)) return 'good-faith'

  const editCount = await fetchEditorEditCount(revision.user, signal)
  if (editCount === 1) return 'first-edit'
  if (editCount != null && editCount < NEW_EDITOR_MAX_EDITS) return 'new-editor'
  return 'good-faith'
}

async function classifyChange(
  revision: LatestRevision,
  title: string,
  signal?: AbortSignal,
): Promise<HomeRecentChangeFlag> {
  const diff = revision.parentid
    ? await fetchRevisionDiff(revision.parentid, revision.revid, signal)
    : undefined

  if (await needsReferenceFlag(revision, diff, signal)) return 'needs-reference'

  if (diff?.addedPlain.trim()) {
    const tone = await predictTone(
      title,
      diff.removedPlain || diff.addedPlain,
      diff.addedPlain,
      signal,
    )
    if (tone?.prediction && tone.probability >= TONE_THRESHOLD) return 'tone-issue'
  }

  const risk = await predictRevertRisk(revision.revid, signal)
  if (risk?.prediction && risk.probability >= REVERT_RISK_THRESHOLD) return 'high-revert-risk'

  const thankable = await thankableFlag(revision, signal)
  if (thankable !== 'none') return thankable

  return 'none'
}

/** Classify the latest edit on a saved page; optional pre-fetched revision skips the revision query. */
export async function fetchRecentChangeForItem(
  item: HomeSavedItem,
  signal?: AbortSignal,
  revision?: LatestRevision,
  latestRevidByTitle?: Map<string, number>,
): Promise<HomeRecentChange | null> {
  if (!item.enwikiTitle) return null

  const latest =
    revision ?? (await fetchLatestRevision(item.enwikiTitle, signal))
  if (!latest) return null

  const flag = await classifyChange(latest, item.enwikiTitle, signal)
  const summary = formatEditSummaryDisplay(latest.parsedComment, latest.comment)
  const wikiLatestRevid = latestRevidByTitle?.get(titleKey(item.enwikiTitle))
  const isLatest = revision
    ? wikiLatestRevid != null && latest.revid === wikiLatestRevid
    : true

  return {
    enwikiTitle: item.enwikiTitle,
    title: item.title,
    editSummary: summary,
    thumbnailUrl: item.thumbnailUrl,
    diffUrl: diffUrl(item.enwikiTitle, latest.revid),
    revid: latest.revid,
    flag,
    reverted: latest.reverted,
    isLatest,
    editedTimestamp: latest.timestamp,
    editedLabel: formatEditMetaLabel(latest.timestamp, latest.user),
  }
}

/** Latest classified edit on each saved page with an enwiki article, newest first. */
export async function fetchLatestRecentChanges(
  items: HomeSavedItem[],
  signal?: AbortSignal,
): Promise<{
  changes: HomeRecentChange[]
  itemIdsWithoutRevisions: string[]
  revisionLookupFailed: boolean
}> {
  const candidates = items.filter(
    (item): item is HomeSavedItem & { enwikiTitle: string } => Boolean(item.enwikiTitle),
  )
  if (!candidates.length) {
    return { changes: [], itemIdsWithoutRevisions: [], revisionLookupFailed: false }
  }

  const titles = candidates.map((item) => item.enwikiTitle)
  const { revisions: latestRevisions, lookupFailed: revisionLookupFailed } =
    await fetchLatestRevisionsForTitles(titles, signal)

  const unresolved = candidates.filter(
    (item) => !latestRevisions.has(titleKey(item.enwikiTitle)),
  )
  if (unresolved.length) {
    const fallback = await mapWithConcurrency(
      unresolved,
      3,
      async (item) => {
        const revision = await fetchLatestRevision(item.enwikiTitle, signal)
        if (!revision) return null
        return { key: titleKey(item.enwikiTitle), revision }
      },
      signal,
    )
    for (const entry of fallback) {
      if (entry) latestRevisions.set(entry.key, entry.revision)
    }
  }

  const latestRevidByTitle = new Map(
    [...latestRevisions.entries()].map(([key, revision]) => [key, revision.revid]),
  )

  const itemIdsWithoutRevisions = candidates
    .filter((item) => !latestRevisions.has(titleKey(item.enwikiTitle)))
    .map((item) => item.id)

  const changes = await mapWithConcurrency(
    candidates,
    3,
    (item) => {
      const revision = latestRevisions.get(titleKey(item.enwikiTitle))
      if (!revision) return Promise.resolve(null)
      return fetchRecentChangeForItem(item, signal, revision, latestRevidByTitle).catch((err) => {
        if ((err as Error).name === 'AbortError') throw err
        return null
      })
    },
    signal,
  )

  return {
    changes: changes
      .filter((change): change is HomeRecentChange => change !== null)
      .sort((a, b) => b.editedTimestamp.localeCompare(a.editedTimestamp)),
    itemIdsWithoutRevisions,
    revisionLookupFailed,
  }
}

/** Latest classified edits for the home Activity preview (newest first, capped). */
export async function fetchRecentChanges(
  items: HomeSavedItem[],
  signal?: AbortSignal,
): Promise<HomeRecentChange[]> {
  const dependencyKey = bookmarksKey()
  const cached = getCachedRecentChangesPreview(dependencyKey)
  if (cached) return cached

  const result = (await fetchLatestRecentChanges(items, signal)).changes.slice(
    0,
    MAX_RECENT_CHANGES,
  )
  if (result.length) {
    setCachedRecentChangesPreview(dependencyKey, result)
  }
  return result
}
