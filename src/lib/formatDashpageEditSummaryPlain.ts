import type { FakeWiki } from 'fakewiki'

import { createDashpageRecentChangesWiki } from '@/lib/fetchDashpageRecentChanges'
import { stripEmptyLeadingDashpageAutocomment } from '@/lib/stripEmptyLeadingDashpageAutocomment'

/**
 * Cheap client-side edit-summary display while wikitext transform is pending.
 * Uses FakeWiki preprocess only — no network.
 */
export function formatDashpageEditSummaryPlain(
  comment: string,
  pageTitle: string,
  wiki: FakeWiki = createDashpageRecentChangesWiki(),
): string {
  const raw = comment.trim()
  if (!raw) return ''

  let text = wiki.preprocessEditSummary(
    stripEmptyLeadingDashpageAutocomment(raw),
    pageTitle,
  )

  const toolbar = wiki.parseToolbarEditSummary(text)
  if (toolbar?.comment) {
    text = toolbar.comment
    if (toolbar.suggestedBy) {
      text += ` Suggested by ${toolbar.suggestedBy}`
    }
  }

  text = text.replace(/\[\[:Category:[^\]]+\]\]/gi, '')
  text = text.replace(/\[\[Category:[^\]]+\]\]/gi, '')
  text = text.replace(/\[\[User:([^|\]]+)(?:\|([^\]]+))?\]\]/gi, (_match, user, label) =>
    (label ?? user).trim(),
  )
  text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
  text = text.replace(/\[\[([^\]]+)\]\]/g, '$1')
  text = text.replace(/'''+/g, '')
  text = text.replace(/''/g, '')
  text = text.replace(/\s+/g, ' ').trim()

  return text
}
