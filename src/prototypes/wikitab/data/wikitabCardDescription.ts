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
