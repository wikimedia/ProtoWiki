/** Automated revert/undo prefixes from MediaWiki (en). */
const REVERT_PREFIX = /^(Reverted|Undid|Rollback)/i

/** User-page boilerplate links flattened to “(talk)” / “(contribs)”. */
const USER_PAGE_PAREN = /\s*\((?:talk|contribs)\)/gi

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

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
  return normalizeWhitespace(
    (doc.body.textContent ?? '')
      .replace(/\(\s*\)/g, ''),
  )
}

function stripUserPageParentheticals(text: string): string {
  return text.replace(USER_PAGE_PAREN, '').replace(/\s{2,}/g, ' ').trim()
}

/** Split MediaWiki autocomment (section link) from the editor’s own summary text. */
function parseAutocommentFromHtml(html: string): { auto: string; human: string } | null {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  removeUserPageLinks(doc)

  const autocomment = doc.querySelector('.autocomment')
  if (!autocomment) return null

  const auto = normalizeWhitespace(autocomment.textContent ?? '')
  autocomment.remove()
  const human = normalizeWhitespace(doc.body.textContent ?? '')

  return { auto, human }
}

/** Fallback when parsed HTML is unavailable: section autocomment plus message in raw text. */
function parseSectionFromRaw(raw: string): { auto: string; human: string } | null {
  const match = raw.trim().match(/^\/\*\s*(.*?)\s*\*\/\s*(.*)$/s)
  if (!match) return null

  const sectionName = match[1].trim()
  const human = match[2].trim()
  const auto = sectionName ? `→${sectionName}` : '→(top)'

  return { auto, human }
}

function formatSectionAndMessage(auto: string, human: string): string {
  const section = auto.replace(/:?\s*$/, '')
  if (section && human) return `${section}: “${human}”`
  if (section) return section
  if (human) return `“${human}”`
  return 'No edit summary'
}

function formatRevertSummary(text: string): string | null {
  if (!REVERT_PREFIX.test(text)) return null

  const colonIdx = text.indexOf(': ')
  if (colonIdx === -1) return text

  const prefix = text.slice(0, colonIdx).trim()
  const reason = text.slice(colonIdx + 2).trim()
  if (reason) return `${prefix}: “${reason}”`
  return prefix
}

/**
 * Readable edit summary for card copy. Section links (`→Members`) are shown
 * without quotes; only the editor’s own text is quoted. Revert/undo summaries
 * quote the reason after the colon.
 */
export function formatEditSummaryDisplay(parsedComment: string, rawComment: string): string {
  const html = parsedComment.trim()
  const raw = rawComment.trim()

  if (html) {
    const autocomment = parseAutocommentFromHtml(html)
    if (autocomment) {
      const human = stripUserPageParentheticals(autocomment.human)
      const formatted = formatSectionAndMessage(autocomment.auto, human)
      if (formatted !== 'No edit summary') return formatted
    }
  }

  let text = html ? flattenParsedComment(html) : ''
  if (!text) text = raw
  text = stripUserPageParentheticals(text)
  if (!text) return 'No edit summary'

  const revert = formatRevertSummary(text)
  if (revert) return revert

  const rawSection = parseSectionFromRaw(raw)
  if (rawSection) {
    const human = stripUserPageParentheticals(rawSection.human)
    return formatSectionAndMessage(rawSection.auto, human)
  }

  return `“${text}”`
}
