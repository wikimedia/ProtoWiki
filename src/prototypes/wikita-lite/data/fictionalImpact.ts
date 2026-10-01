import { t } from '@/i18n'
import { formatCompactNumber, usesLocalizedFormat } from '@/lib/contentFormat'
import type { ImpactData } from '../../template-homepage/impact/data/impactTypes'

import { WIKITA_LITE_IMPACT } from './impactFixtures'

/** Placeholders `fetchUserImpact` uses when a stat isn't available from live APIs. */
function isMissing(value: unknown): boolean {
  return value === undefined || value === '' || value === '?' || value === '—'
}

/** Deterministic 0–1 generator so a username always gets the same fictional numbers. */
function seededRandom(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

function formatViewCount(total: number): string {
  if (usesLocalizedFormat()) return formatCompactNumber(total)
  if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1)}M`
  if (total >= 1000) return `${(total / 1000).toFixed(1)}k`
  return total.toLocaleString()
}

/**
 * Fill stats the live APIs couldn't provide (views, thanks, reviews, streak) with
 * plausible fictional numbers, scaled to the account's real edit count. Real
 * values are kept as-is.
 */
export function withFictionalImpactFallbacks(data: ImpactData, username: string): ImpactData {
  const random = seededRandom(username.toLowerCase())
  const edits = Math.max(data.totalEdits ?? 0, 1)
  const between = (min: number, max: number) => Math.round(min + random() * (max - min))

  const views = Math.round(edits * between(800, 4000) * (0.5 + random()))
  const sparkScale = views / WIKITA_LITE_IMPACT.sparklineData.reduce((a, b) => a + b, 0)

  return {
    ...data,
    ...(isMissing(data.viewCount) ? { viewCount: formatViewCount(views) } : {}),
    ...(!data.sparklineData?.length || isMissing(data.viewCount)
      ? {
          sparklineData: WIKITA_LITE_IMPACT.sparklineData.map((value) =>
            Math.round(value * sparkScale * (0.85 + random() * 0.3)),
          ),
        }
      : {}),
    ...(isMissing(data.thanksReceived)
      ? { thanksReceived: Math.round(edits * (0.01 + random() * 0.04)) }
      : {}),
    ...(isMissing(data.editsReviewed)
      ? { editsReviewed: Math.round(edits * (0.05 + random() * 0.3)) }
      : {}),
    ...(isMissing(data.longestStreak)
      ? { longestStreak: t('impact.streakDays', between(2, 21)) }
      : {}),
  }
}
