/**
 * Maps a wiki article title (spaces or underscores like on-wiki) to the
 * **`public/snapshots/{slug}.html`** basename used by **`ArticleSnapshot`**.
 *
 * Matches the repo convention documented in **`protowiki-snapshot-data`**:
 * **`fetch_page.py "Title" -o public/snapshots/&lt;slug&gt;.html`**
 */
export function articleSnapshotSlug(wikiArticleTitle: string): string {
  const t = wikiArticleTitle.trim()
  if (!t) return ''
  const slug = t
    .trim()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'snapshot'
}

/** Display path snippet for copy-paste in error UI. */
export const SNAPSHOT_FETCH_SCRIPT = '.agents/skills/wiki-snapshot-data/assets/fetch_page.py'

/**
 * Repo-root-relative shell command users can paste to snapshot this article.
 */
export function snapshotPullCommandLines(article: string, slug: string): string[] {
  const titleArg = JSON.stringify(article.trim())
  return [`python3 ${SNAPSHOT_FETCH_SCRIPT} ${titleArg} \\`, `  -o public/snapshots/${slug}.html`]
}
