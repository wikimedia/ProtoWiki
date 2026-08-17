/** Prepared `page/mobile-html` document for {@link AppArticlePcsRenderer}. */
export type MobileArticleDocument = {
  /** Complete document, ready to hand to an iframe as `srcdoc`. */
  html: string
}

/** Attributes in mobile-html that can hold a protocol-relative URL. */
const URL_ATTRIBUTES = [
  'src',
  'href',
  'srcset',
  'data-src',
  'data-srcset',
  'data-data-file-original-src',
] as const

/**
 * `//meta.wikimedia.org/…` → `https://meta.wikimedia.org/…`, including every
 * candidate in a `srcset` list.
 */
function absolutizeProtocolRelative(value: string): string {
  return value.replace(/(^|,\s*)\/\//g, '$1https://')
}

/**
 * Prepare a `page/mobile-html` response for iframe rendering.
 *
 * The response is already a complete, self-bootstrapping document: it carries
 * `<base href>`, the PCS `<script src>`, and its own `pcs.c1.Page.onBodyStart()`
 * / `onBodyEnd()` calls. So there is nothing to assemble — the only fix needed is
 * absolutizing protocol-relative URLs, because an iframe inherits the embedding
 * page's protocol and on a plain-HTTP dev server `//meta.wikimedia.org` would
 * resolve to `http:` and be dropped as insecure, taking the PCS script and
 * stylesheets with it.
 */
export function prepareMobileArticleDocument(raw: string): MobileArticleDocument {
  if (typeof DOMParser === 'undefined') {
    throw new Error('DOMParser is required to prepare mobile-html.')
  }

  const doc = new DOMParser().parseFromString(raw, 'text/html')
  if (!doc.querySelector('#pcs')) {
    throw new Error('mobile-html response missing #pcs root.')
  }

  const selector = URL_ATTRIBUTES.map((attr) => `[${attr}]`).join(',')
  doc.querySelectorAll(selector).forEach((el) => {
    for (const attr of URL_ATTRIBUTES) {
      const value = el.getAttribute(attr)
      if (value) el.setAttribute(attr, absolutizeProtocolRelative(value))
    }
  })

  // `outerHTML` drops the doctype; without it the iframe renders in quirks mode.
  return { html: `<!DOCTYPE html>${doc.documentElement.outerHTML}` }
}
