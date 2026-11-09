/**
 * Edit checks on this session's own changes (check mode, not suggestions):
 * paste / llm-paste mid-edit, tone after leaving an edited paragraph, and the
 * pre-save `onBeforeSave` run (addReference on new paragraphs, tone on edited
 * ones). Ports `PasteCheck.js`, `LLMPasteCheck.js`, `AddReferenceEditCheck.js`
 * and `ToneCheck.js` in check mode.
 */
import {
  blockHasInlineReference,
  buildRun,
  collectBlocks,
  contentsRange,
  isInValidSection,
  makeContext,
} from './dom'
import { predictTone, TONE_LANGUAGES } from './api'
import { toneFinding, type Finding } from './checks'
import { CHECK_STRINGS as S, EXPERIMENTAL_STRINGS as X } from './strings'

let counter = 0
const nextId = (p: string) => `${p}-check-${++counter}`

export type PasteCategory = 'internal' | 'wordProcessor' | 'plain' | 'ai' | 'html'

/** VE core `PasteSourceDetectorRegistry` (the parts these checks use). */
export function categorizePaste(data: DataTransfer): PasteCategory[] {
  const html = data.getData('text/html')
  const types = Array.from(data.types)
  const categories: PasteCategory[] = []
  if (types.includes('application/x-protowiki-ve')) return ['internal']
  if (!html) return ['plain']
  if (
    types.some((t) => t.startsWith('application/x-vnd.google-docs')) ||
    /id="docs-internal-guid/.test(html) ||
    /content="LibreOffice/.test(html) ||
    /content=Word\.Document/.test(html) ||
    (/data-contrast=/.test(html) && /TextRun/.test(html))
  ) {
    categories.push('wordProcessor')
  }
  const ai =
    (/data-start=/.test(html) && /data-end=/.test(html)) ||
    /utm_source=chatgpt\.com/.test(html) ||
    /src="?https:\/\/images\.openai\.com\//.test(html) ||
    /data-path-to-node=/.test(html) ||
    /<response-element/.test(html) ||
    /id="?model-response-message-content/.test(html) ||
    /BardVeMetadataKey/.test(html) ||
    /data-sfc-root=/.test(html) ||
    /font-claude-/.test(html) ||
    /quote-cjk-patch|ds-markdown-paragraph/.test(html) ||
    /color:\s*#464feb/i.test(html)
  if (ai) categories.push('ai')
  if (!categories.length) categories.push('html')
  return categories
}

/**
 * Paste check for one paste. Production ignores plain-text and word-processor
 * pastes; this template also flags plain-text pastes, as the original
 * Suggestion Mode prototype did. Minimum 50 characters.
 */
export function pasteFinding(range: Range, categories: PasteCategory[]): Finding | null {
  if (categories.includes('internal')) return null
  if (range.toString().length < 50) return null
  if (categories.includes('ai')) {
    return {
      id: nextId('llm-paste'),
      type: 'llm-paste',
      mode: 'check',
      title: S.llmPaste.title,
      descriptionHtml: S.llmPaste.description,
      choices: [
        { action: 'keep', label: S.llmPaste.keep },
        { action: 'remove', label: S.llmPaste.remove },
      ],
      ranges: [range],
    }
  }
  return {
    id: nextId('paste'),
    type: 'paste',
    mode: 'check',
    title: S.paste.title,
    descriptionHtml: S.paste.description,
    promptHtml: S.paste.prompt,
    choices: [
      { action: 'keep', label: S.paste.keep },
      { action: 'remove', label: S.paste.remove },
    ],
    ranges: [range],
  }
}

/** Tone check (check mode) on one edited block. */
export async function toneCheckForBlock(
  block: Element,
  page: { lang: string; title: string },
): Promise<Finding | null> {
  if (!TONE_LANGUAGES.includes(page.lang)) return null
  const ctx = makeContext(block.closest('.mw-parser-output') ?? block)
  const text = buildRun(block, ctx).text.replace(/￼/g, '\n')
  if (!text.trim() || block.closest('blockquote')) return null
  const [flagged] = await predictTone([text], page)
  return flagged ? toneFinding(block, 'check') : null
}

/** Re-runs the model on the current text (Tone "Recheck"). */
export async function recheckTone(block: Element, page: { lang: string; title: string }): Promise<boolean> {
  const ctx = makeContext(block.closest('.mw-parser-output') ?? block)
  const text = buildRun(block, ctx).text.replace(/￼/g, '\n')
  const [flagged] = await predictTone([text], page)
  return flagged
}

function hasReference(el: Element): boolean {
  return blockHasInlineReference(el)
}

/**
 * addReference in check mode: whole new top-level paragraphs of 50+ characters
 * with no reference.
 */
export function addReferenceChecks(root: Element, addedParagraphs: Set<Element>): Finding[] {
  const ctx = makeContext(root)
  const blocks = collectBlocks(ctx)
  const out: Finding[] = []
  for (const info of blocks) {
    if (!addedParagraphs.has(info.block) || !info.isTopLevelParagraph) continue
    if (!info.block.isConnected) continue
    if (buildRun(info.block, ctx).text.length < 50) continue
    if (!isInValidSection(info, {})) continue
    if (hasReference(info.block)) continue
    out.push({
      id: nextId('addReference'),
      type: 'addReference',
      mode: 'check',
      title: S.addReference.title,
      descriptionHtml: S.addReference.description,
      choices: [
        { action: 'accept', label: S.addReference.accept },
        { action: 'reject', label: 'Dismiss' },
      ],
      ranges: [contentsRange(info.block)],
      data: { paragraph: info.block },
    })
  }
  return out
}

/** Reason forms shown for checks (never for suggestions). */
export function feedbackFormFor(finding: Finding, action: string):
  | { description: string; options: readonly { value: string; label: string }[] }
  | null {
  // Experimental checks that ask for a reason even as suggestions (`allowInSuggestions`).
  if (finding.type === 'leadLength' && action === 'dismiss') {
    return { description: 'Other editors would value learning why you made this choice.', options: X.leadLength.declineOptions }
  }
  if (finding.type === 'llmSuggestion' && action === 'invalid') {
    return { description: X.llmSuggestion.invalidDescription, options: X.llmSuggestion.invalidOptions }
  }
  if (finding.mode !== 'check') return null
  if (finding.type === 'addReference' && action === 'reject') {
    return { description: S.addReference.rejectDescription, options: S.addReference.rejectOptions }
  }
  if (finding.type === 'paste' && action === 'keep') {
    return { description: S.paste.keepDescription, options: S.paste.keepOptions }
  }
  if (finding.type === 'llm-paste' && action === 'keep') {
    return { description: S.llmPaste.keepDescription, options: S.llmPaste.keepOptions }
  }
  if (finding.type === 'tone' && action === 'dismiss') {
    return {
      description: 'Other editors would value learning why you made this choice.',
      options: S.tone.declineOptions,
    }
  }
  return null
}
