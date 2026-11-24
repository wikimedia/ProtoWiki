export const WIKI = 'https://test.wikipedia.org'

/** A page on the wiki, with optional query parameters (`action`, `type`, …). */
export function wikiUrl(title: string, params: Record<string, string> = {}): string {
  return `${WIKI}/w/index.php?${new URLSearchParams({ title, ...params }).toString()}`
}
