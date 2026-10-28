/** Quality-check / Growth-style edit-opportunity need strings surfaced on suggested-edit cards. */
export const WIKITAB_SUGGESTED_EDIT_TASK_NEEDS = [
  'Add more references',
  'Add more internal wikilinks',
  'Improve article section headings',
  'Add images or other media',
  'Add an infobox',
  'Add more relevant categories',
  'Expand the content',
  'This article is too short, try to expand the content',
] as const

export type WikitabSuggestedEditTaskNeed = (typeof WIKITAB_SUGGESTED_EDIT_TASK_NEEDS)[number]

export function isWikitabSuggestedEditTaskNeed(value: string): value is WikitabSuggestedEditTaskNeed {
  return (WIKITAB_SUGGESTED_EDIT_TASK_NEEDS as readonly string[]).includes(value)
}
