import type { FakeWiki } from 'fakewiki'

import { stripEmptyLeadingDashpageAutocomment } from '@/lib/stripEmptyLeadingDashpageAutocomment'

/** Match FMW ReviewChangesPlusFeed — keep formatting, drop navigable links inside card `<a>`. */
export function stripLinksFromHtml(html: string): string {
  if (typeof document === 'undefined') return html

  const div = document.createElement('div')
  div.innerHTML = html
  div.querySelectorAll('base').forEach((el) => el.remove())
  div.querySelectorAll('a').forEach((anchor) => {
    const span = document.createElement('span')
    span.innerHTML = anchor.innerHTML
    anchor.parentNode?.replaceChild(span, anchor)
  })
  return div.innerHTML
}

/**
 * Preprocess + wikitext-transform an edit summary for feed display.
 * Mirrors FakeMediaWiki ReviewChangesPlusFeed `processRevisions`.
 */
export async function formatDashpageEditSummaryHtml(
  wiki: FakeWiki,
  comment: string,
  pageTitle: string,
): Promise<string> {
  const raw = comment.trim()
  if (!raw) return ''

  const preprocessed = wiki.preprocessEditSummary(
    stripEmptyLeadingDashpageAutocomment(raw),
    pageTitle,
  )
  const toolbar = wiki.parseToolbarEditSummary(preprocessed)
  const summary = toolbar ?? {
    comment: preprocessed,
    suggestedBy: null,
  }

  let commentText = summary.comment ?? ''
  if (commentText && summary.suggestedBy) {
    commentText += ` Suggested by [[User:${summary.suggestedBy}|${summary.suggestedBy}]]`
  }

  if (!commentText.trim()) return ''

  let html = await wiki.transformWikitextToHtml(commentText, pageTitle)
  if (html) {
    html = stripLinksFromHtml(html)
  }
  return html
}
