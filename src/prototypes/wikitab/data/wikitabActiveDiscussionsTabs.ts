import type { WikitabCardData } from '../sections'
import {
  mergeActiveDiscussionCardLists,
  type WikitabDiscussionSource,
} from './fetchActiveDiscussions'

export type WikitabActiveDiscussionsTab = 'all' | WikitabDiscussionSource

export const WIKITAB_ACTIVE_DISCUSSIONS_TAB_ORDER: readonly WikitabDiscussionSource[] = [
  'noticeboard',
  'article',
]

export const WIKITAB_ACTIVE_DISCUSSIONS_TAB_LABELS: Record<WikitabDiscussionSource, string> = {
  noticeboard: 'Noticeboards',
  article: 'Articles',
}

/** Full tab row when both Configure sources are on. */
export const WIKITAB_ACTIVE_DISCUSSIONS_TABS: ReadonlyArray<{
  name: WikitabActiveDiscussionsTab
  label: string
}> = [
  { name: 'all', label: 'All' },
  { name: 'noticeboard', label: WIKITAB_ACTIVE_DISCUSSIONS_TAB_LABELS.noticeboard },
  { name: 'article', label: WIKITAB_ACTIVE_DISCUSSIONS_TAB_LABELS.article },
]

/** Select the list for a tab — All is a chronological merge, not a filter. */
export function activeDiscussionsItemsForTab(
  noticeboards: readonly WikitabCardData[],
  articles: readonly WikitabCardData[],
  tab: WikitabActiveDiscussionsTab,
): WikitabCardData[] {
  if (tab === 'noticeboard') return [...noticeboards]
  if (tab === 'article') return [...articles]
  return mergeActiveDiscussionCardLists(noticeboards, articles)
}
