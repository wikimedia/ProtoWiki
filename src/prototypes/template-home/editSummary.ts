/** Revert and undo summaries MediaWiki writes itself: shown as-is, not quoted. */
const REVERT_PREFIX = /^(Reverted|Undid|Rollback|Restored)\b/i

function clean(text: string): string {
  return text
    .replace(/\(\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([:,])/g, '$1')
    .trim()
}

/**
 * An edit summary as card copy: the section link stays plain
 * (`→Early life`) and only the editor's own words are quoted, so
 * `→Early life: “fix date”`. Revert summaries quote just the reason.
 */
export function formatEditSummary(parsedComment: string, comment: string): string {
  const doc = new DOMParser().parseFromString(parsedComment, 'text/html')
  // The "(talk)" / "(contribs)" links after a username say nothing on a card.
  for (const link of doc.querySelectorAll('a')) {
    if (/^(talk|contribs)$/i.test(link.textContent?.trim() ?? '')) link.remove()
  }
  const autocomment = doc.querySelector('.autocomment')
  const section = clean(autocomment?.textContent ?? '').replace(/:$/, '')
  autocomment?.remove()
  const text = clean(doc.body.textContent || (parsedComment ? '' : comment))

  if (!text) return section || 'No edit summary'
  if (REVERT_PREFIX.test(text)) {
    const at = text.indexOf(': ')
    return at < 0 ? text : `${text.slice(0, at)}: “${text.slice(at + 2)}”`
  }
  return section ? `${section}: “${text}”` : `“${text}”`
}
