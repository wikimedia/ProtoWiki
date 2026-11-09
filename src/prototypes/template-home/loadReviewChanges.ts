/**
 * Review changes: the latest edit to each of the reader's pages, flagged for
 * review ("High revert risk", "User's first edit"…). Only for readers with pages.
 */

import {
  cdxIconAlert,
  cdxIconEditUndo,
  cdxIconInfo,
  cdxIconReference,
  cdxIconUserAdd,
  type Icon,
} from '@wikimedia/codex-icons'

import { predictTone } from '@/components/visual-editor/engine/api'

import { fetchReadingListPages } from '../template-saved-pages/fetchReadingListPages'
import { formatEditSummary } from './editSummary'
import {
  diffUrl,
  fetchDiff,
  fetchEditCounts,
  fetchLatestRevisions,
  predictRevertRisk,
  type Revision,
  type RevisionDiff,
} from './fetchRevisions'
import { readDayCache, utcDayKey, writeDayCache } from './homeCache'
import { formatAgo } from './relativeTime'
import { titleKey } from './useHomeSeeds'

/** A status pill above a change card's title (`CdxInfoChip`). */
export interface ChangeChip {
  label: string
  status: 'notice' | 'warning' | 'error' | 'success'
  icon: Icon
}

/** One reviewable edit, as a change card shows it. */
export interface ChangeCard {
  key: string
  title: string
  /** The article's own description, under its title. */
  titleDescription?: string
  /** The edit summary. */
  summary: string
  /** The diff on Wikipedia. */
  href: string
  user: string
  /** When, e.g. "3h ago". */
  ago: string
  chips: ChangeChip[]
}

/** Up to four pages of three. */
export const CHANGE_COUNT = 12

const TONE_THRESHOLD = 0.8
const REVERT_RISK_THRESHOLD = 0.7
/** Edit Check's "add a reference" rule: this much new prose with no citation. */
const UNSOURCED_MIN_CHARS = 50
/** Visible characters changed that make an edit a major change. */
const MAJOR_CHANGE_MIN_CHARS = 500

/** At most one flag per edit, in priority order. */
type ReviewFlag = 'needs-reference' | 'tone' | 'revert-risk' | 'first-edit'

/** What review found in one revision — fixed per revid, so cached for the day. */
interface ReviewSignals {
  revid: number
  flag: ReviewFlag | null
  major: boolean
  /** The diff couldn't be read, so this is a guess: shown, but not cached. */
  partial?: boolean
}

const SIGNALS_CACHE_SLOT = 'review-signals'

const FLAG_CHIPS: Record<ReviewFlag, ChangeChip> = {
  'needs-reference': { label: 'Needs a reference check', status: 'notice', icon: cdxIconReference },
  tone: { label: 'Tone issue', status: 'warning', icon: cdxIconAlert },
  'revert-risk': { label: 'High revert risk', status: 'warning', icon: cdxIconAlert },
  'first-edit': { label: "User's first edit", status: 'success', icon: cdxIconUserAdd },
}

/** Rough visible length of wikitext: link targets, quote marks and tags stripped. */
function visibleLength(wikitext: string): number {
  return wikitext
    .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/''+/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim().length
}

function needsReference(diff: RevisionDiff): boolean {
  const added = diff.added.trim()
  if (visibleLength(added) - visibleLength(diff.removed) < UNSOURCED_MIN_CHARS) return false
  if (/<ref[\s>]/i.test(added)) return false
  return !/^\[\[(Category|File|Image):[^\]]+\]\]$/i.test(added)
}

/** One revision's diff and its tone check (Visual Editor's own Lift Wing call). */
async function diffAndTone(
  revision: Revision,
  signal: AbortSignal,
): Promise<{ diff: RevisionDiff | null; tone: boolean }> {
  if (!revision.parentid) return { diff: null, tone: false }
  const diff = await fetchDiff(revision.parentid, revision.revid, signal).catch((error: unknown) => {
    if (signal.aborted) throw error
    return null
  })
  if (!diff?.addedLines.trim()) return { diff, tone: false }
  const [tone] = await predictTone([diff.addedLines], {
    lang: 'en',
    title: revision.title,
    threshold: TONE_THRESHOLD,
  })
  return { diff, tone }
}

/** One revision at a time, so each kind of lookup has a single request in flight. */
async function inTurn<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  for (const item of items) results.push(await fn(item))
  return results
}

/**
 * Review signals for each revision: its diff and tone check, the revert-risk
 * model, and one batched edit-count lookup. Every signal is optional — a failed
 * lookup just means no flag.
 */
