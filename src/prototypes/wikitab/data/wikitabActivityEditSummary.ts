/** Card line for a section edit — matches {@link formatRawWikitextComment} in search activity fetch. */
export function formatActivityEditSummary(fields: {
  section?: string
  editSummary?: string
}): string {
  const section = fields.section?.trim()
  const userText = fields.editSummary?.trim()
  if (section) {
    const prefix = `→${section}: `
    if (userText) return `${prefix}"${userText}"`
    return `→${section}`
  }
  if (userText) return `"${userText}"`
  return ''
}

/** Best-effort split of a formatted activity line back into payload fields. */
export function parseActivityEditSummaryDisplay(display: string): {
  section?: string
  editSummary?: string
} {
  const trimmed = display.trim()
  if (!trimmed) return {}

  const sectionWithQuote = trimmed.match(/^→(.+?): "(.*)"$/s)
  if (sectionWithQuote) {
    return { section: sectionWithQuote[1].trim(), editSummary: sectionWithQuote[2] }
  }

  if (trimmed.startsWith('→')) {
    return { section: trimmed.slice(1).trim() }
  }

  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return { editSummary: trimmed.slice(1, -1) }
  }

  return { editSummary: trimmed }
}
