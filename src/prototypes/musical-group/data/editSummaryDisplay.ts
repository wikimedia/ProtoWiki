/** Automated revert/undo prefixes from MediaWiki (en). */
const REVERT_PREFIX = /^(Reverted|Undid|Rollback)/i

/** User-page boilerplate links flattened to “(talk)” / “(contribs)”. */
const USER_PAGE_PAREN = /\s*\((?:talk|contribs)\)/gi

function removeUserPageLinks(doc: Document): void {
  for (const anchor of doc.querySelectorAll('a')) {
    const label = anchor.textContent?.trim().toLowerCase()
    if (label !== 'talk' && label !== 'contribs') continue

    const prev = anchor.previousSibling
    const next = anchor.nextSibling
    if (
      prev?.nodeType === Node.TEXT_NODE &&
      next?.nodeType === Node.TEXT_NODE &&
      /\(\s*$/.test(prev.textContent ?? '') &&
      /^\s*\)/.test(next.textContent ?? '')
    ) {
      prev.textContent = (prev.textContent ?? '').replace(/\(\s*$/, '')
      next.textContent = (next.textContent ?? '').replace(/^\s*\)/, '')
    }
    anchor.remove()
  }
}

function flattenParsedComment(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  removeUserPageLinks(doc)
  return (doc.body.textContent ?? '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripUserPageParentheticals(text: string): string {
  return text.replace(USER_PAGE_PAREN, '').replace(/\s{2,}/g, ' ').trim()
}

/**
 * Readable edit summary for card copy. Strips user-page “(talk)” links, and for
 * revert/undo summaries only quotes the editor’s reason after the colon.
 */
export function formatEditSummaryDisplay(parsedComment: string, rawComment: string): string {
  const html = parsedComment.trim()
  let text = html ? flattenParsedComment(html) : ''
  if (!text) text = rawComment.trim()
  text = stripUserPageParentheticals(text)
  if (!text) return 'No edit summary'

  if (REVERT_PREFIX.test(text)) {
    const colonIdx = text.indexOf(': ')
    if (colonIdx !== -1) {
      const prefix = text.slice(0, colonIdx).trim()
      const reason = text.slice(colonIdx + 2).trim()
      if (reason) return `${prefix}: “${reason}”`
      return prefix
    }
  }

  return `“${text}”`
}
