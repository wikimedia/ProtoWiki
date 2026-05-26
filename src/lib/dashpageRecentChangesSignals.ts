import type { FakeWiki } from 'fakewiki'
import type { FWLiftWingPrediction, FWDiffLine } from 'fakewiki/types'

import { fetchArticleQualityScore } from '@/lib/fetchArticleQualityScore'
import { DASHPAGE_RC_API_USER_AGENT } from '@/lib/dashpageRecentChangesConstants'
import type { RecentChangeFeedItem } from '@/lib/dashpageRecentChangesTypes'

export const REVERT_RISK_THRESHOLDS = {
  /** Yellow “elevated revert risk” band (sprinthackular ReviewChangesPlusFeed). */
  upperLoose: 0.9,
  /** Red “high revert risk” band — same bar as sprinthackular upperTight. */
  upperTight: 0.9,
} as const

export const REFERENCE_NEED_DELTA_THRESHOLD = 0.01
export const TONE_CHECK_THRESHOLD = 0.55
/** Any score movement counts (sprinthackular THANKS_PATROL_ARTICLE_QUALITY_EPSILON). */
export const ARTICLE_QUALITY_EPSILON = 1e-6

export type RecentChangeFlagKind =
  | 'revert-high'
  | 'reference-high'
  | 'reference-low'
  | 'tone-issue'
  | 'tone-improved'
  | 'quality-up'
  | 'quality-down'

export type RecentChangePrimaryFlagTier =
  | 'toneReference'
  | 'revertHigh'
  | 'revertWarn'
  | 'qualityUp'
  | 'qualityDown'
  | null

export type RecentChangeFlagChipVariant = 'progressive' | 'success' | 'warning' | 'destructive'

export type RecentChangeFlagChipIcon =
  | 'error'
  | 'reference'
  | 'check'
  | 'alert'
  | 'arrowUp'
  | 'arrowDown'

export interface RecentChangeFlagChip {
  label: string
  variant: RecentChangeFlagChipVariant
  icon: RecentChangeFlagChipIcon
}

export interface RecentChangeStructuredDeltaSegment {
  text: string
  deltaClass: string
}

export interface RecentChangeFlag {
  kind: RecentChangeFlagKind
  label: string
  description: string
}

export interface RevisionCandidate {
  revId: number
  parentRevId: number | null
  pageTitle: string
  userName: string
  timestamp: string
  comment: string
  delta: number
  source: 'portfolio' | 'wildcard'
}

export interface AnalyzedRevisionSignals {
  revertRisk: number | null
  referenceNeedBefore: number | null
  referenceNeedAfter: number | null
  referenceNeedDelta: number | null
  tonePrediction: boolean | null
  toneProbability: number | null
  /** Standalone tone check on removed/changed-before snippets (Lift Wing with empty original_text). */
  toneOriginalHadIssue: boolean | null
  toneOriginalProbability: number | null
  articleQualityBefore: number | null
  articleQualityAfter: number | null
  articleQualityDelta: number | null
  flags: RecentChangeFlag[]
  primaryFlag: RecentChangeFlag | null
  primaryFlagTier: RecentChangePrimaryFlagTier
}

function revertRiskFromPrediction(pred: FWLiftWingPrediction | undefined): number | null {
  const p = pred?.probability?.true
  return typeof p === 'number' ? p : null
}

function extractChangedSnippetsFromDiff(
  wiki: FakeWiki,
  diff: FWDiffLine[],
): { originalText: string; modifiedText: string } {
  const originalParts: string[] = []
  const modifiedParts: string[] = []

  for (const line of diff ?? []) {
    const text = line.text ?? ''
    switch (line.type) {
      case 1:
        modifiedParts.push(text)
        break
      case 2:
        originalParts.push(text)
        break
      case 3:
      case 4:
      case 5: {
        const segments = wiki.getDiffLineSegments(line)
        const oldParts: string[] = []
        const newParts: string[] = []
        for (const seg of segments) {
          if (seg.type === 'remove') oldParts.push(seg.text)
          else if (seg.type === 'add') newParts.push(seg.text)
        }
        const oldStr = oldParts.join('')
        const newStr = newParts.join('')
        if (oldStr || newStr) {
          originalParts.push(oldStr)
          modifiedParts.push(newStr)
        } else if (text) {
          modifiedParts.push(text)
          originalParts.push('')
        }
        break
      }
      default:
        break
    }
  }

  return {
    originalText: originalParts.join('\n'),
    modifiedText: modifiedParts.join('\n'),
  }
}

