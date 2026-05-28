import { stripThinkingBlocks } from '@/lib/liftWingQwenChat'

function tryParseJson(value: string): unknown | null {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function findJsonSubstring(text: string): string | null {
  const cleaned = stripThinkingBlocks(text)
  const candidates = [
    { start: cleaned.indexOf('{'), close: '}' },
    { start: cleaned.indexOf('['), close: ']' },
  ].filter((entry) => entry.start !== -1)

  if (!candidates.length) return null

  const first = candidates.reduce((earliest, entry) =>
    entry.start < earliest.start ? entry : earliest,
  )
  const end = cleaned.lastIndexOf(first.close)
  if (end <= first.start) return null

  return cleaned.slice(first.start, end + 1)
}

/** Pretty-print JSON in LLM stream debug output; fall back to raw text while streaming. */
export function formatLlmStreamForDisplay(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''

  const jsonSlice = findJsonSubstring(trimmed)
  const candidates = [trimmed, jsonSlice].filter((value): value is string => Boolean(value))

  for (const candidate of candidates) {
    const parsed = tryParseJson(candidate)
    if (parsed !== null) {
      return JSON.stringify(parsed, null, 2)
    }
  }

  return stripThinkingBlocks(trimmed) || trimmed
}
