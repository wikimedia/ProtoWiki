/** Prepared mobile-html payload for {@link AppArticlePcsRenderer}. */
export type MobileArticleDocument = {
  pcsHtml: string
  stylesheetHrefs: string[]
}

const PCS_SCRIPT_PATH = '/api/rest_v1/data/javascript/mobile/pcs'

/** Protocol-relative and root-relative WMF asset URLs → absolute https. */
export function absolutizeWikiAssetUrl(href: string, host: string): string {
  const trimmed = href.trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) return trimmed
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  if (trimmed.startsWith('/')) return `https://${host}${trimmed}`
  return trimmed
}

/**
 * Parse REST `page/mobile-html` and extract the `#pcs` subtree for injection.
 * Strips duplicate page chrome (PCS `<header>`) — AppArticleLive renders title/description.
 */
export function prepareMobileArticleDocument(raw: string, host: string): MobileArticleDocument {
  if (typeof DOMParser === 'undefined') {
    throw new Error('DOMParser is required to prepare mobile-html.')
  }

  const doc = new DOMParser().parseFromString(raw, 'text/html')
  const pcs = doc.querySelector('#pcs')
  if (!pcs) {
    throw new Error('mobile-html response missing #pcs root.')
  }

  pcs.querySelector('header')?.remove()

  // Inline boot script runs before our pagelib load — drop it; renderer calls onBodyStart().
  pcs.querySelectorAll('script').forEach((node) => node.remove())

  const stylesheetHrefs = Array.from(
    doc.querySelectorAll<HTMLLinkElement>('head link[rel="stylesheet"][href]'),
  )
    .map((link) => absolutizeWikiAssetUrl(link.getAttribute('href') ?? '', host))
    .filter((href) => href.length > 0)

  return {
    pcsHtml: pcs.innerHTML,
    stylesheetHrefs,
  }
}

export const PCS_SCRIPT_URL = `https://meta.wikimedia.org${PCS_SCRIPT_PATH}`
