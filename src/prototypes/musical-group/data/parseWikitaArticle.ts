import { parseEnwikiArticleTitle } from './enwikiTitle'

export type WikitaArticleBlock =
  | { type: 'prose'; html: string }
  | { type: 'table'; html: string; caption?: string }
  | { type: 'sidebar'; html: string }
  | { type: 'notice'; html: string }

function removeNavboxStylesWrappers(root: ParentNode): void {
  root.querySelectorAll('.navbox-styles').forEach((node) => node.remove())
}

/** Short descriptions and hatnotes are shown elsewhere in Wikita chrome. */
function removeLeadNotices(root: ParentNode): void {
  root
    .querySelectorAll('.shortdescription, .hatnote, .dablink, .rellink')
    .forEach((node) => node.remove())
  root.querySelectorAll('style').forEach((node) => node.remove())
}

function normalizeInlineReferences(root: ParentNode): void {
  root.querySelectorAll('sup.reference').forEach((node) => {
    const anchor = node.querySelector('a[href]')
    if (!anchor) {
      node.remove()
      return
    }

    for (const attr of ['about', 'typeof', 'rel', 'data-mw']) {
      node.removeAttribute(attr)
    }
    node.classList.add('wikita-ref')

    anchor.removeAttribute('id')
    for (const attr of ['about', 'typeof', 'data-mw', 'rel']) {
      anchor.removeAttribute(attr)
    }
    anchor.querySelectorAll('[id]').forEach((el) => {
      el.removeAttribute('id')
    })
  })
}

function cleanArticleTree(root: ParentNode): void {
  normalizeInlineReferences(root)
  root.querySelectorAll('.mw-editsection, .mw-empty-elt').forEach((node) => {
    node.remove()
  })
  root.querySelectorAll('[style]').forEach((node) => {
    if (node.closest('.navbox')) return
    node.removeAttribute('style')
  })
}

const LEAD_INFOBOX_SELECTOR =
  'table.infobox, table.infobox-v2, .portable-infobox, .portable-infobox-wrapper'

function isLeadBlock(element: Element): boolean {
  const tag = element.tagName
  if (tag !== 'P' && tag !== 'UL' && tag !== 'OL') return false
  if (element.classList.contains('mw-empty-elt')) return false
  return Boolean(element.textContent?.trim().length)
}

/** Match mobile Wikipedia: infobox after the first real lead paragraph in section 0. */
function reorderLeadInfobox(root: ParentNode): void {
  root.querySelectorAll("section[data-mw-section-id='0']").forEach((section) => {
    const infobox = section.querySelector(LEAD_INFOBOX_SELECTOR)
    if (!infobox) return

    let firstLeadBlock: Element | null = null
    for (const child of Array.from(section.children)) {
      if (isLeadBlock(child)) {
        firstLeadBlock = child
        break
      }
    }
    if (!firstLeadBlock) return

    if (firstLeadBlock.nextElementSibling === infobox) return

    if (infobox.compareDocumentPosition(firstLeadBlock) & Node.DOCUMENT_POSITION_FOLLOWING) {
      firstLeadBlock.insertAdjacentElement('afterend', infobox)
    }
  })
}

function flattenContentNodes(body: Element): Element[] {
  const nodes: Element[] = []
  for (const child of Array.from(body.children)) {
    if (child.tagName === 'SECTION') {
      nodes.push(...Array.from(child.children))
    } else {
      nodes.push(child)
    }
  }
  return nodes
}

function isWikitable(element: Element): boolean {
  return element.tagName === 'TABLE' && element.classList.contains('wikitable')
}

function isSidebar(element: Element): boolean {
  return element.tagName === 'TABLE' && element.classList.contains('sidebar')
}

function isMaintenanceNotice(element: Element): boolean {
  return element.tagName === 'TABLE' && element.classList.contains('ambox')
}

