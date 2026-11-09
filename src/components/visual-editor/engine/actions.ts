/**
 * Applying a suggestion's fix to the editable article DOM — the equivalent of
 * each check's `act()` in VisualEditor. Fixes that open a VE dialog (Citoid,
 * link inspector, media dialog) get their input from the template's dialogs
 * and land here as plain values.
 */
import type { Finding } from './checks'
import { transclusionAboutGroup } from './dom'

function unwrap(el: Element) {
  const parent = el.parentNode
  if (!parent) return
  while (el.firstChild) parent.insertBefore(el.firstChild, el)
  parent.removeChild(el)
}

/** Next reference number from the article's own markers (`[n]`). */
function nextReferenceNumber(root: Element): number {
  let max = 0
  root.querySelectorAll('sup.mw-ref, sup.reference').forEach((sup) => {
    const n = Number((sup.textContent ?? '').replace(/[^\d]/g, ''))
    if (Number.isFinite(n) && n > max) max = n
  })
  return max + 1
}

/** A Parsoid-shaped reference marker, as VE inserts for a new `<ref>`. */
export function createReferenceMarker(root: Element, source: string, reuseLabel?: string): HTMLElement {
  const doc = root.ownerDocument
  const reused = reuseLabel ? Number(reuseLabel.replace(/[^\d]/g, '')) : 0
  const n = reused || nextReferenceNumber(root)
  const sup = doc.createElement('sup')
  sup.className = 'mw-ref reference protowiki-ve-new-ref'
  sup.setAttribute('typeof', 'mw:Extension/ref')
  sup.setAttribute('data-mw', JSON.stringify({ name: 'ref', body: { html: source } }))
  sup.setAttribute('contenteditable', 'false')
  const a = doc.createElement('a')
  a.setAttribute('href', `#cite_note-protowiki-${n}`)
  const plain = doc.createElement('div')
  plain.innerHTML = source
  a.title = (plain.textContent ?? '').trim()
  const label = doc.createElement('span')
  label.className = 'mw-reflink-text'
  label.textContent = `[${n}]`
  a.appendChild(label)
  sup.appendChild(a)
  return sup
}

/** "Add citation": a new reference at the end of the paragraph (`beforePunctuation: false`). */
export function addCitationToParagraph(root: Element, paragraph: Element, source: string, reuseLabel?: string) {
  paragraph.querySelectorAll('.ve-caret-anchor').forEach((el) => el.remove())
  paragraph.appendChild(createReferenceMarker(root, source, reuseLabel))
}

/** Citation needed → replace the template with a reference (Citoid `replace: true`). */
export function replaceWithCitation(root: Element, template: Element, source: string, reuseLabel?: string) {
  const marker = createReferenceMarker(root, source, reuseLabel)
  const group = transclusionAboutGroup(root, template)
  if (group.length <= 1) {
    template.replaceWith(marker)
    return
  }
  group[0].replaceWith(marker)
  for (let i = 1; i < group.length; i++) group[i].remove()
}

/** Convert reference: Citoid replaces the bare reference's body; the marker stays. */
export function setReferenceBody(ref: Element, source: string) {
  try {
    const mw = JSON.parse(ref.getAttribute('data-mw') ?? '{}')
    mw.body = { html: source }
    ref.setAttribute('data-mw', JSON.stringify(mw))
  } catch {
    /* malformed data-mw */
  }
}

export function removeBold(el: Element) {
  unwrap(el)
}

/** Remove link: keep the text, drop the annotation. */
export function removeLink(a: Element) {
  unwrap(a)
}

/** Merge adjacent links into the first one. */
export function mergeLinks(links: Element[]) {
  const [first, ...rest] = links
  for (const link of rest) {
    let node = first.nextSibling
    while (node && node !== link) {
      const next = node.nextSibling
      first.appendChild(node)
      node = next
    }
    while (link.firstChild) first.appendChild(link.firstChild)
    link.remove()
  }
}

export function setHeadingLevel(heading: Element, level: number): Element {
  const replacement = heading.ownerDocument.createElement(`h${level}`)
  for (const attr of Array.from(heading.attributes)) replacement.setAttribute(attr.name, attr.value)
  while (heading.firstChild) replacement.appendChild(heading.firstChild)
  heading.replaceWith(replacement)
  return replacement
}

