/** Capitalize the first character for reader-facing labels. */
export function sentenceCase(text: string): string {
  const trimmed = text.trim()
  if (!trimmed.length) return trimmed
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

/** Sentence-case a comma-separated list (first item only, per design). */
export function sentenceCaseList(items: string[]): string {
  const joined = items.join(', ')
  return sentenceCase(joined)
}

/** MediaWiki page title → reader-facing string (underscores → spaces). */
export function formatWikiTitle(title: string): string {
  return title.replace(/_/g, ' ').trim()
}

/** Prefer English Wikipedia article title over Wikidata label for display. */
export function entityDisplayLabel(wikidataLabel: string, enwikiTitle?: string): string {
  if (enwikiTitle) return formatWikiTitle(enwikiTitle)
  return wikidataLabel
}