function normalizeNoticeHtml(element: Element): string {
  const clone = element.cloneNode(true) as Element
  clone.querySelectorAll('.hide-when-compact, sup.reference, .mw-editsection').forEach((node) => {
    node.remove()
  })
  clone.querySelectorAll('[style]').forEach((node) => {
    node.removeAttribute('style')
  })

  const iconCell = clone.querySelector('.mbox-image')
  const textCell = clone.querySelector('.mbox-text') ?? clone.querySelector('.mbox-text-span')
  const iconHtml = iconCell?.innerHTML.trim() ?? ''
  const textHtml = (textCell?.innerHTML ?? clone.textContent ?? '').trim()

  if (!iconHtml) {
    return `<div class="wikita-notice__row"><div class="wikita-notice__text">${textHtml}</div></div>`
  }

  return `<div class="wikita-notice__row"><div class="wikita-notice__icon">${iconHtml}</div><div class="wikita-notice__text">${textHtml}</div></div>`
}

function splitWikitable(element: Element): { html: string; caption?: string } {
  const clone = element.cloneNode(true) as Element
  const captionEl = clone.querySelector('caption')
  let caption: string | undefined

  if (captionEl) {
    const captionHtml = captionEl.innerHTML.trim()
    if (captionHtml) caption = captionHtml
    captionEl.remove()
  }

  return { html: clone.outerHTML, caption }
}

function pushWikitableBlock(element: Element, blocks: WikitaArticleBlock[]): void {
  blocks.push({ type: 'table', ...splitWikitable(element) })
}

function pushSidebarBlock(element: Element, blocks: WikitaArticleBlock[]): void {
  blocks.push({ type: 'sidebar', html: element.outerHTML })
}

function hasMeaningfulText(element: Element): boolean {
  return Boolean(element.textContent?.replace(/\s+/g, '').length)
}

function flushProse(parts: string[], blocks: WikitaArticleBlock[]): void {
  const html = parts.join('\n').trim()
  if (html) blocks.push({ type: 'prose', html })
  parts.length = 0
}

function processElements(
  elements: Element[],
  proseParts: string[],
  blocks: WikitaArticleBlock[],
): void {
  for (const element of elements) {
    if (isMaintenanceNotice(element)) {
      flushProse(proseParts, blocks)
      blocks.push({ type: 'notice', html: normalizeNoticeHtml(element) })
      continue
    }

    if (isWikitable(element)) {
      flushProse(proseParts, blocks)
      pushWikitableBlock(element, blocks)
      continue
    }

    if (isSidebar(element)) {
      flushProse(proseParts, blocks)
      pushSidebarBlock(element, blocks)
      continue
    }

    const directTables = Array.from(element.children).filter(isWikitable)
    const directSidebars = Array.from(element.children).filter(isSidebar)
    const directNotices = Array.from(element.children).filter(isMaintenanceNotice)
    if (directTables.length > 0 || directSidebars.length > 0 || directNotices.length > 0) {
      processElements(Array.from(element.children), proseParts, blocks)
      continue
    }

    if (
      element.querySelector('table.wikitable') ||
      element.querySelector('table.sidebar') ||
      element.querySelector('table.ambox')
    ) {
      processElements(Array.from(element.children), proseParts, blocks)
      continue
    }

    if (hasMeaningfulText(element)) {
      proseParts.push(element.outerHTML)
    }
  }
}

export function parseWikitaArticleBlocks(html: string): WikitaArticleBlock[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  removeLeadNotices(doc)
  removeNavboxStylesWrappers(doc)
  cleanArticleTree(doc.body)
  reorderLeadInfobox(doc.body)

  const nodes = flattenContentNodes(doc.body)
  const blocks: WikitaArticleBlock[] = []
  const proseParts: string[] = []

  processElements(nodes, proseParts, blocks)
  flushProse(proseParts, blocks)

  return blocks
}

/**
 * Collect unique enwiki article titles linked from article HTML blocks.
 */
export function collectArticleLinkTitles(blocks: WikitaArticleBlock[]): string[] {
  const titles = new Set<string>()

  for (const block of blocks) {
    const htmlParts =
      block.type === 'table'
        ? [block.html, block.caption].filter((part): part is string => Boolean(part))
        : [block.html]
    for (const html of htmlParts) {
      const doc = new DOMParser().parseFromString(html, 'text/html')
      for (const anchor of Array.from(doc.querySelectorAll('a[href]'))) {
        const href = anchor.getAttribute('href') ?? ''
        const title = parseEnwikiArticleTitle(href)
        if (title) titles.add(title)
      }
    }
  }

  return [...titles]
}
