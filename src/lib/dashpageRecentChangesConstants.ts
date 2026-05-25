export const DASHPAGE_RC_STORAGE_KEY = 'protowiki-dashpage-recent-changes-v1'

/** Homepage module preview row count. */
export const DASHPAGE_RC_PREVIEW_MAX = 3
/** Fullscreen feed cap (known + morelike + wildcard). */
export const DASHPAGE_RC_FULLSCREEN_MAX = 10

/** Portfolio pages probed for the user's known list. */
export const DASHPAGE_RC_KNOWN_PAGES_MAX = 4
/** Max feed items sourced from known portfolio pages. */
export const DASHPAGE_RC_KNOWN_ITEMS_MAX = 4

/** Morelike pages probed from known-page seeds. */
export const DASHPAGE_RC_MORELIKE_PAGES_MAX = 4
/** Max feed items sourced from morelike pages. */
export const DASHPAGE_RC_MORELIKE_ITEMS_MAX = 4

/** Risky edits from global recent changes (unknown pages). */
export const DASHPAGE_RC_WILDCARD_MAX = 2

/** RC API page size when a time-window wildcard query needs a fallback scan. */
export const DASHPAGE_RC_WILDCARD_FALLBACK_LIMIT = 20

/** Minimum half-width of a wildcard time window (ms). */
export const DASHPAGE_RC_WILDCARD_MIN_WINDOW_MS = 60 * 60 * 1000

export const DASHPAGE_RC_FALLBACK_PAGE = 'Wet Leg'

export const DASHPAGE_RC_API_USER_AGENT =
  'ProtoWiki/0.1 (https://github.com/wikimedia-research/protowiki) dashpage-recent-changes'
