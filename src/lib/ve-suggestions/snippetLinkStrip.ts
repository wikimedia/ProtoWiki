/**
 * Snippet previews are non-navigable — strip link markup from wikitext before
 * Parsoid transform, then unwrap any `<a>` elements left in the HTML.
 */

export function stripLinksFromWikitext(wikitext: string): string {
  let text = wikitext

  text = text.replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, (_match, display: string) => display.trim())

  text = text.replace(/\[([^\]\n]+)\]/g, (_match, inner: string) => {
    const trimmed = inner.trim()
    const spaceIndex = trimmed.search(/\s/)
    if (spaceIndex === -1) {
      if (/^(?:https?:\/\/|\/\/|mailto:)/i.test(trimmed)) return trimmed
      return _match
    }

    const target = trimmed.slice(0, spaceIndex)
    const label = trimmed.slice(spaceIndex + 1).trim()
    if (/^(?:https?:\/\/|\/\/|mailto:)/i.test(target)) {
      return label || target
    }

    return _match
  })

  return text
}

export function stripLinksFromSnippetHtml(html: string): string {
  const trimmed = html.trim()
  if (!trimmed.length) return html
  if (!/<a\b/i.test(trimmed)) return html

  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(trimmed, 'text/html')
    for (const anchor of doc.querySelectorAll('a')) {
      anchor.replaceWith(doc.createTextNode(anchor.textContent ?? ''))
    }
    return doc.body.innerHTML
  }

  return trimmed.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1')
}

function findSnippetTextNodeBounds(root: ParentNode): { first: Text | null; last: Text | null } {
  let first: Text | null = null
  let last: Text | null = null

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    const textNode = node as Text
    if (textNode.textContent?.trim()) {
      if (!first) first = textNode
      last = textNode
    }
    node = walker.nextNode()
  }

  return { first, last }
}

/** Wrap rendered snippet HTML in typographic quotes without breaking wikitext parsing. */
export function wrapSnippetHtmlInQuotes(html: string): string {
  const trimmed = html.trim()
  if (!trimmed.length) return html

  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(trimmed, 'text/html')
    const { first, last } = findSnippetTextNodeBounds(doc.body)

    if (!first || !last) {
      doc.body.insertBefore(doc.createTextNode('"'), doc.body.firstChild)
      doc.body.appendChild(doc.createTextNode('"'))
      return doc.body.innerHTML
    }

    first.parentNode?.insertBefore(doc.createTextNode('"'), first)

    if (last.nextSibling) {
      last.parentNode?.insertBefore(doc.createTextNode('"'), last.nextSibling)
    } else {
      last.parentNode?.appendChild(doc.createTextNode('"'))
    }

    return doc.body.innerHTML
  }

  return `"${trimmed}"`
}
