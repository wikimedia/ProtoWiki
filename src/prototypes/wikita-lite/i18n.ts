import { messageGroup } from '@/i18n'

/**
 * Wikita-lite's message groups over the shared catalogs in
 * `src/i18n/locales/<lang>/*.json` — see `@/i18n`. New strings should call
 * `t('namespace.key')` directly; these groups keep constants that are imported
 * at module load (route titles, `MESSAGES.*` in templates) translatable.
 */

export { t } from '@/i18n'

export const MESSAGES = messageGroup('common', [
  'showMore',
  'showMoreTrending',
  'showMoreSaved',
  'showMoreSuggestions',
  'showMoreMentions',
  'showMoreActiveDiscussions',
  'showMoreFurtherReading',
  'allTab',
  'emptyFeatured',
  'emptyDidYouKnow',
  'emptyTrending',
  'machineTranslated',
  'searchPlaceholder',
  'personalizeHome',
  'selectInterests',
  'welcome',
  'welcomeNamed',
  'helloNamed',
  'translateTo',
  'viewsLabel',
  'viewsToday',
  'viewsOnDate',
  'updatedRelative',
  'savedRelative',
] as const)

/** Replace `$1`, `$2`, … in an already-resolved message (prefer `t(key, …params)`). */
export function format(message: string, ...params: (string | number)[]): string {
  return message.replace(/\$(\d+)/g, (match, index) => {
    const value = params[Number(index) - 1]
    return value === undefined ? match : String(value)
  })
}

const VIEWS = messageGroup('views', [
  'titleRead',
  'titleContribute',
  'tabHome',
  'tabExplore',
  'tabContribute',
] as const)

export const VIEW_TITLE_STRINGS = {
  get read() {
    return VIEWS.titleRead
  },
  get contribute() {
    return VIEWS.titleContribute
  },
}

export const VIEW_TAB_LABEL_STRINGS = {
  get edit() {
    return VIEWS.tabHome
  },
  get read() {
    return VIEWS.tabExplore
  },
  get contribute() {
    return VIEWS.tabContribute
  },
}

export const MODULE_TITLE_STRINGS = messageGroup('modules', [
  'featured',
  'articleOfTheDay',
  'didYouKnow',
  'bornOnThisDay',
  'trending',
  'saved',
  'furtherReading',
  'mentor',
  'mentions',
  'suggestedEdits',
  'recentChanges',
  'reviewChanges',
  'activeDiscussions',
  'translateArticles',
  'learn',
  'impact',
] as const)
