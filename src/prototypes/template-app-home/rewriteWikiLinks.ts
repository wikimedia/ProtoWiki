/** Matches `href="./Title"` and `href="/wiki/Title"` links inside feed HTML snippets. */
const WIKI_HREF_PATTERN = /href="(?:\.\/|\/wiki\/)([^"?#]+)[^"]*"/g

/** Rewrites raw wiki-relative links from feed HTML so they route to the article template. */
export function rewriteWikiLinks(html: string, lang: string): string {
  return html.replace(WIKI_HREF_PATTERN, (_match, encodedTitle: string) => {
    const title = decodeURIComponent(encodedTitle).replace(/_/g, ' ')
    return `href="/template-app-article?article=${encodeURIComponent(title)}&lang=${lang}" class="template-app-home__inline-link"`
  })
}
