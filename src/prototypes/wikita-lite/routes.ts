import { MODULE_TITLE_STRINGS, VIEW_TAB_LABEL_STRINGS, VIEW_TITLE_STRINGS } from './i18n'

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
export const CONFIGURE_HOME_PAGE = '/wikita-lite/configure'
export const PERSONALIZATION_PAGE = '/wikita-lite/personalization'

/** Logged-in article reading: `/wikita-lite/wiki/Earth`, the way the wiki spells it. */
export const ARTICLE_PAGE_PREFIX = '/wikita-lite/wiki'

export function articlePagePath(title: string): string {
  return `${ARTICLE_PAGE_PREFIX}/${encodeURIComponent(title.trim().replace(/ /g, '_'))}`
}

/** Fullscreen subpages whose configure button opens Personalization. */
export const PERSONALIZED_SUBPAGE_PATHS = [
  HELP_WANTED_PAGE,
  FURTHER_READING_PAGE,
  RECENT_ACTIVITY_PAGE,
] as const

export function isPersonalizationReturnPath(path: string): boolean {
  return (PERSONALIZED_SUBPAGE_PATHS as readonly string[]).includes(path)
}

/** Legacy suggestion-source configure (not linked from Home chrome). */
export const CONFIGURE_SUGGESTIONS_PAGE = '/wikita-lite/configure/suggestions'
export const CONFIGURE_SUGGESTIONS_INTERESTS_PAGE =
  '/wikita-lite/configure/suggestions/interests'

export type WikitaLiteView = 'edit' | 'read' | 'contribute'

export const WIKITA_LITE_VIEWS: WikitaLiteView[] = ['edit', 'read', 'contribute']

export const DEFAULT_WIKITA_LITE_VIEW: WikitaLiteView = 'edit'

export const VIEW_TITLES: Record<Exclude<WikitaLiteView, 'edit'>, string> = VIEW_TITLE_STRINGS

export const VIEW_TAB_LABELS: Record<WikitaLiteView, string> = VIEW_TAB_LABEL_STRINGS

/**
 * Floating home button on WikitaLiteShell routes. Off also drops the bottom
 * clearance the button reserves (`--with-nav` in wikita-lite-shell.css).
 */
export const SHOW_WIKITA_LITE_FLOATING_NAV = false

/** Prototype dev menu (card radius, URL reset, …) in WikitaLiteShell header. */
export const SHOW_WIKITA_LITE_CHROME_MENU = false

export function viewTitleFor(view: WikitaLiteView): string | null {
  if (view === DEFAULT_WIKITA_LITE_VIEW) return null
  return VIEW_TITLES[view]
}

/** Localized via `?lang=` — see `./i18n.ts`. */
export const MODULE_TITLES = MODULE_TITLE_STRINGS

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

/** Module id → key in {@link MODULE_TITLES} (read at call time so `?lang=` applies). */
const MODULE_TITLE_KEY_BY_ID: Partial<Record<WikitaLiteModuleId, keyof typeof MODULE_TITLES>> = {
  featured: 'featured',
  trending: 'trending',
  furtherReading: 'furtherReading',
  suggestedEdits: 'suggestedEdits',
  translation: 'translateArticles',
  activeDiscussions: 'activeDiscussions',
  impact: 'impact',
  mentor: 'mentor',
  learn: 'learn',
  didYouKnow: 'didYouKnow',
  bornOnThisDay: 'bornOnThisDay',
  saved: 'saved',
  mentions: 'mentions',
}

export function moduleTitleFor(view: WikitaLiteView, moduleId: WikitaLiteModuleId): string {
  if (moduleId === 'recentActivity') {
    return recentActivityTitleForView(view)
  }

  const key = MODULE_TITLE_KEY_BY_ID[moduleId]
  return key ? MODULE_TITLES[key] : moduleId
}
