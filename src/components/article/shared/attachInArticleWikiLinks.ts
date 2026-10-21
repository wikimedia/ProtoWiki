import type { InArticleWikiLinkNavigation } from '@/composables/useInArticleWikiLinks'

import { citationHashFromHref, wikiTitleFromArticleHref } from './wikiTitleFromArticleHref'

function wikiHrefFromAnchor(anchor: HTMLAnchorElement): string {
  return anchor.dataset.protowikiWikiHref ?? anchor.getAttribute('href') ?? ''
}

function wikiTitleFromAnchor(anchor: HTMLAnchorElement, wikiHost: string): string | null {
  const href = wikiHrefFromAnchor(anchor)
  let title = wikiTitleFromArticleHref(href, wikiHost)
  if (!title && anchor.getAttribute('rel')?.includes('mw:WikiLink')) {
    const fromTitle = anchor.getAttribute('title')?.trim()
    if (fromTitle) title = fromTitle
  }
  return title
}

/** Point wikilink **`href`s at the prototype **`?title=`** URL so hover preview matches navigation. */
export function rewriteInArticleWikiLinkHrefs(
  root: HTMLElement,
  wikiHost: string,
  navigation: InArticleWikiLinkNavigation,
): void {
  root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    if (anchor.closest('.ve-section-edit, .mw-editsection a')) return

    const rawHref = anchor.getAttribute('href')
    if (!rawHref) return

    const citationHash = citationHashFromHref(rawHref)
    if (citationHash) {
      anchor.href = citationHash
      return
    }

    if (!anchor.dataset.protowikiWikiHref) {
      anchor.dataset.protowikiWikiHref = rawHref
    }

    const title = wikiTitleFromAnchor(anchor, wikiHost)
    if (!title) return

    const url = navigation.resolveUrl(title)
    if (url) anchor.href = url
  })
}

export function attachInArticleWikiLinks(
  root: HTMLElement,
  wikiHost: string,
  navigation: InArticleWikiLinkNavigation,
): () => void {
  rewriteInArticleWikiLinkHrefs(root, wikiHost, navigation)
  function onClick(e: MouseEvent) {
    if (e.defaultPrevented) return
    if (e.button !== 0) return
    // Rewritten `href` handles hover preview, new tab, and middle-click.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

    const anchor = (e.target as Element | null)?.closest('a[href]')
    if (!anchor || !(anchor instanceof HTMLAnchorElement)) return
    if (anchor.closest('.ve-section-edit, .mw-editsection a')) return

    const title = wikiTitleFromAnchor(anchor, wikiHost)
    if (!title) return

    e.preventDefault()
    queueMicrotask(() => navigation.navigate(title))
  }

  root.addEventListener('click', onClick, true)
  return () => root.removeEventListener('click', onClick, true)
}
