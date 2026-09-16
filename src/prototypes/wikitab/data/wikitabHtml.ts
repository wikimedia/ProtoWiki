export const EN_WIKI_HOST = 'en.wikipedia.org'

export function articleUrl(title: string): string {
  return `https://${EN_WIKI_HOST}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
}

function parseFragment(html: string): HTMLElement {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  return (doc.body.firstElementChild as HTMLElement | null) ?? doc.createElement('div')
}

/**
 * Feed HTML arrives with Parsoid decoration: `id="mwXX"` on most nodes, empty
 * `<i>` placeholders, and — in `news` stories but not `dyk` hooks — hrefs in the
 * relative `./Page_Title` form, which would resolve against our own origin.
 */
export function normalizeFeedHtml(html: string): string {
  const root = parseFragment(html)

  for (const el of Array.from(root.querySelectorAll('[id]'))) {
    el.removeAttribute('id')
  }

  for (const anchor of Array.from(root.querySelectorAll('a'))) {
    const href = anchor.getAttribute('href') ?? ''
    if (href.startsWith('./')) {
      anchor.setAttribute('href', `https://${EN_WIKI_HOST}/wiki/${href.slice(2)}`)
    }
    anchor.setAttribute('target', '_blank')
    anchor.setAttribute('rel', 'noreferrer')
  }

  for (const empty of Array.from(root.querySelectorAll('i, b'))) {
    if (!empty.textContent?.trim()) empty.remove()
  }

  return root.innerHTML.trim()
}

/**
 * The page a hook or story is "about" — the bolded link the feed uses to mark
 * its subject, falling back to the first link. Used to fetch a thumbnail.
 */
export function primaryLinkTitle(html: string): string | undefined {
  const root = parseFragment(html)
  const anchor =
    root.querySelector('b a[href]') ?? root.querySelector('a[href]')
  if (!anchor) return undefined

  const title = anchor.getAttribute('title')?.trim()
  if (title) return title

  const href = anchor.getAttribute('href') ?? ''
  const slug = href.split('/').pop() ?? ''
  if (!slug) return undefined
  try {
    return decodeURIComponent(slug).replace(/_/g, ' ')
  } catch {
    return slug.replace(/_/g, ' ')
  }
}
