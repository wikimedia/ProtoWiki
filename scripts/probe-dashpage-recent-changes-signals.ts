#!/usr/bin/env npx tsx
/**
 * Probe language-agnostic articlequality score deltas for recent edits.
 * Run: npx tsx scripts/probe-dashpage-recent-changes-signals.ts
 */

import { createDashpageRecentChangesWiki } from '../src/lib/fetchDashpageRecentChanges'
import { fetchArticleQualityScore } from '../src/lib/fetchArticleQualityScore'
import { DASHPAGE_RC_API_USER_AGENT } from '../src/lib/dashpageRecentChangesConstants'

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function main(): Promise<void> {
  const wiki = createDashpageRecentChangesWiki()
  const deltas: number[] = []

  console.log('Fetching recent changes (needs review)…')
  const rc = await wiki.getRecentChanges({ limit: 12, onlyNeedsReview: true })

  for (const rev of rc.revisions) {
    if (!rev.id || !rev.pageName || rev.pageName.includes(':')) continue

    const parentId = await wiki.getParentRevisionId(rev.pageName, rev.id)
    if (parentId == null || parentId <= 0) continue

    const before = await fetchArticleQualityScore(parentId, 'en', DASHPAGE_RC_API_USER_AGENT)
    await sleep(300)
    const after = await fetchArticleQualityScore(rev.id, 'en', DASHPAGE_RC_API_USER_AGENT)
    await sleep(300)

    if (before && after) {
      const delta = after.score - before.score
      deltas.push(delta)
      console.log(
        `rev ${rev.id} (${rev.pageName}): before=${before.score.toFixed(4)} after=${after.score.toFixed(4)} delta=${delta.toFixed(4)}`,
      )
    }
  }

  if (!deltas.length) {
    console.log('No deltas collected — keeping default threshold 0.03')
    return
  }

  const absDeltas = deltas.map(Math.abs).sort((a, b) => a - b)
  const median = absDeltas[Math.floor(absDeltas.length / 2)] ?? 0
  const p75 = absDeltas[Math.floor(absDeltas.length * 0.75)] ?? median
  const suggested = Math.max(0.02, Math.min(0.05, Math.round(p75 * 100) / 100))

  console.log('\nSummary:')
  console.log(`  samples: ${deltas.length}`)
  console.log(`  |delta| median: ${median.toFixed(4)}`)
  console.log(`  |delta| p75: ${p75.toFixed(4)}`)
  console.log(`  suggested display threshold (sprinthackular uses ${1e-6}): any delta > 0`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
