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

export function isHomePinnableModule(id: string): id is HomeEditModuleId {
  return (HOME_EDIT_MODULE_IDS as readonly string[]).includes(id)
}

export function isExploreReadModule(id: string): id is ExploreReadModuleId {
  return (EXPLORE_READ_MODULE_IDS as readonly string[]).includes(id)
}

export function isOverflowModuleId(id: string): id is WikitaLiteModuleId {
  return isHomePinnableModule(id) || isExploreReadModule(id)
}
