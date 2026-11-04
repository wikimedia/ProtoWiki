const WIKIPEDIA_PREFIX = /^Wikipedia:\s?/
const TALK_PREFIX = /^Talk:/i

/** Strip the Wikipedia namespace from a noticeboard page title. */
export function stripWikipediaPrefix(title: string): string {
  return title.trim().replace(WIKIPEDIA_PREFIX, '')
}

/** Article title from a `Talk:…` page, or null when not a talk page. */
export function articleTitleFromTalkPage(page: string): string | null {
  const trimmed = page.trim()
  if (!TALK_PREFIX.test(trimmed)) return null
  return trimmed.replace(TALK_PREFIX, '').replace(/_/g, ' ').trim() || null
}

/** Category line shown on discussion cards (noticeboard label or article title). */
export function activeDiscussionCategoryLabel(page: string): string {
  const articleTitle = articleTitleFromTalkPage(page)
  if (articleTitle) return articleTitle
  return stripWikipediaPrefix(page).replace(/_/g, ' ')
}

/** Action API / wiki title for an article's talk page. */
export function talkPageTitleFromArticle(articleTitle: string): string {
  return `Talk:${articleTitle.trim().replace(/_/g, ' ')}`
}
