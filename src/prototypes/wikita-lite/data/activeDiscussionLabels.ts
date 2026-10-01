/** Project namespace in any of the supported content wikis (`Wikipedia:`, `Wikipédia:`). */
const WIKIPEDIA_PREFIX = /^Wikip[eé]dia:\s?/

/** Strip the Wikipedia namespace from a noticeboard page title. */
export function stripWikipediaPrefix(title: string): string {
  return title.trim().replace(WIKIPEDIA_PREFIX, '')
}

/** eswiki Café sections: `Café/Archivo/Ayuda/Actual` → board `Café`, section `Ayuda`. */
const ARCHIVE_SECTION = /^(.+?)\/Archivo\/([^/]+)\/Actual$/

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
  const section = stripped.match(ARCHIVE_SECTION)
  if (section) return section[2]
  const match = stripped.match(/\(([^)]+)\)\s*$/)
  if (match?.[1]) {
    const inner = match[1].trim().replace(/_/g, ' ')
    return capitalizeFirst(inner)
  }
  return stripped
}

/** Category line shown on discussion cards (no Wikipedia: prefix). */
export function activeDiscussionCategoryLabel(noticeboardTitle: string): string {
  const stripped = stripWikipediaPrefix(noticeboardTitle)
  const section = stripped.match(ARCHIVE_SECTION)
  return section ? `${section[1]} · ${section[2]}` : stripped
}
