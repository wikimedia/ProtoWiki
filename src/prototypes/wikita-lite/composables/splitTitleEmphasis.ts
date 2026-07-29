export interface TitleSegment {
  text: string
  bold: boolean
}

/** Split title text so only {@link emphasis} renders bold (Did you know hooks). */
export function splitTitleEmphasis(title: string, emphasis?: string): TitleSegment[] | null {
  if (!title) return null
  if (!emphasis) return null

  const pattern = emphasis
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '[\\u00a0 ]+')
  const match = title.match(new RegExp(pattern))
  if (!match?.index && match?.index !== 0) return [{ text: title, bold: false }]

  const segments: TitleSegment[] = []
  if (match.index > 0) {
    segments.push({ text: title.slice(0, match.index), bold: false })
  }
  segments.push({ text: match[0], bold: true })
  const after = match.index + match[0].length
  if (after < title.length) {
    segments.push({ text: title.slice(after), bold: false })
  }
  return segments
}
