const WIKIPEDIA_PREFIX = /^Wikipedia:\s?/

/** Strip the Wikipedia namespace from a noticeboard page title. */
export function stripWikipediaPrefix(title: string): string {
  return title.trim().replace(WIKIPEDIA_PREFIX, '')
}

function capitalizeFirst(text: string): string {
  if (!text.length) return text
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Short tab label for an active-discussion noticeboard.
 * Parenthetical suffix wins (e.g. "policy" → "Policy"); otherwise the stripped title.
 */
export function activeDiscussionTabLabel(noticeboardTitle: string): string {
  const stripped = stripWikipediaPrefix(noticeboardTitle)
  const match = stripped.match(/\(([^)]+)\)\s*$/)
  if (match?.[1]) {
    const inner = match[1].trim().replace(/_/g, ' ')
    return capitalizeFirst(inner)
  }
  return stripped
}

/** Category line shown on discussion cards (no Wikipedia: prefix). */
export function activeDiscussionCategoryLabel(noticeboardTitle: string): string {
  return stripWikipediaPrefix(noticeboardTitle)
}
