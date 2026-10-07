function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function queryHighlightTerm(query: string): string | null {
  const trimmed = query.trim()
  return trimmed.length ? trimmed : null
}

interface HighlightInterval {
  start: number
  end: number
}

function mergeHighlightIntervals(intervals: HighlightInterval[]): HighlightInterval[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start)
  const merged: HighlightInterval[] = []

  for (const interval of sorted) {
    const last = merged[merged.length - 1]
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end)
    } else {
      merged.push({ ...interval })
    }
  }

  return merged
}

/** Wrap case-insensitive full-query matches in `<strong>`. Input must be plain text. */
export function highlightSearchQuery(text: string, query: string): string {
  const trimmed = text.trim()
  if (!trimmed.length) return ''

  const term = queryHighlightTerm(query)
  if (!term) return escapeHtml(text)

  const regex = new RegExp(escapeRegExp(term), 'gi')
  const intervals: HighlightInterval[] = []
  let match = regex.exec(text)
  while (match) {
    intervals.push({ start: match.index, end: match.index + match[0].length })
    match = regex.exec(text)
  }

  const merged = mergeHighlightIntervals(intervals)
  if (!merged.length) return escapeHtml(text)

  let html = ''
  let pos = 0

  for (const { start, end } of merged) {
    html += escapeHtml(text.slice(pos, start))
    html += `<strong>${escapeHtml(text.slice(start, end))}</strong>`
    pos = end
  }

  html += escapeHtml(text.slice(pos))
  return html
}