async function fetchToneSignals(
  wiki: FakeWiki,
  pageTitle: string,
  revId: number,
): Promise<
  Pick<
    AnalyzedRevisionSignals,
    'tonePrediction' | 'toneProbability' | 'toneOriginalHadIssue' | 'toneOriginalProbability'
  >
> {
  const empty = {
    tonePrediction: null,
    toneProbability: null,
    toneOriginalHadIssue: null,
    toneOriginalProbability: null,
  }

  const compare = await wiki.getDiffSource(pageTitle, revId)
  const { originalText, modifiedText } = extractChangedSnippetsFromDiff(wiki, compare.diff ?? [])
  if (!originalText && !modifiedText) return empty

  const tone = await wiki.getToneCheckPrediction(originalText, modifiedText, { pageTitle })
  if (!tone) return empty

  const result = {
    tonePrediction: tone.prediction === true,
    toneProbability: typeof tone.probability === 'number' ? tone.probability : null,
    toneOriginalHadIssue: null as boolean | null,
    toneOriginalProbability: null as number | null,
  }

  // "Tone improved" requires removed text to have been flagged — not merely a clean edit.
  if (
    tone.prediction === false &&
    (tone.probability ?? 0) >= TONE_CHECK_THRESHOLD &&
    originalText.trim()
  ) {
    const beforeTone = await wiki.getToneCheckPrediction('', originalText, { pageTitle })
    if (beforeTone && typeof beforeTone.probability === 'number') {
      result.toneOriginalHadIssue = beforeTone.prediction === true
      result.toneOriginalProbability = beforeTone.probability
    }
  }

  return result
}

function buildFlags(signals: Omit<AnalyzedRevisionSignals, 'flags' | 'primaryFlag' | 'primaryFlagTier'>): RecentChangeFlag[] {
  const flags: RecentChangeFlag[] = []

  if (
    signals.revertRisk != null &&
    signals.revertRisk > REVERT_RISK_THRESHOLDS.upperLoose
  ) {
    flags.push({
      kind: 'revert-high',
      label: 'High revert risk.',
      description: 'This edit has a high chance of getting undone.',
    })
  }

  if (signals.referenceNeedDelta != null) {
    if (signals.referenceNeedDelta >= REFERENCE_NEED_DELTA_THRESHOLD) {
      flags.push({
        kind: 'reference-high',
        label: 'Reference issue.',
        description: 'Citations might be needed.',
      })
    } else if (signals.referenceNeedDelta <= -REFERENCE_NEED_DELTA_THRESHOLD) {
      flags.push({
        kind: 'reference-low',
        label: 'Reference improvement.',
        description: 'Citations may have been improved.',
      })
    }
  }

  if (signals.tonePrediction === true && (signals.toneProbability ?? 0) >= TONE_CHECK_THRESHOLD) {
    flags.push({
      kind: 'tone-issue',
      label: 'Tone issue.',
      description: 'Might need revising to a more neutral tone.',
    })
  } else if (
    signals.tonePrediction === false &&
    (signals.toneProbability ?? 0) >= TONE_CHECK_THRESHOLD &&
    signals.toneOriginalHadIssue === true &&
    (signals.toneOriginalProbability ?? 0) >= TONE_CHECK_THRESHOLD
  ) {
    flags.push({
      kind: 'tone-improved',
      label: 'Tone improved.',
      description: 'The edit may have improved neutral tone.',
    })
  }

  if (signals.articleQualityDelta != null) {
    if (signals.articleQualityDelta > ARTICLE_QUALITY_EPSILON) {
      flags.push({
        kind: 'quality-up',
        label: 'Article quality ↑',
        description: 'Language-agnostic quality score increased after this edit.',
      })
    } else if (signals.articleQualityDelta < -ARTICLE_QUALITY_EPSILON) {
      flags.push({
        kind: 'quality-down',
        label: 'Article quality ↓',
        description: 'Language-agnostic quality score decreased after this edit.',
      })
    }
  }

  return flags
}

function primaryFlagFromFlags(flags: RecentChangeFlag[]): RecentChangeFlag | null {
  const priority: RecentChangeFlagKind[] = [
    'revert-high',
    'reference-high',
    'tone-issue',
    'tone-improved',
    'reference-low',
    'quality-down',
    'quality-up',
  ]
  for (const kind of priority) {
    const match = flags.find((f) => f.kind === kind)
    if (match) return match
  }
  return null
}

