/**
 * DOM helpers that emulate how VisualEditor models Parsoid HTML, so the Edit
 * Check rules (see `checks.ts`) can run on a live `page/html` article without a
 * VE document model. Mirrors `editcheck/modules/editchecks/BaseEditCheck.js`
 * (sections, lead, quotes) and VE's opaque-node / content-branch-node mapping.
 */

/** Two linear positions per inline node, as in VE's linear model. */
export const INLINE_NODE_CHARS = '￼￼'

const CONTENT_BRANCH_TAGS = new Set([
  'P',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'PRE',
  'FIGCAPTION',
  'LI',
  'DD',
  'DT',
  'TD',
  'TH',
])

/** Elements that start a new block inside a content branch (they break the run). */
const BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'UL',
  'OL',
  'DL',
  'TABLE',
  'BLOCKQUOTE',
  'FIGURE',
  'SECTION',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'PRE',
  'LI',
  'DD',
  'DT',
  'HR',
])

const HEADING_RE = /^H([1-6])$/

export function headingLevel(el: Element): number | null {
  const m = HEADING_RE.exec(el.tagName)
  return m ? Number(m[1]) : null
}

function typeofValues(el: Element): string[] {
  return (el.getAttribute('typeof') ?? '').split(/\s+/).filter(Boolean)
}

export function isTransclusion(el: Element): boolean {
  return typeofValues(el).includes('mw:Transclusion')
}

export function isReferenceNode(el: Element): boolean {
  return typeofValues(el).includes('mw:Extension/ref')
}

export function readDataMw(el: Element): Record<string, any> | null {
  const raw = el.getAttribute('data-mw')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** `about` ids shared by transclusion output — all of their siblings are opaque too. */
export function collectTransclusionAboutIds(root: Element): Set<string> {
  const ids = new Set<string>()
  root.querySelectorAll('[typeof~="mw:Transclusion"][about]').forEach((el) => {
    const about = el.getAttribute('about')
    if (about) ids.add(about)
  })
  return ids
}

export interface DocContext {
  root: Element
  aboutIds: Set<string>
}

export function makeContext(root: Element): DocContext {
  return { root, aboutIds: collectTransclusionAboutIds(root) }
}

/** Parsoid splits one template across several `about`-linked siblings. */
export function transclusionAboutGroup(root: Element, el: Element): Element[] {
  const about = el.getAttribute('about')
  if (!about) return [el]
  return Array.from(root.querySelectorAll(`[about="${CSS.escape(about)}"]`))
}

/** Visible output (e.g. citation-needed superscript), not metadata `<link>` nodes. */
export function transclusionDisplayElement(root: Element, el: Element): Element {
  const group = transclusionAboutGroup(root, el)
  return (
    group.find((g) => g.tagName === 'SUP') ??
    group.find((g) => g.matches('.Inline-Template, .Template-Fact')) ??
    group.find((g) => {
      const r = g.getBoundingClientRect()
      return r.width >= 1 && r.height >= 1
    }) ??
    el
  )
}

/**
 * Opaque in VE: transclusions (and their `about`-linked siblings), extensions
 * (refs, reference lists, math…), media. Their text isn't searched.
 */
export function isOpaqueElement(el: Element, ctx: DocContext): boolean {
  const types = typeofValues(el)
  if (types.some((t) => t === 'mw:Transclusion' || t.startsWith('mw:Extension/'))) return true
  if (types.some((t) => /^mw:(File|Image|Video|Audio)/.test(t))) return true
  const about = el.getAttribute('about')
  if (about && ctx.aboutIds.has(about)) return true
  if (el.tagName === 'FIGURE' || el.tagName === 'IMG') return true
  return false
}

export function hasOpaqueAncestor(node: Node, ctx: DocContext): boolean {
  let el: Element | null = node.nodeType === 1 ? (node as Element) : node.parentElement
  while (el && el !== ctx.root) {
    if (isOpaqueElement(el, ctx)) return true
    el = el.parentElement
  }
  return false
}

/** Reference bodies live in VE's internal list — never scanned. */
export function isInReferenceList(node: Node): boolean {
  const el = node.nodeType === 1 ? (node as Element) : node.parentElement
  return !!el?.closest('ol.mw-references, ol.references, .mw-references-wrap, .reflist')
}

/** Hand-authored reader markup (`sup.reference` + `ol.references`) → Parsoid-shaped refs for VE checks. */
export function normalizeHandAuthoredReferences(root: Element): void {
  const noteBodies = new Map<string, string>()
  root
    .querySelectorAll('ol.references > li[id^="cite_note-"], ol.mw-references > li[id^="cite_note-"]')
    .forEach((li) => {
      const text = li.querySelector('.reference-text, .mw-reference-text')
      if (text) noteBodies.set(li.id, text.innerHTML)
    })

  root.querySelectorAll('.mw-references-wrap ol.references:not(.mw-references)').forEach((ol) => {
    ol.classList.add('mw-references')
  })

  root.querySelectorAll('sup.reference').forEach((sup) => {
    if (isReferenceNode(sup)) return
    const link = sup.querySelector('a[href^="#cite_note-"]')
    if (!link) return
    const noteId = (link.getAttribute('href') ?? '').slice(1)
    if (!noteId.startsWith('cite_note-')) return

    sup.classList.add('mw-ref')
    sup.setAttribute('typeof', 'mw:Extension/ref')
    sup.setAttribute('rel', 'dc:references')
    const bodyHtml = noteBodies.get(noteId)
    const dataMw: Record<string, unknown> = {
      name: 'ref',
      attrs: {},
      body: bodyHtml
        ? { id: `mw-reference-text-${noteId}`, html: `<span class="reference-text">${bodyHtml}</span>` }
        : { id: `mw-reference-text-${noteId}` },
    }
    sup.setAttribute('data-mw', JSON.stringify(dataMw))
    link.setAttribute('title', (link.textContent ?? '').trim())
  })
}

/** True when the block already has an inline footnote marker. */
export function blockHasInlineReference(el: Element): boolean {
  if (el.querySelector('[typeof~="mw:Extension/ref"]')) return true
  if (el.querySelector('sup.mw-ref, sup.reference a[href^="#cite_note-"]')) return true
  for (const sup of el.querySelectorAll('[typeof]')) {
    if (readDataMw(sup)?.name === 'ref') return true
  }
  return false
}

/** A text segment of a content run, mapping run offsets back to DOM text. */
export interface RunSegment {
  node: Text
  start: number
  end: number
}

export interface ContentRun {
  block: Element
  text: string
  segments: RunSegment[]
  /** Inline opaque nodes, with their run offsets. */
  inlineNodes: { el: Element; start: number }[]
}

/** Builds the content run of one content branch node (inline nodes as `￼￼`). */
export function buildRun(block: Element, ctx: DocContext): ContentRun {
  let text = ''
  const segments: RunSegment[] = []
  const inlineNodes: { el: Element; start: number }[] = []

  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) {
        const value = (child as Text).data
        if (!value) continue
        segments.push({ node: child as Text, start: text.length, end: text.length + value.length })
        text += value
      } else if (child.nodeType === 1) {
        const el = child as Element
        if (el.tagName === 'LINK' || el.tagName === 'META' || el.tagName === 'STYLE') continue
        // Editor chrome inside the surface (template chips, ↵ markers) isn't content.
        if (el.hasAttribute('data-ve-ui')) continue
        if (BLOCK_TAGS.has(el.tagName)) continue
        if (isOpaqueElement(el, ctx)) {
          inlineNodes.push({ el, start: text.length })
          text += INLINE_NODE_CHARS
          continue
        }
        if (el.tagName === 'BR') {
          text += INLINE_NODE_CHARS
          continue
        }
        walk(el)
      }
    }
  }
  walk(block)
  return { block, text, segments, inlineNodes }
}

