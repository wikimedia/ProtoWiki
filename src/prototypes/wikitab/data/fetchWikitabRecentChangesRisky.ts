import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'

import {
  classifyEditor,
  fetchEditorKinds,
  formatWikitabEditRelativeTime,
  formatWikitabRevisionComment,
  wikitabRevisionDiffUrl,
  wikitabRevisionThankUrl,
  type EditorKind,
  type WikitabSearchActivityItem,
} from './fetchWikitabSearchActivity'
import { fetchWikitabPageSummaryThumbnails } from './fetchWikitabPageSummary'
import { articleTitleKey, articleUrl, EN_WIKI_HOST } from './wikitabHtml'

const RC_LIMIT = 50

type RecentChangeRow = {
  type?: string
  title?: string
  pageid?: number
  revid?: number
  user?: string
  userid?: number
  timestamp?: string
  comment?: string
  tags?: string[]
  oldlen?: number
  newlen?: number
}

function wikiActionUrl(params: Record<string, string>): string {
  const query = new URLSearchParams({
    format: 'json',
    origin: '*',
    ...params,
  })
  return `https://${EN_WIKI_HOST}/w/api.php?${query.toString()}`
}

function userKey(user: string): string {
  return user.trim()
}

function editorDisplayName(user: string): string {
  return user.trim() || 'Anonymous'
}

function editorUrl(user: string, userid: number): string {
  const name = user.trim()
  if (!name) {
    return `https://${EN_WIKI_HOST}/wiki/Special:Contributions`
  }

  const encoded = encodeURIComponent(name.replace(/ /g, '_'))
  if (userid === 0) {
    return `https://${EN_WIKI_HOST}/wiki/Special:Contributions/${encoded}`
  }

  return `https://${EN_WIKI_HOST}/wiki/User:${encoded}`
}

function mapRecentChangeRow(row: RecentChangeRow): WikitabSearchActivityItem | null {
  if (!row.pageid || !row.title || !row.revid || !row.timestamp) return null

  const userid = row.userid ?? 0
  const user = row.user ?? ''
  const oldlen = row.oldlen ?? 0
  const newlen = row.newlen ?? 0
  const delta = newlen - oldlen

  return {
    pageid: row.pageid,
    articleTitle: row.title,
    editSummary: formatWikitabRevisionComment(row.comment ?? '', row.user ?? ''),
    delta: Number.isFinite(delta) ? delta : undefined,
    articleUrl: articleUrl(row.title),
    diffUrl: wikitabRevisionDiffUrl(row.title, row.revid),
    thankUrl: wikitabRevisionThankUrl(row.revid),
    revisionId: row.revid,
    reverted: (row.tags ?? []).includes('mw-reverted'),
    needsReview: true,
    isLatestRevision: true,
    editorName: editorDisplayName(user),
    editorUrl: editorUrl(user, userid),
    editedRelative: formatWikitabEditRelativeTime(row.timestamp),
    editedTimestamp: row.timestamp,
    editorKind: classifyEditor(userid, undefined),
  }
}

async function fetchRecentChangesPage(
  rccontinue: string | undefined,
  signal: AbortSignal,
): Promise<{ rows: RecentChangeRow[]; rccontinue?: string }> {
  const params: Record<string, string> = {
    action: 'query',
    list: 'recentchanges',
    rcnamespace: '0',
    rctype: 'edit|new',
    rctoponly: '1',
    /** Server-side ORES damaging filter; band = API user `rcOresDamagingPref`. */
    rcshow: 'oresreview|!bot|!minor',
    rcprop: 'title|timestamp|ids|user|userid|comment|sizes|tags',
    rclimit: String(RC_LIMIT),
  }
  if (rccontinue) params.rccontinue = rccontinue

  const response = await fetchWikimedia(wikiActionUrl(params), {
    signal,
    headers: wikimediaApiFetchHeaders('wikitab-review-changes-rc'),
  })
  if (!response.ok) return { rows: [] }

  const json = (await response.json()) as {
    continue?: { rccontinue?: string }
    query?: { recentchanges?: RecentChangeRow[] }
  }

  return {
    rows: json.query?.recentchanges ?? [],
    rccontinue: json.continue?.rccontinue,
  }
}

