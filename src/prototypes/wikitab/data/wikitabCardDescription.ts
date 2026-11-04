export type WikitabCardDescriptionSource = {
  description?: string
}

/** Text for the card `#description` slot (plain or HTML per `descriptionFormat`). */
export function wikitabCardDescriptionText(
  card: WikitabCardDescriptionSource | undefined,
): string | undefined {
  return card?.description?.trim() || undefined
}

export function wikitabCardDescriptionHasHtmlMarkup(text: string): boolean {
  return /<[a-z]/i.test(text)
}

/** Strip tags from feed/hook HTML for plain-text contexts. */
export function wikitabHtmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}

/**
 * Plain description suitable for `type: 'article'` saves (descriptionFormat: plain).
 * Hook HTML from OTD/DYK/News is omitted so enrich can fill the REST summary.
 */
export function wikitabPlainArticleDescription(
  description?: string,
): string | undefined {
  const text = description?.trim() || undefined
  if (!text || wikitabCardDescriptionHasHtmlMarkup(text)) return undefined
  return text
}
