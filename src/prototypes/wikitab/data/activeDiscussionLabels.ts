const WIKIPEDIA_PREFIX = /^Wikipedia:\s?/

/** Strip the Wikipedia namespace from a noticeboard page title. */
export function stripWikipediaPrefix(title: string): string {
  return title.trim().replace(WIKIPEDIA_PREFIX, '')
}

/** Category line shown on discussion cards (no Wikipedia: prefix). */
export function activeDiscussionCategoryLabel(noticeboardPage: string): string {
  return stripWikipediaPrefix(noticeboardPage).replace(/_/g, ' ')
}