export function primaryFlagTierFromKind(
  kind: RecentChangeFlagKind | null,
  revertRisk: number | null = null,
): RecentChangePrimaryFlagTier {
  if (!kind) return null
  if (kind === 'revert-high') {
    if (revertRisk != null && revertRisk > REVERT_RISK_THRESHOLDS.upperTight) {
      return 'revertHigh'
    }
    if (revertRisk != null && revertRisk > REVERT_RISK_THRESHOLDS.upperLoose) {
      return 'revertWarn'
    }
    return 'revertHigh'
  }
  if (kind === 'reference-high' || kind === 'tone-issue') {
    return 'toneReference'
  }
  if (kind === 'quality-up') return 'qualityUp'
  if (kind === 'quality-down') return 'qualityDown'
  return null
}

const PRIMARY_FLAG_CHIP_BY_KIND: Record<RecentChangeFlagKind, RecentChangeFlagChip> = {
  'revert-high': { label: 'High revert risk', variant: 'destructive', icon: 'error' },
  'reference-high': { label: 'Reference issue', variant: 'warning', icon: 'reference' },
  'reference-low': { label: 'Reference improved', variant: 'success', icon: 'check' },
  'tone-issue': { label: 'Tone issue', variant: 'warning', icon: 'alert' },
  'tone-improved': { label: 'Tone improved', variant: 'progressive', icon: 'arrowUp' },
  'quality-up': { label: 'Article quality', variant: 'progressive', icon: 'arrowUp' },
  'quality-down': { label: 'Article quality', variant: 'warning', icon: 'arrowDown' },
}

export function primaryFlagChipFromKind(
  kind: RecentChangeFlagKind | null | undefined,
): RecentChangeFlagChip | null {
  if (!kind) return null
  return PRIMARY_FLAG_CHIP_BY_KIND[kind] ?? null
}

export function analyzedSignalsToFeedPatch(
  analyzed: AnalyzedRevisionSignals,
): Partial<RecentChangeFeedItem> {
  return {
    revertRisk: analyzed.revertRisk,
    referenceNeedDelta: analyzed.referenceNeedDelta,
    toneProbability: analyzed.toneProbability,
    articleQualityDelta: analyzed.articleQualityDelta,
    flags: analyzed.flags,
    primaryFlagKind: analyzed.primaryFlag?.kind ?? null,
    primaryFlagLabel: analyzed.primaryFlag?.label ?? null,
    primaryFlagDescription: analyzed.primaryFlag?.description ?? null,
    primaryFlagTier: analyzed.primaryFlagTier,
  }
}

export async function enrichRevisionIncremental(
  wiki: FakeWiki,
  candidate: RevisionCandidate,
  onPatch: (patch: Partial<RecentChangeFeedItem>) => void,
  lang = 'en',
): Promise<void> {
  const base: AnalyzedRevisionSignals = {
    revertRisk: null,
    referenceNeedBefore: null,
    referenceNeedAfter: null,
    referenceNeedDelta: null,
    tonePrediction: null,
    toneProbability: null,
    toneOriginalHadIssue: null,
    toneOriginalProbability: null,
    articleQualityBefore: null,
    articleQualityAfter: null,
    articleQualityDelta: null,
    flags: [],
    primaryFlag: null,
    primaryFlagTier: null,
  }

  const predictions = await wiki.getRevisionPredictions([candidate.revId], ['revertrisk'])
  base.revertRisk = revertRiskFromPrediction(predictions[candidate.revId]?.revertrisk)
  base.flags = buildFlags(base)
  base.primaryFlag = primaryFlagFromFlags(base.flags)
  base.primaryFlagTier = primaryFlagTierFromKind(
    base.primaryFlag?.kind ?? null,
    base.revertRisk,
  )
  onPatch(analyzedSignalsToFeedPatch(base))

  if (base.revertRisk != null && base.revertRisk > REVERT_RISK_THRESHOLDS.upperLoose) {
    return
  }

  let parentId = candidate.parentRevId
  if ((parentId == null || parentId <= 0) && candidate.pageTitle) {
    try {
      parentId = await wiki.getParentRevisionId(candidate.pageTitle, candidate.revId)
    } catch {
      parentId = null
    }
  }

  if (parentId != null && parentId > 0) {
    const beforePred = await wiki.getReferenceNeedPrediction(parentId)
    const afterPred = await wiki.getReferenceNeedPrediction(candidate.revId)
    base.referenceNeedBefore = beforePred?.rn_score ?? null
    base.referenceNeedAfter = afterPred?.rn_score ?? null
    if (base.referenceNeedAfter != null) {
      base.referenceNeedDelta = base.referenceNeedAfter - (base.referenceNeedBefore ?? 0)
    }
    base.flags = buildFlags(base)
    base.primaryFlag = primaryFlagFromFlags(base.flags)
    base.primaryFlagTier = primaryFlagTierFromKind(
      base.primaryFlag?.kind ?? null,
      base.revertRisk,
    )
    onPatch(analyzedSignalsToFeedPatch(base))
  }

  const tone = await fetchToneSignals(wiki, candidate.pageTitle, candidate.revId)
  Object.assign(base, tone)
  base.flags = buildFlags(base)
  base.primaryFlag = primaryFlagFromFlags(base.flags)
  base.primaryFlagTier = primaryFlagTierFromKind(
    base.primaryFlag?.kind ?? null,
    base.revertRisk,
  )
  onPatch(analyzedSignalsToFeedPatch(base))

  if (parentId != null && parentId > 0) {
    const beforeQuality = await fetchArticleQualityScore(
      parentId,
      lang,
      DASHPAGE_RC_API_USER_AGENT,
    )
    const afterQuality = await fetchArticleQualityScore(
      candidate.revId,
      lang,
      DASHPAGE_RC_API_USER_AGENT,
    )
    base.articleQualityBefore = beforeQuality?.score ?? null
    base.articleQualityAfter = afterQuality?.score ?? null
    if (base.articleQualityAfter != null && base.articleQualityBefore != null) {
      base.articleQualityDelta = base.articleQualityAfter - base.articleQualityBefore
    }
    base.flags = buildFlags(base)
    base.primaryFlag = primaryFlagFromFlags(base.flags)
    base.primaryFlagTier = primaryFlagTierFromKind(
      base.primaryFlag?.kind ?? null,
      base.revertRisk,
    )
    onPatch(analyzedSignalsToFeedPatch(base))
  }
}

