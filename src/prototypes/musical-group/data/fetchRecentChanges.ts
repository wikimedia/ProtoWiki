import { wikimediaApiFetchHeaders } from '@/config'

import { EN_WIKI_HOST, wikiActionUrl } from './enwikiTitle'
import { formatEditSummaryDisplay } from './editSummaryDisplay'
import { fetchWithTimeout } from './fetchWithTimeout'
import { predictGoodFaith, predictRevertRisk, predictTone } from './liftWing'
import type { HomeRecentChange, HomeRecentChangeFlag, HomeSavedItem } from './types'

/** How many saved pages to inspect for recent changes. */
const MAX_RECENT_CHANGES = 2
const TONE_THRESHOLD = 0.8
const REVERT_RISK_THRESHOLD = 0.7
/** Edit count below which a registered editor is treated as a newcomer. */
const NEW_EDITOR_MAX_EDITS = 10
const DIFF_TEXT_LIMIT = 2000

interface LatestRevision {
  revid: number
  parentid: number
  user: string
  userid: number
  comment: string
  parsedComment: string
  anon: boolean
}

function diffUrl(title: string, revid: number): string {
  const params = new URLSearchParams({
    title: title.replace(/ /g, '_'),
    diff: 'prev',
    oldid: String(revid),
  })
  return `https://${EN_WIKI_HOST}/w/index.php?${params.toString()}`
}

async function fetchLatestRevision(
  title: string,
  signal?: AbortSignal,
): Promise<LatestRevision | null> {
  const url = wikiActionUrl({
    action: 'query',
    prop: 'revisions',
    titles: title,
    rvprop: 'ids|timestamp|user|userid|comment|parsedcomment|tags|flags',
    rvlimit: '1',
  })

  const response = await fetchWithTimeout(url, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-recent-changes'),
  })
  if (!response.ok) return null

  const json = (await response.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          revisions?: {
            revid?: number
            parentid?: number
            user?: string
            userid?: number
            comment?: string
            parsedcomment?: string
            anon?: string
          }[]
        }
      >
    }
  }

  const page = Object.values(json.query?.pages ?? {})[0]
  const revision = page?.revisions?.[0]
  if (!revision?.revid) return null

  return {
    revid: revision.revid,
    parentid: revision.parentid ?? 0,
    user: revision.user ?? '',
    userid: revision.userid ?? 0,
    comment: revision.comment ?? '',
    parsedComment: revision.parsedcomment ?? '',
    anon: revision.anon !== undefined,
  }
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

  const response = await fetchWithTimeout(url, {
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

async function fetchDiffText(
  fromRev: number,
  toRev: number,
  signal?: AbortSignal,
): Promise<{ added: string; removed: string }> {
  const url = wikiActionUrl({
    action: 'compare',
    fromrev: String(fromRev),
    torev: String(toRev),
    prop: 'diff',
  })

  const response = await fetchWithTimeout(url, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-compare'),
  })
  if (!response.ok) return { added: '', removed: '' }

  const json = (await response.json()) as { compare?: { '*'?: string } }
  const html = json.compare?.['*']
  if (!html) return { added: '', removed: '' }

  const doc = new DOMParser().parseFromString(`<table>${html}</table>`, 'text/html')
  return {
    added: collectText(doc.querySelectorAll('.diff-addedline')),
    removed: collectText(doc.querySelectorAll('.diff-deletedline')),
  }
}

async function classifyChange(
  revision: LatestRevision,
  title: string,
  signal?: AbortSignal,
): Promise<HomeRecentChangeFlag> {
  const goodFaith = await predictGoodFaith(revision.revid, signal)

  if (goodFaith === true) {
    const registered = !revision.anon && revision.userid > 0
    if (!registered) return 'good-faith'

    const editCount = await fetchEditorEditCount(revision.user, signal)
    if (editCount === 1) return 'first-edit'
    if (editCount != null && editCount < NEW_EDITOR_MAX_EDITS) return 'new-editor'
    return 'good-faith'
  }

  // Otherwise: check tone, then revert risk.
  if (revision.parentid) {
    const diff = await fetchDiffText(revision.parentid, revision.revid, signal)
    if (diff.added.trim()) {
      const tone = await predictTone(title, diff.removed || diff.added, diff.added, signal)
      if (tone?.prediction && tone.probability >= TONE_THRESHOLD) return 'tone-issue'
    }
  }

  const risk = await predictRevertRisk(revision.revid, signal)
  if (risk?.prediction && risk.probability >= REVERT_RISK_THRESHOLD) return 'high-revert-risk'

  return 'none'
}

async function recentChangeForItem(
  item: HomeSavedItem,
  signal?: AbortSignal,
): Promise<HomeRecentChange | null> {
  if (!item.enwikiTitle) return null

  const revision = await fetchLatestRevision(item.enwikiTitle, signal)
  if (!revision) return null

  const flag = await classifyChange(revision, item.enwikiTitle, signal)
  const summary = formatEditSummaryDisplay(revision.parsedComment, revision.comment)

  return {
    enwikiTitle: item.enwikiTitle,
    title: item.title,
    editSummary: summary,
    thumbnailUrl: item.thumbnailUrl,
    diffUrl: diffUrl(item.enwikiTitle, revision.revid),
    flag,
  }
}

/** The most recent change to up to two saved pages, each classified for review. */
export async function fetchRecentChanges(
  items: HomeSavedItem[],
  signal?: AbortSignal,
): Promise<HomeRecentChange[]> {
  const candidates = items.filter((item) => item.enwikiTitle).slice(0, MAX_RECENT_CHANGES)
  const changes = await Promise.all(
    candidates.map((item) =>
      recentChangeForItem(item, signal).catch((err) => {
        if ((err as Error).name === 'AbortError') throw err
        return null
      }),
    ),
  )
  return changes.filter((change): change is HomeRecentChange => change !== null)
}
