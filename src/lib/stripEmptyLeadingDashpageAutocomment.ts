/**
 * Remove a leading empty section autocomment (e.g. slash-star-star-slash with no title).
 * FakeWiki preprocessEditSummary only matches section markers with a space before the
 * closing delimiter, so an empty marker is left verbatim in the feed.
 */
export function stripEmptyLeadingDashpageAutocomment(summary: string): string {
  return summary.replace(/^\s*\/\*\s*\*\/\s*/, '')
}
