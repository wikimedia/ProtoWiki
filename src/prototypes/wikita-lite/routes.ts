export const WIKITA_LITE_HOME = '/wikita-lite'
export const FEATURED_PAGE = '/wikita-lite/featured'
export const DID_YOU_KNOW_PAGE = '/wikita-lite/did-you-know'
export const BORN_ON_THIS_DAY_PAGE = '/wikita-lite/born-on-this-day'
export const TRENDING_PAGE = '/wikita-lite/trending'
export const SAVED_PAGE = '/wikita-lite/saved'
export const FURTHER_READING_PAGE = '/wikita-lite/further-reading'
export const HELP_WANTED_PAGE = '/wikita-lite/help-wanted'
export const RECENT_ACTIVITY_PAGE = '/wikita-lite/recent-activity'
export const LEARN_PAGE = '/wikita-lite/learn'

export type WikitaLiteView = 'all' | 'community' | 'read' | 'edit'

export const WIKITA_LITE_VIEWS: WikitaLiteView[] = ['all', 'community', 'read', 'edit']

export const DEFAULT_WIKITA_LITE_VIEW: WikitaLiteView = 'all'

export const VIEW_TITLES: Record<Exclude<WikitaLiteView, 'all'>, string> = {
  community: 'Community',
  read: 'Read',
  edit: 'Edit',
}

export function viewTitleFor(view: WikitaLiteView): string | null {
  if (view === DEFAULT_WIKITA_LITE_VIEW) return null
  return VIEW_TITLES[view]
}

export const MODULE_TITLES = {
  featured: 'Featured',
  didYouKnow: 'Did you know',
  bornOnThisDay: 'Born on this day',
  trending: 'Trending',
  saved: 'Recently saved',
  furtherReading: 'Further reading',
  suggestedEdits: 'Suggested edits',
  recentChanges: 'Recent changes',
  reviewChanges: 'Review changes',
  learn: 'Learn',
} as const

export function parseWikitaLiteView(raw: unknown): WikitaLiteView {
  if (typeof raw === 'string' && WIKITA_LITE_VIEWS.includes(raw as WikitaLiteView)) {
    return raw as WikitaLiteView
  }
  return DEFAULT_WIKITA_LITE_VIEW
}

export function viewForPath(path: string): WikitaLiteView {
  if (path.startsWith(DID_YOU_KNOW_PAGE) || path.startsWith(BORN_ON_THIS_DAY_PAGE)) {
    return 'community'
  }
  if (path.startsWith(SAVED_PAGE) || path.startsWith(FURTHER_READING_PAGE)) {
    return 'read'
  }
  if (
    path.startsWith(HELP_WANTED_PAGE) ||
    path.startsWith(RECENT_ACTIVITY_PAGE) ||
    path.startsWith(LEARN_PAGE)
  ) {
    return 'edit'
  }
  return 'all'
}

export function homeRouteForView(view: WikitaLiteView) {
  if (view === DEFAULT_WIKITA_LITE_VIEW) {
    return WIKITA_LITE_HOME
  }
  return { path: WIKITA_LITE_HOME, query: { view } }
}

export function recentActivityTitleForView(view: WikitaLiteView): string {
  return view === 'edit' ? MODULE_TITLES.reviewChanges : MODULE_TITLES.recentChanges
}
