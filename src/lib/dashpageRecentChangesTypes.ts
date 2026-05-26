import type {
  RecentChangeFlag,
  RecentChangeFlagKind,
  RecentChangePrimaryFlagTier,
  RecentChangeStructuredDeltaSegment,
} from '@/lib/dashpageRecentChangesSignals'

export type {
  RecentChangeFlag,
  RecentChangeFlagKind,
  RecentChangePrimaryFlagTier,
  RecentChangeStructuredDeltaSegment,
}

export interface RecentChangeFeedItem {
  revId: number
  parentRevId: number | null
  pageTitle: string
  userName: string
  timestamp: string
  comment: string
  commentHtml?: string
  delta: number
  source: 'portfolio' | 'wildcard'
  diffUrl: string
  shortDescription?: string
  revertRisk?: number | null
  referenceNeedDelta?: number | null
  toneProbability?: number | null
  articleQualityDelta?: number | null
  flags?: RecentChangeFlag[]
  primaryFlagKind?: RecentChangeFlagKind | null
  primaryFlagLabel?: string | null
  primaryFlagDescription?: string | null
  primaryFlagTier?: RecentChangePrimaryFlagTier
  structuredDeltaSegments?: RecentChangeStructuredDeltaSegment[] | null
}

export function sortRecentChangeFeedItems(
  feedItems: RecentChangeFeedItem[],
): RecentChangeFeedItem[] {
  return [...feedItems].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}
