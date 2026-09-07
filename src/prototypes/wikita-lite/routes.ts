import type { WikitaLiteModuleId } from './data/homeModuleIds'

export const WIKITA_LITE_HOME = '/wikita-lite'
export const FEATURED_PAGE = '/wikita-lite/featured'
export const DID_YOU_KNOW_PAGE = '/wikita-lite/did-you-know'
export const BORN_ON_THIS_DAY_PAGE = '/wikita-lite/born-on-this-day'
export const TRENDING_PAGE = '/wikita-lite/trending'
export const SAVED_PAGE = '/wikita-lite/saved'
export const FURTHER_READING_PAGE = '/wikita-lite/further-reading'
export const MENTIONS_PAGE = '/wikita-lite/mentions'
export const HELP_WANTED_PAGE = '/wikita-lite/help-wanted'
export const HELP_WANTED_CONFIGURE_PAGE = '/wikita-lite/help-wanted/configure'
export const HELP_WANTED_CONFIGURE_INTERESTS_PAGE = '/wikita-lite/help-wanted/configure/interests'
export const RECENT_ACTIVITY_PAGE = '/wikita-lite/recent-activity'
export const ACTIVE_DISCUSSIONS_PAGE = '/wikita-lite/active-discussions'
export const TRANSLATIONS_PAGE = '/wikita-lite/translations'
export const LEARN_PAGE = '/wikita-lite/learn'
export const IMPACT_PAGE = '/wikita-lite/impact'
export const CONFIGURE_PAGE = '/wikita-lite/configure'
export const CONFIGURE_INTERESTS_PAGE = '/wikita-lite/configure/interests'

export type WikitaLiteView = 'edit' | 'read' | 'contribute'

export const WIKITA_LITE_VIEWS: WikitaLiteView[] = ['edit', 'read', 'contribute']

export const DEFAULT_WIKITA_LITE_VIEW: WikitaLiteView = 'edit'

export const VIEW_TITLES: Record<Exclude<WikitaLiteView, 'edit'>, string> = {
  read: 'Explore',
  contribute: 'Contribute',
}

export const VIEW_TAB_LABELS: Record<WikitaLiteView, string> = {
  edit: 'Home',
  read: 'Explore',
  contribute: 'Contribute',
}

/** Floating home button — always shown on WikitaLiteShell routes. */
export const SHOW_WIKITA_LITE_FLOATING_NAV = true

export function viewTitleFor(view: WikitaLiteView): string | null {
  if (view === DEFAULT_WIKITA_LITE_VIEW) return null
  return VIEW_TITLES[view]
}

export const MODULE_TITLES = {
  featured: 'Featured',
  articleOfTheDay: 'Article of the day',
  didYouKnow: 'Did you know',
  bornOnThisDay: 'Born on this day',
  trending: 'Trending',
  saved: 'Saved',
  furtherReading: 'Further reading',
  mentions: 'Mentions',
  suggestedEdits: 'Suggested edits',
  recentChanges: 'Recent changes',
  reviewChanges: 'Review changes',
  activeDiscussions: 'Active discussions',
  translateArticles: 'Translate articles',
  learn: 'Learn',
  impact: 'Your impact',
} as const

export function parseWikitaLiteView(raw: unknown): WikitaLiteView {
  if (raw === 'all') return DEFAULT_WIKITA_LITE_VIEW
  if (typeof raw === 'string' && WIKITA_LITE_VIEWS.includes(raw as WikitaLiteView)) {
    return raw as WikitaLiteView
  }
  return DEFAULT_WIKITA_LITE_VIEW
}

export function viewForPath(path: string): WikitaLiteView {
  if (path.startsWith(FEATURED_PAGE)) {
    return DEFAULT_WIKITA_LITE_VIEW
  }
  if (
    path.startsWith(DID_YOU_KNOW_PAGE) ||
    path.startsWith(BORN_ON_THIS_DAY_PAGE) ||
    path.startsWith(TRENDING_PAGE)
  ) {
    return DEFAULT_WIKITA_LITE_VIEW
  }
  if (
    path.startsWith(SAVED_PAGE) ||
    path.startsWith(FURTHER_READING_PAGE) ||
    path.startsWith(MENTIONS_PAGE)
  ) {
    return 'read'
  }
  if (
    path.startsWith(HELP_WANTED_PAGE) ||
    path.startsWith(RECENT_ACTIVITY_PAGE) ||
    path.startsWith(ACTIVE_DISCUSSIONS_PAGE) ||
    path.startsWith(TRANSLATIONS_PAGE) ||
    path.startsWith(LEARN_PAGE) ||
    path.startsWith(IMPACT_PAGE)
  ) {
    return 'contribute'
  }
  return DEFAULT_WIKITA_LITE_VIEW
}

export function homeRouteForView(view: WikitaLiteView) {
  if (view === DEFAULT_WIKITA_LITE_VIEW) {
    return WIKITA_LITE_HOME
  }
  return { path: WIKITA_LITE_HOME, query: { view } }
}

export function recentActivityTitleForView(view: WikitaLiteView): string {
  return view === 'contribute' || view === 'edit'
    ? MODULE_TITLES.reviewChanges
    : MODULE_TITLES.recentChanges
}

const MODULE_TITLE_BY_ID: Partial<Record<WikitaLiteModuleId, string>> = {
  featured: MODULE_TITLES.featured,
  trending: MODULE_TITLES.trending,
  furtherReading: MODULE_TITLES.furtherReading,
  suggestedEdits: MODULE_TITLES.suggestedEdits,
  translation: MODULE_TITLES.translateArticles,
  activeDiscussions: MODULE_TITLES.activeDiscussions,
  impact: MODULE_TITLES.impact,
  learn: MODULE_TITLES.learn,
  didYouKnow: MODULE_TITLES.didYouKnow,
  bornOnThisDay: MODULE_TITLES.bornOnThisDay,
  saved: MODULE_TITLES.saved,
  mentions: MODULE_TITLES.mentions,
}

export function moduleTitleFor(view: WikitaLiteView, moduleId: WikitaLiteModuleId): string {
  if (moduleId === 'recentActivity') {
    return recentActivityTitleForView(view)
  }

  return MODULE_TITLE_BY_ID[moduleId] ?? moduleId
}
