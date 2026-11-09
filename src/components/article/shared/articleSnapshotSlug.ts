/**
 * Maps a wiki article title (spaces or underscores like on-wiki) to the
 * **`public/snapshots/{slug}.html`** basename for committed HTML fixtures.
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

/** Path to the snapshot fetch script (see **`protowiki-snapshot-data`**). */
export const SNAPSHOT_FETCH_SCRIPT = '.agents/skills/wiki-snapshot-data/assets/fetch_page.py'