/** fakeHeading "Adjust heading": bold paragraph → heading (level ≥ 3). */
export function paragraphToHeading(paragraph: Element, level: number): Element {
  paragraph.querySelectorAll('b, strong').forEach((b) => unwrap(b))
  return setHeadingLevel(paragraph, level)
}

/** Nearest preceding heading level, for fakeHeading. */
export function precedingHeadingLevel(el: Element): number | null {
  const doc = el.ownerDocument
  const walker = doc.createTreeWalker(el.closest('.mw-parser-output') ?? doc.body, NodeFilter.SHOW_ELEMENT)
  let level: number | null = null
  for (let node = walker.nextNode() as Element | null; node && node !== el; node = walker.nextNode() as Element | null) {
    const m = /^H([1-6])$/.exec(node.tagName)
    if (m) level = Number(m[1])
  }
  return level
}

/** requiredTemplateParam: write the filled parameters back into `data-mw`. */
export function setTemplateParams(transclusion: Element, values: Record<string, string>, missing: { name: string; partIndex: number }[]) {
  try {
    const mw = JSON.parse(transclusion.getAttribute('data-mw') ?? '{}')
    for (const m of missing) {
      const value = values[`${m.partIndex}:${m.name}`]
      if (!value) continue
      const template = mw.parts?.[m.partIndex]?.template
      if (!template) continue
      template.params = { ...(template.params ?? {}), [m.name]: { wt: value } }
    }
    transclusion.setAttribute('data-mw', JSON.stringify(mw))
  } catch {
    /* malformed data-mw */
  }
}

export function setImageCaption(figure: Element, caption: string) {
  let figcaption = figure.querySelector(':scope > figcaption')
  if (!figcaption) {
    figcaption = figure.ownerDocument.createElement('figcaption')
    figure.appendChild(figcaption)
  }
  figcaption.textContent = caption
}

export function wikiHref(title: string): string {
  return `./${encodeURIComponent(title.replace(/ /g, '_')).replace(/%2F/g, '/').replace(/%3A/g, ':')}`
}

/** "Add link": wrap the range in an internal link. */
export function addInternalLink(range: Range, target: string) {
  const a = range.startContainer.ownerDocument!.createElement('a')
  a.setAttribute('rel', 'mw:WikiLink')
  a.setAttribute('href', wikiHref(target))
  a.title = target
  range.surroundContents(a)
}

export function relink(a: Element, target: string) {
  a.setAttribute('href', wikiHref(target))
  a.setAttribute('title', target)
}

/** Fix year link: use the target year in the label, or relink to the label year. */
export function fixYearLink(finding: Finding, use: 'target' | 'label') {
  const { link, target, label } = finding.data as { link: Element; target: string; label: string }
  if (use === 'target') {
    const walker = link.ownerDocument.createTreeWalker(link, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      const re = new RegExp(`\\b${label}\\b`)
      if (re.test(node.data)) {
        node.data = node.data.replace(re, target)
        break
      }
    }
  } else {
    const href = link.getAttribute('href') ?? ''
    link.setAttribute('href', href.replace(new RegExp(`(^|[/_:])${target}(?=$|[#?])`), `$1${label}`))
  }
}

/** TextMatch delete mode: remove the matched text (and a now-doubled space). */
export function deleteRange(range: Range) {
  const start = range.startContainer
  const offset = range.startOffset
  range.deleteContents()
  if (start.nodeType === 3) {
    const text = start as Text
    const before = text.data.slice(0, offset)
    const after = text.data.slice(offset)
    if (/\s$/.test(before) && /^\s/.test(after)) text.data = before + after.replace(/^\s+/, '')
    else if (/\s$/.test(before) && /^[,.;:]/.test(after)) text.data = before.replace(/\s+$/, '') + after
  }
}

/** Paste check "remove": delete the pasted text and any paragraph left empty. */
export function removeRanges(ranges: Range[]) {
  for (const range of ranges) {
    const block = (range.commonAncestorContainer.nodeType === 1
      ? (range.commonAncestorContainer as Element)
      : range.commonAncestorContainer.parentElement
    )?.closest('p, li, dd')
    range.deleteContents()
    if (block && !(block.textContent ?? '').trim() && !block.querySelector('img, figure')) block.remove()
  }
}
