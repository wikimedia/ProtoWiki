export type EditCommentPart =
  | { type: 'text'; value: string }
  | { type: 'section'; value: string }
  | { type: 'link'; value: string }

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function stripWikiMarkup(text: string): string {
  let stripped = text

  stripped = stripped.replace(/<[^>]+>/g, '')
  stripped = stripped.replace(/\{\|[\s\S]*?\|\}/g, '')

  let previous = ''
  while (previous !== stripped) {
    previous = stripped
    stripped = stripped.replace(/\{\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\}/g, '')
  }

  stripped = stripped.replace(/'''''(.+?)'''''/g, '$1')
  stripped = stripped.replace(/'''(.+?)'''/g, '$1')
  stripped = stripped.replace(/''(.+?)''/g, '$1')
  stripped = stripped.replace(/''/g, '')
  stripped = stripped.replace(/^=+\s*(.*?)\s*=+$/gm, '$1')
  stripped = stripped.replace(/^[*#:;]+/gm, '')

  return stripped
}

function removeNonLinkWiki(text: string): string {
  let cleaned = text

  cleaned = cleaned.replace(/\[\[(?:File|Image|Media|Category):[^\]]*]]/gi, '')
  cleaned = cleaned.replace(/\[(?:https?:\/\/[^\s\]]+)(?:\s+([^\]]+))?\]/gi, '$1')

  return cleaned
}

function appendTextPart(parts: EditCommentPart[], value: string): void {
  const text = collapseWhitespace(stripWikiMarkup(value))
  if (!text.length) return

  const last = parts[parts.length - 1]
  if (last?.type === 'text') {
    last.value = collapseWhitespace(`${last.value}${text}`)
    return
  }

  parts.push({ type: 'text', value: text })
}

function wikiSummaryToParts(wiki: string): EditCommentPart[] {
  const parts: EditCommentPart[] = []
  const text = removeNonLinkWiki(wiki)
  const linkPattern = /\[\[([^|\]]+)\|([^\]]+)]]|\[\[([^\]]+)]]/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = linkPattern.exec(text)) !== null) {
    appendTextPart(parts, text.slice(lastIndex, match.index))

    const display = collapseWhitespace(stripWikiMarkup((match[2] ?? match[3]).trim()))
    if (display.length) {
      parts.push({ type: 'link', value: display })
    }

    lastIndex = match.index + match[0].length
  }

  appendTextPart(parts, text.slice(lastIndex))
  return parts
}

function hasSummaryContent(parts: EditCommentPart[]): boolean {
  return parts.some((part) => part.value.trim().length > 0)
}

function quoteSummaryParts(parts: EditCommentPart[]): EditCommentPart[] {
  if (!hasSummaryContent(parts)) return []

  if (parts[0]?.type === 'text') {
    parts[0].value = parts[0].value.trimStart()
  }

  return [{ type: 'text', value: '"' }, ...parts, { type: 'text', value: '"' }]
}

/** Structured edit comment for card display (arrow, section label, quoted summary). */
export function parseEditComment(raw: string): EditCommentPart[] {
  const trimmed = raw.trim()
  if (!trimmed.length) return []

  const sectionMatch = trimmed.match(/^\/\*\s*(.*?)\s*\*\/\s*(.*)$/s)
  if (sectionMatch) {
    const section = collapseWhitespace(sectionMatch[1])
    const restParts = quoteSummaryParts(wikiSummaryToParts(sectionMatch[2]))

    if (!section.length && !restParts.length) {
      return []
    }

    if (!section.length) {
      return restParts
    }

    const parts: EditCommentPart[] = [
      { type: 'text', value: '→' },
      { type: 'section', value: section },
    ]

    if (restParts.length) {
      parts.push({ type: 'text', value: ':' }, { type: 'text', value: ' ' }, ...restParts)
    }

    return parts
  }

  return quoteSummaryParts(wikiSummaryToParts(trimmed))
}

/** Plain-text join (e.g. empty checks). */
export function formatEditComment(raw: string): string {
  return parseEditComment(raw)
    .map((part) => part.value)
    .join('')
}
