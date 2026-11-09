/**
 * VE draws templates that have no visible output as a puzzle-piece "chip"
 * labelled with the template name (`ve.ce.FocusableNode` invisible icon,
 * `MWTransclusionNode.static.iconWhenInvisible = 'puzzle'`). Newlines between
 * inline chips show as "↵". All of it is editor chrome: `stripTemplateChips`
 * removes it before publishing.
 */
import { cdxIconPuzzle } from '@wikimedia/codex-icons'

import { readDataMw } from './dom'

const VOID_TAGS = new Set(['LINK', 'META', 'STYLE', 'SCRIPT', 'BR'])

function hasRendering(el: Element): boolean {
  const r = el.getBoundingClientRect()
  return (r.width >= 10 && r.height >= 4) || (r.height >= 10 && r.width >= 4)
}

/** `MWTransclusionNode.static.getDescription`: template names, namespace stripped, ", "-joined. */
function describe(el: Element): string {
  const names: string[] = []
  for (const part of readDataMw(el)?.parts ?? []) {
    const target = part?.template?.target
    if (!target) continue
    if (typeof target.href === 'string') {
      let title = target.href.replace(/^\.\//, '')
      try {
        title = decodeURIComponent(title)
      } catch {
        /* keep */
      }
      names.push(title.replace(/_/g, ' ').replace(/^Template:/, ''))
    } else if (typeof target.wt === 'string') names.push(target.wt.trim())
  }
  return names.join(', ')
}

function puzzleSvg(): string {
  const path = typeof cdxIconPuzzle === 'string' ? cdxIconPuzzle : (cdxIconPuzzle as { ltr: string }).ltr
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">${path}</svg>`
}

/** Adds chips for invisible templates. Call once the surface is laid out (before hiding sections). */
export function addTemplateChips(surface: HTMLElement) {
  const seen = new Set<string>()
  surface.querySelectorAll('[typeof~="mw:Transclusion"]').forEach((el) => {
    if (el.closest('ol.mw-references, .mw-references-wrap')) return
    if (el.parentElement?.closest('[typeof~="mw:Transclusion"], [typeof^="mw:Extension/"], figure')) return
    const about = el.getAttribute('about')
    if (about) {
      if (seen.has(about)) return
      seen.add(about)
    }
    const group = about ? Array.from(surface.querySelectorAll(`[about="${CSS.escape(about)}"]`)) : [el]
    if (group.some(hasRendering)) return
    const first = group.find((g) => !VOID_TAGS.has(g.tagName)) as HTMLElement | undefined
    const label = describe(el)
    if (!first || !label) return
    // A hidden first element (e.g. Short description's display:none div) is emptied and shown.
    if (getComputedStyle(first).display === 'none') {
      first.setAttribute('data-ve-original-html', first.innerHTML)
      first.setAttribute('data-ve-original-style', first.getAttribute('style') ?? '')
      first.innerHTML = ''
      first.style.display = 'inline-block'
    }
    const chip = document.createElement('span')
    chip.className = 've-template-chip'
    chip.setAttribute('data-ve-ui', '')
    chip.setAttribute('contenteditable', 'false')
    chip.title = label
    chip.innerHTML = `<span class="ve-template-chip__icon">${puzzleSvg()}</span><span class="ve-template-chip__label"></span>`
    chip.querySelector('.ve-template-chip__label')!.textContent = label
    first.prepend(chip)
    first.classList.add('ve-ce-focusableNode-invisible')
    // Empty paragraphs that only hold such templates are shown in the editor (`mw-show-empty-elt`).
    const paragraph = first.closest('p')
    if (paragraph) {
      paragraph.classList.add('ve-show-empty')
      markNewlines(paragraph)
    }
  })
}

/** Newline text between inline chips is drawn as "↵" (`ve.visibleWhitespaceCharacters`). */
function markNewlines(paragraph: Element) {
  for (const node of Array.from(paragraph.childNodes)) {
    if (node.nodeType !== 3 || !/\n/.test(node.textContent ?? '') || (node.textContent ?? '').trim()) continue
    const marker = document.createElement('span')
    marker.className = 've-newline'
    marker.setAttribute('data-ve-ui', '')
    marker.setAttribute('data-ve-text', node.textContent ?? '')
    marker.setAttribute('contenteditable', 'false')
    marker.textContent = '\u21b5'
    node.replaceWith(marker)
  }
}

/** Undo everything `addTemplateChips` did (on a clone, before publishing). */
export function stripTemplateChips(root: Element) {
  root.querySelectorAll('.ve-template-chip').forEach((chip) => chip.remove())
  root.querySelectorAll('.ve-newline').forEach((marker) => {
    marker.replaceWith(root.ownerDocument.createTextNode(marker.getAttribute('data-ve-text') ?? '\n'))
  })
  root.querySelectorAll('[data-ve-original-html]').forEach((el) => {
    el.innerHTML = el.getAttribute('data-ve-original-html') ?? ''
    const style = el.getAttribute('data-ve-original-style')
    if (style) el.setAttribute('style', style)
    else el.removeAttribute('style')
    el.removeAttribute('data-ve-original-html')
    el.removeAttribute('data-ve-original-style')
  })
  root.querySelectorAll('.ve-ce-focusableNode-invisible').forEach((el) => el.classList.remove('ve-ce-focusableNode-invisible'))
  root.querySelectorAll('.ve-show-empty').forEach((el) => el.classList.remove('ve-show-empty'))
}