/** DOM Range for `[start, end)` of a run's text (clamped to text segments). */
export function runRange(run: ContentRun, start: number, end: number): Range | null {
  const doc = run.block.ownerDocument
  const startSeg = run.segments.find((s) => start >= s.start && start < s.end)
  const endSeg = [...run.segments].reverse().find((s) => end > s.start && end <= s.end)
  if (!startSeg || !endSeg) return null
  const range = doc.createRange()
  range.setStart(startSeg.node, start - startSeg.start)
  range.setEnd(endSeg.node, end - endSeg.start)
  return range
}

export function contentsRange(el: Element): Range {
  const range = el.ownerDocument.createRange()
  range.selectNodeContents(el)
  return range
}

export function elementRange(el: Element): Range {
  const range = el.ownerDocument.createRange()
  range.selectNode(el)
  return range
}

export interface BlockInfo {
  block: Element
  /** Heading hierarchy texts, nearest first (empty for lead). */
  sections: string[]
  /** Before the first heading, in a document that has headings. */
  isLead: boolean
  /** Paragraph whose parent is the document root (sections unwrapped, as VE does). */
  isTopLevelParagraph: boolean
}

/** Section wrappers Parsoid (and ProtoWiki's mobile renderer) add around blocks. */
function isSectionWrapper(el: Element, ctx: DocContext): boolean {
  return (
    el === ctx.root ||
    el.tagName === 'SECTION' ||
    el.classList.contains('protowiki-mobile-section-body') ||
    el.classList.contains('mw-parser-output')
  )
}

function headingText(h: Element): string {
  const label = h.querySelector('.protowiki-mobile-h2__label')
  return (label?.textContent ?? h.textContent ?? '').trim()
}

