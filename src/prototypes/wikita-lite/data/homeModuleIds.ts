export const HOME_EDIT_MODULE_IDS = [
  'featured',
  'trending',
  'furtherReading',
  'suggestedEdits',
  'translation',
  'recentActivity',
  'activeDiscussions',
  'impact',
  'learn',
] as const

export const EXPLORE_READ_MODULE_IDS = [
  'didYouKnow',
  'bornOnThisDay',
  'saved',
  'furtherReading',
  'mentions',
] as const

export const CONTRIBUTE_MODULE_IDS = [
  'suggestedEdits',
  'translation',
  'recentActivity',
  'activeDiscussions',
  'impact',
  'learn',
] as const

export type HomeEditModuleId = (typeof HOME_EDIT_MODULE_IDS)[number]
export type ExploreReadModuleId = (typeof EXPLORE_READ_MODULE_IDS)[number]
export type ContributeModuleId = (typeof CONTRIBUTE_MODULE_IDS)[number]
export type WikitaLiteModuleId = HomeEditModuleId | ExploreReadModuleId

/** Explore modules that appear on Home only when pinned from a fullscreen page. */
export const HOME_PINNED_ONLY_MODULE_IDS = [
  'didYouKnow',
  'bornOnThisDay',
  'saved',
  'mentions',
] as const

export type HomePinnedOnlyModuleId = (typeof HOME_PINNED_ONLY_MODULE_IDS)[number]

/** All modules that can appear on the Home feed (default or when pinned). */
export const HOME_FEED_MODULE_IDS = [
  ...HOME_EDIT_MODULE_IDS,
  ...HOME_PINNED_ONLY_MODULE_IDS,
] as const

export type HomeFeedModuleId = (typeof HOME_FEED_MODULE_IDS)[number]

export function isHomePinnableModule(id: string): id is HomeEditModuleId {
  return (HOME_EDIT_MODULE_IDS as readonly string[]).includes(id)
}

export function isExploreReadModule(id: string): id is ExploreReadModuleId {
  return (EXPLORE_READ_MODULE_IDS as readonly string[]).includes(id)
}

export function isHomePinnedOnlyModule(id: string): id is HomePinnedOnlyModuleId {
  return (HOME_PINNED_ONLY_MODULE_IDS as readonly string[]).includes(id)
}

export function isHomeFeedModule(id: string): id is HomeFeedModuleId {
  return (HOME_FEED_MODULE_IDS as readonly string[]).includes(id)
}

export function isOverflowModuleId(id: string): id is WikitaLiteModuleId {
  return isHomePinnableModule(id) || isExploreReadModule(id)
}