export async function analyzeRevisionSerial(
  wiki: FakeWiki,
  candidate: RevisionCandidate,
  lang = 'en',
): Promise<AnalyzedRevisionSignals> {
  const base: AnalyzedRevisionSignals = {
    revertRisk: null,
    referenceNeedBefore: null,
    referenceNeedAfter: null,
    referenceNeedDelta: null,
    tonePrediction: null,
    toneProbability: null,
    toneOriginalHadIssue: null,
    toneOriginalProbability: null,
    articleQualityBefore: null,
    articleQualityAfter: null,
    articleQualityDelta: null,
    flags: [],
    primaryFlag: null,
    primaryFlagTier: null,
  }

  const predictions = await wiki.getRevisionPredictions([candidate.revId], ['revertrisk'])
  base.revertRisk = revertRiskFromPrediction(predictions[candidate.revId]?.revertrisk)

  if (base.revertRisk != null && base.revertRisk > REVERT_RISK_THRESHOLDS.upperLoose) {
    base.flags = buildFlags(base)
    base.primaryFlag = primaryFlagFromFlags(base.flags)
    base.primaryFlagTier = primaryFlagTierFromKind(
      base.primaryFlag?.kind ?? null,
      base.revertRisk,
    )
    return base
  }

  let parentId = candidate.parentRevId
  if ((parentId == null || parentId <= 0) && candidate.pageTitle) {
    try {
      parentId = await wiki.getParentRevisionId(candidate.pageTitle, candidate.revId)
    } catch {
      parentId = null
    }
  }

  if (parentId != null && parentId > 0) {
    const beforePred = await wiki.getReferenceNeedPrediction(parentId)
    const afterPred = await wiki.getReferenceNeedPrediction(candidate.revId)
    base.referenceNeedBefore = beforePred?.rn_score ?? null
    base.referenceNeedAfter = afterPred?.rn_score ?? null
    if (base.referenceNeedAfter != null) {
      base.referenceNeedDelta = base.referenceNeedAfter - (base.referenceNeedBefore ?? 0)
    }
  }

  const tone = await fetchToneSignals(wiki, candidate.pageTitle, candidate.revId)
  Object.assign(base, tone)

  if (parentId != null && parentId > 0) {
    const beforeQuality = await fetchArticleQualityScore(
      parentId,
      lang,
      DASHPAGE_RC_API_USER_AGENT,
    )
    const afterQuality = await fetchArticleQualityScore(
      candidate.revId,
      lang,
      DASHPAGE_RC_API_USER_AGENT,
    )
    base.articleQualityBefore = beforeQuality?.score ?? null
    base.articleQualityAfter = afterQuality?.score ?? null
    if (base.articleQualityAfter != null && base.articleQualityBefore != null) {
      base.articleQualityDelta = base.articleQualityAfter - base.articleQualityBefore
    }
  }

  base.flags = buildFlags(base)
  base.primaryFlag = primaryFlagFromFlags(base.flags)
  base.primaryFlagTier = primaryFlagTierFromKind(
    base.primaryFlag?.kind ?? null,
    base.revertRisk,
  )
  return base
}