/** Main-namespace Recent changes with `rcshow=oresreview` (ORES damaging in SQL). */
export class RecentChangesHighRiskFeed {
  private readonly seenRevids = new Set<number>()
  private readonly queue: WikitabSearchActivityItem[] = []
  private rccontinue: string | undefined
  private exhausted = false
  private readonly thumbnailByTitle = new Map<string, string>()
  private readonly editorKindByUser = new Map<string, EditorKind>()
  private readonly editorByRevid = new Map<number, { user: string; userid: number }>()

  constructor(options: { seenRevids?: Iterable<number> } = {}) {
    for (const revid of options.seenRevids ?? []) {
      this.seenRevids.add(revid)
    }
  }

  hasPending(): boolean {
    return this.queue.length > 0 || !this.exhausted
  }

  async start(signal: AbortSignal): Promise<void> {
    await this.refillQueue(signal)
  }

  async prefetchMetadata(signal: AbortSignal): Promise<Map<string, string>> {
    const titles = [...new Set(this.queue.map((item) => item.articleTitle))]
    const missing = titles.filter((title) => !this.thumbnailByTitle.has(articleTitleKey(title)))
    if (!missing.length) return new Map()

    const fetched = await fetchWikitabPageSummaryThumbnails(
      missing,
      signal,
      'wikitab-review-changes-rc-thumbnail',
    )
    for (const [key, url] of fetched.entries()) {
      this.thumbnailByTitle.set(key, url)
    }
    for (const item of this.queue) {
      const url = this.thumbnailByTitle.get(articleTitleKey(item.articleTitle))
      if (url) item.thumbnailUrl = url
    }
    return fetched
  }

  async takeNext(signal: AbortSignal): Promise<WikitabSearchActivityItem | null> {
    if (!this.queue.length) {
      await this.refillQueue(signal)
    }

    const item = this.queue.shift()
    if (!item) return null

    const key = articleTitleKey(item.articleTitle)
    const thumb = this.thumbnailByTitle.get(key)
    if (thumb) item.thumbnailUrl = thumb

    const { user, userid } = this.editorByRevid.get(item.revisionId) ?? {
      user: item.editorName,
      userid: 0,
    }
    item.editorKind =
      this.editorKindByUser.get(userKey(user)) ?? classifyEditor(userid, undefined)

    return item
  }

  isEditorKindKnown(item: WikitabSearchActivityItem): boolean {
    const editor = this.editorByRevid.get(item.revisionId)
    if (!editor || editor.userid === 0) return true
    return this.editorKindByUser.has(userKey(editor.user))
  }

  async resolveEditorKind(
    item: WikitabSearchActivityItem,
    signal: AbortSignal,
  ): Promise<EditorKind> {
    const editor = this.editorByRevid.get(item.revisionId)
    if (!editor) return item.editorKind

    const key = userKey(editor.user)
    if (this.editorKindByUser.has(key)) {
      return this.editorKindByUser.get(key)!
    }

    if (editor.userid === 0) {
      this.editorKindByUser.set(key, 'anonymous')
      return 'anonymous'
    }

    const fetched = await fetchEditorKinds([editor.user], signal)
    const kind = fetched.get(key) ?? 'user'
    this.editorKindByUser.set(key, kind)
    return kind
  }

  isLatestRevision(_item: WikitabSearchActivityItem): boolean | undefined {
    return true
  }

  private enqueueRows(rows: RecentChangeRow[]): void {
    for (const row of rows) {
      if (!row.revid || this.seenRevids.has(row.revid)) continue
      this.seenRevids.add(row.revid)

      const item = mapRecentChangeRow(row)
      if (!item) continue

      this.editorByRevid.set(item.revisionId, {
        user: row.user ?? '',
        userid: row.userid ?? 0,
      })
      this.queue.push(item)
    }
  }

  private async refillQueue(signal: AbortSignal): Promise<void> {
    while (!this.exhausted && this.queue.length === 0) {
      const { rows, rccontinue } = await fetchRecentChangesPage(this.rccontinue, signal)
      this.rccontinue = rccontinue
      if (!rows.length) {
        this.exhausted = true
        return
      }
      if (!rccontinue) this.exhausted = true

      this.enqueueRows(rows)
    }
  }
}