/** All content branch nodes in document order, with section context. */
export function collectBlocks(ctx: DocContext): BlockInfo[] {
  const blocks: BlockInfo[] = []
  const stack: { level: number; text: string }[] = []
  let seenHeading = false
  const pendingLead: BlockInfo[] = []

  const visit = (el: Element) => {
    if (isOpaqueElement(el, ctx) || isInReferenceList(el)) return
    if (el.classList.contains('mw-empty-elt')) return
    const level = headingLevel(el)
    if (level !== null) {
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop()
      stack.push({ level, text: headingText(el) })
      seenHeading = true
    }
    if (CONTENT_BRANCH_TAGS.has(el.tagName)) {
      const info: BlockInfo = {
        block: el,
        sections: stack.map((s) => s.text).reverse(),
        isLead: !seenHeading,
        isTopLevelParagraph:
          el.tagName === 'P' && !!el.parentElement && isSectionWrapper(el.parentElement, ctx),
      }
      if (level !== null) info.sections = stack.slice(0, -1).map((s) => s.text).reverse()
      blocks.push(info)
      if (!seenHeading) pendingLead.push(info)
    }
    for (const child of Array.from(el.children)) visit(child)
  }
  for (const child of Array.from(ctx.root.children)) visit(child)

  // A document with no headings is a stub — it has no lead.
  if (!seenHeading) pendingLead.forEach((b) => (b.isLead = false))
  return blocks
}

const collator = new Intl.Collator('en', { sensitivity: 'accent' })

export interface SectionConfig {
  ignoreSections?: string[]
  ignoreLeadSection?: boolean
  includeSections?: true | string[]
}

/** `BaseEditCheck.isRangeInValidSection` */
export function isInValidSection(info: BlockInfo, config: SectionConfig): boolean {
  const ignore = [...(config.ignoreSections ?? [])]
  if (config.ignoreLeadSection) ignore.push('')
  if (info.isLead && ignore.includes('')) return false
  const named = ignore.filter((s) => s !== '')
  if (named.some((name) => info.sections.some((s) => collator.compare(s, name) === 0))) return false
  if (Array.isArray(config.includeSections)) {
    const allow = config.includeSections
    if (info.isLead) return allow.includes('')
    return info.sections.some((s) => allow.some((name) => collator.compare(s, name) === 0))
  }
  return true
}

const QUOTE_GROUPS = ['"', '“”„', '‘’‚', '「」', '『』', '«»', '‹›', '《》', '⟪⟫', '⟨⟩']

/** `BaseEditCheck.isOffsetQuoted` — `offset` is a run offset within `run`. */
export function isOffsetQuoted(run: ContentRun, offset: number): boolean {
  if (run.block.closest('blockquote')) return true
  const upto = run.text.slice(0, offset + 1)
  for (const group of QUOTE_GROUPS) {
    let count = 0
    for (const ch of upto) if (group.includes(ch)) count++
    if (count % 2 === 1) return true
  }
  // Single straight quote: only at block start or a word break; skip English possessives.
  let apostrophes = 0
  for (let i = 0; i < upto.length; i++) {
    if (upto[i] !== "'") continue
    const prev = i > 0 ? upto[i - 1] : ''
    const atBreak = i === 0 || !/[\p{L}\p{N}]/u.test(prev)
    if (!atBreak && !(prev === 's' && apostrophes % 2 === 0 && false)) {
      // Mid-word apostrophe (don't, it's) — not a quote mark.
      if (/[\p{L}\p{N}]/u.test(upto[i + 1] ?? '')) continue
      if (prev === 's' && apostrophes % 2 === 0) continue
    }
    apostrophes++
  }
  return apostrophes % 2 === 1
}

const WORD_CHAR = /[\p{L}\p{N}\p{M}_]/u

/** Unicode word-break test at both ends of `[start, end)` (approximates UAX #29). */
export function isWholeWord(text: string, start: number, end: number): boolean {
  const before = text[start - 1] ?? ''
  const first = text[start] ?? ''
  const last = text[end - 1] ?? ''
  const after = text[end] ?? ''
  const startOk = !before || !(WORD_CHAR.test(before) && WORD_CHAR.test(first))
  const endOk = !after || !(WORD_CHAR.test(last) && WORD_CHAR.test(after))
  return startOk && endOk
}

/** `./Title_here#frag` → `{ title: 'Title here', fragment: 'frag' }` */
export function parseWikiHref(href: string | null): { title: string; fragment: string } | null {
  if (!href) return null
  const m = /^\.\/([^?#]*)(?:#(.*))?/.exec(href)
  if (!m) return null
  let title = m[1]
  try {
    title = decodeURIComponent(title)
  } catch {
    /* keep raw */
  }
  title = title.replace(/_/g, ' ').trim()
  if (!title) return null
  return { title: title.charAt(0).toUpperCase() + title.slice(1), fragment: m[2] ?? '' }
}

/** Internal wiki links in a content run (VE `link/mwInternal` annotations). */
export function internalLinksIn(run: ContentRun): HTMLAnchorElement[] {
  const links = new Set<HTMLAnchorElement>()
  for (const seg of run.segments) {
    const a = seg.node.parentElement?.closest('a') as HTMLAnchorElement | null
    if (!a || !run.block.contains(a)) continue
    const rel = (a.getAttribute('rel') ?? '').split(/\s+/)
    if (rel.includes('mw:WikiLink') || rel.includes('mw:MediaLink')) links.add(a)
  }
  return [...links]
}

export function compareRanges(a: Range, b: Range): number {
  const start = a.compareBoundaryPoints(Range.START_TO_START, b)
  if (start !== 0) return start
  return -a.compareBoundaryPoints(Range.END_TO_END, b)
}
