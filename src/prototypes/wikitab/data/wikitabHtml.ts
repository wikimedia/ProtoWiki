export const EN_WIKI_HOST = 'en.wikipedia.org'

export function articleUrl(title: string): string {
  return `https://${EN_WIKI_HOST}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
}

export function visualEditorUrl(title: string): string {
  return `${articleUrl(title)}?action=edit&veaction=edit`
}

/** Canonical lowercase key for matching article titles across feed cards. */
export function articleTitleKey(title: string): string {
  return title.trim().replace(/_/g, ' ').replace(/\s+/g, ' ').toLowerCase()
}

function parseFragment(html: string): HTMLElement {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  return (doc.body.firstElementChild as HTMLElement | null) ?? doc.createElement('div')
}

/** Drop whitespace that only padded a removed empty Parsoid `<i>` / `<b>` placeholder. */
function stripPlaceholderPadding(el: Element): void {
  const prev = el.previousSibling
  const next = el.nextSibling

  if (next?.nodeType === Node.TEXT_NODE) {
    const text = next as Text
    if (/^\s+[,;:.!?)\]]/.test(text.data)) {
      text.data = text.data.replace(/^\s+/, '')
    }
  }

  if (prev?.nodeType === Node.TEXT_NODE && next?.nodeType === Node.TEXT_NODE) {
    const prevText = prev as Text
    const nextText = next as Text
    if (/\s$/.test(prevText.data) && /^[\s,;:.!?)\]]/.test(nextText.data)) {
      prevText.data = prevText.data.replace(/\s+$/, '')
    }
  }
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
    } else if (href.startsWith('/wiki/')) {
      anchor.setAttribute('href', `https://${EN_WIKI_HOST}${href}`)
    }
    anchor.setAttribute('target', '_blank')
    anchor.setAttribute('rel', 'noreferrer')
  }

  for (const empty of Array.from(root.querySelectorAll('i, b'))) {
    if (!empty.textContent?.trim()) {
      stripPlaceholderPadding(empty)
      empty.remove()
    }
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
