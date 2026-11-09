/** Common REST / Action API statuses when `response.statusText` is empty. */
const HTTP_STATUS_PHRASE: Record<string, string> = {
  '400': 'Bad Request',
  '403': 'Forbidden',
  '404': 'Not Found',
  '429': 'Too Many Requests',
  '500': 'Internal Server Error',
  '502': 'Bad Gateway',
  '503': 'Service Unavailable',
}

const HTTP_ERROR = /^HTTP (\d{3})(?:\s+(.*))?$/

/**
 * Turns fetch errors like `HTTP 429` into `HTTP 429 (Too Many Requests)`.
 * Non-HTTP messages are returned unchanged.
 */
export function formatArticleLoadError(raw: string): string {
  const trimmed = raw.trim()
  const match = trimmed.match(HTTP_ERROR)
  if (!match) return trimmed

  const code = match[1]
  const fromMessage = match[2]?.trim()
  const phrase = fromMessage || HTTP_STATUS_PHRASE[code]
  if (!phrase) return `HTTP ${code}`
  return `HTTP ${code} (${phrase})`
}