async function reviewRevisions(
  revisions: Revision[],
  signal: AbortSignal,
): Promise<ReviewSignals[]> {
  const editors = [...new Set(revisions.filter((r) => r.registered).map((r) => r.user))]
  const [diffs, risks, editCounts] = await Promise.all([
    inTurn(revisions, (r) => diffAndTone(r, signal)),
    inTurn(revisions, (r) => predictRevertRisk(r.revid, signal)),
    fetchEditCounts(editors, signal).catch((error: unknown) => {
      if (signal.aborted) throw error
      return new Map<string, number>()
    }),
  ])

  return revisions.map((revision, i) => {
    const { diff, tone } = diffs[i]
    const major = diff
      ? visibleLength(diff.added) + visibleLength(diff.removed) >= MAJOR_CHANGE_MIN_CHARS
      : false
    let flag: ReviewFlag | null = null
    if (diff && needsReference(diff)) flag = 'needs-reference'
    else if (tone) flag = 'tone'
    else if ((risks[i] ?? 0) >= REVERT_RISK_THRESHOLD) flag = 'revert-risk'
    else if (revision.registered && editCounts.get(revision.user) === 1) flag = 'first-edit'
    return { revid: revision.revid, flag, major, partial: !diff && revision.parentid > 0 }
  })
}

/** Signals for each revision, scoring only those not already scored today. */
async function signalsFor(revisions: Revision[], signal: AbortSignal): Promise<ReviewSignals[]> {
  const day = utcDayKey()
  const cached = new Map(
    (readDayCache<ReviewSignals>(SIGNALS_CACHE_SLOT, day) ?? []).map((s) => [s.revid, s]),
  )
  const fresh = revisions.filter((r) => !cached.has(r.revid))
  const scored = await reviewRevisions(fresh, signal)
  const complete = scored.filter((s) => !s.partial)
  if (complete.length) {
    for (const s of complete) cached.set(s.revid, s)
    writeDayCache(SIGNALS_CACHE_SLOT, day, [...cached.values()])
  }
  const scoredByRevid = new Map(scored.map((s) => [s.revid, s]))
  return revisions.map((r) => cached.get(r.revid) ?? scoredByRevid.get(r.revid)!)
}

/** Chips in order: reverted, revert risk, major change, then any other flag. */
function chipsFor(revision: Revision, { flag, major }: ReviewSignals): ChangeChip[] {
  const chips: ChangeChip[] = []
  if (revision.reverted) chips.push({ label: 'Reverted', status: 'notice', icon: cdxIconEditUndo })
  // Already reverted: the risk has played out.
  if (flag === 'revert-risk' && !revision.reverted) chips.push(FLAG_CHIPS[flag])
  if (major) chips.push({ label: 'Major change', status: 'notice', icon: cdxIconInfo })
  if (flag && flag !== 'revert-risk') chips.push(FLAG_CHIPS[flag])
  return chips
}

/** Article descriptions by title, in one call (the Saved pages template's lookup). */
async function descriptionsFor(titles: string[], signal: AbortSignal): Promise<Map<string, string>> {
  const pages = await fetchReadingListPages(titles, { signal, lang: 'en' })
  return new Map(
    pages.flatMap((page) =>
      page.kind === 'page' && page.description ? [[titleKey(page.title), page.description]] : [],
    ),
  )
}

/**
 * The latest edit to each of the reader's pages, newest first, flagged for
 * review. The list itself is never cached: edits happen all day.
 */
export async function loadReviewChanges(
  seeds: string[],
  signal: AbortSignal,
): Promise<ChangeCard[]> {
  if (!seeds.length) return []

  const revisions = (await fetchLatestRevisions(seeds, signal))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, CHANGE_COUNT)
  // Descriptions alongside the review signals; a failed lookup just means none.
  const [signals, descriptions] = await Promise.all([
    signalsFor(revisions, signal),
    descriptionsFor(
      revisions.map((r) => r.title),
      signal,
    ).catch((error: unknown) => {
      if (signal.aborted) throw error
      return new Map<string, string>()
    }),
  ])

  return revisions.map((revision, i) => ({
    key: String(revision.revid),
    title: revision.title,
    titleDescription: descriptions.get(titleKey(revision.title)),
    summary: formatEditSummary(revision.parsedComment, revision.comment),
    href: diffUrl(revision),
    user: revision.user || 'Anonymous',
    ago: formatAgo(Date.parse(revision.timestamp)),
    chips: chipsFor(revision, signals[i]),
  }))
}
