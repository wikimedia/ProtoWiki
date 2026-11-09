/**
 * Suggestion Mode detectors, ported rule-for-rule from VisualEditor
 * `editcheck/modules/editchecks/checks/*.js` with the beta wiki configuration
 * (`MediaWiki:Editcheck-config.json`, "Default checks" + "Beta features"; the
 * test-only textMatch rules are left out). They run on Parsoid `page/html`
 * DOM — see `dom.ts` for how VE's model is emulated.
 */
import {
  blockHasInlineReference,
  buildRun,
  collectBlocks,
  compareRanges,
  contentsRange,
  elementRange,
  transclusionDisplayElement,
  hasOpaqueAncestor,
  headingLevel,
  internalLinksIn,
  isInReferenceList,
  isInValidSection,
  isOffsetQuoted,
  isOpaqueElement,
  isTransclusion,
  isWholeWord,
  makeContext,
  parseWikiHref,
  readDataMw,
  runRange,
  type BlockInfo,
  type ContentRun,
  type DocContext,
} from './dom'
import {
  fetchCitationNeededTemplates,
  fetchDisambiguationTitles,
  fetchInterwikiPatterns,
  fetchLinkRecommendations,
  fetchLlmSuggestions,
  fetchTemplateData,
  normalizeTemplateTitle,
  predictTone,
  TONE_LANGUAGES,
} from './api'
import { CHECK_STRINGS as S, EXPERIMENTAL_STRINGS as X, STR } from './strings'

/** Suggestion types the settings can filter on (one per card title family). */
export const SUGGESTION_TYPES = [
  { id: 'addReference', label: 'Add a citation' },
  { id: 'citationNeeded', label: 'Add a citation (citation needed)' },
  { id: 'convertReference', label: 'Convert reference' },
  { id: 'disambiguation', label: 'Link to a more specific page' },
  { id: 'doubleBold', label: 'Remove unnecessary bold formatting' },
  { id: 'duplicateLink', label: 'Remove duplicated link / Merge adjacent links' },
  { id: 'externalLink', label: 'Remove external link' },
  { id: 'headingLevel', label: 'Adjust heading level' },
  { id: 'imageCaption', label: 'Add image caption' },
  { id: 'suggestedLink', label: 'Add a link' },
  { id: 'textMatch-cliches', label: 'Cliches and idioms' },
  { id: 'textMatch-relative-time-ref', label: 'Relative time references' },
  { id: 'textMatch-editorializing', label: 'Editorializing' },
  { id: 'textMatch-potential-LLM', label: 'Potential LLM content' },
  { id: 'tone', label: 'Revise Tone?' },
  { id: 'yearLink', label: 'Fix year link' },
  // Experimental (shown in experimental mode, `?ecenable=suggestions,experimental`)
  { id: 'fakeHeading', label: 'Use real headings (experimental)' },
  { id: 'leadLength', label: 'Improve readability (experimental)' },
  { id: 'redirect', label: 'Link to the final page (experimental)' },
  { id: 'requiredTemplateParam', label: 'Template has missing parameters (experimental)' },
  { id: 'llmSuggestion', label: 'Model sourced suggestions (experimental)' },
] as const

export type SuggestionTypeId = (typeof SUGGESTION_TYPES)[number]['id']

export type ChoiceAction =
  | 'accept'
  | 'add'
  | 'convert'
  | 'edit'
  | 'remove'
  | 'merge'
  | 'fix'
  | 'delete'
  | 'useTarget'
  | 'useLabel'
  | 'recheck'
  | 'valid'
  | 'invalid'
  | 'keep'
  | 'reject'
  | 'dismiss'

export interface Choice {
  action: ChoiceAction
  label: string
  /** OOUI flags: `primary` + `progressive` render as a progressive primary button. */
  flags?: ('primary' | 'progressive')[]
}

export interface Finding {
  id: string
  /** Settings type id. */
  type: SuggestionTypeId | 'paste' | 'llm-paste'
  /** `'suggestion'` = existing content (blue, lightbulb); `'check'` = this session's edits (yellow). */
  mode: 'suggestion' | 'check'
  title: string
  descriptionHtml: string
  promptHtml?: string
  footerHtml?: string
  footerIcon?: 'userAvatar' | 'robot'
  choices: Choice[]
  /** Highlighted ranges; the first one positions the card. */
  ranges: Range[]
  /** The element a whole-element highlight sits on (figure, ref marker…), if any. */
  element?: Element
  /** Per-check data for applying a fix. */
  data?: Record<string, any>
  /** Tone / lead length: being revised (Recheck instead of Revise). */
  revising?: boolean
  /** Experimental check: dashed lightbulb + "Experimental suggestion for testing". */
  experimental?: boolean
}

let counter = 0
function nextId(prefix: string): string {
  return `${prefix}-${++counter}`
}

export interface DetectContext {
  ctx: DocContext
  blocks: BlockInfo[]
  runs: Map<Element, ContentRun>
  host: string
  lang: string
  title: string
  isDisambiguationPage: boolean
  categories: string[]
  templates: Set<string>
}

export function prepare(root: Element, page: { host: string; lang: string; title: string }): DetectContext {
  const ctx = makeContext(root)
  const blocks = collectBlocks(ctx)
  const runs = new Map<Element, ContentRun>()
  for (const b of blocks) runs.set(b.block, buildRun(b.block, ctx))
  const categories: string[] = []
  root.querySelectorAll('link[rel~="mw:PageProp/Category"]').forEach((el) => {
    const parsed = parseWikiHref(el.getAttribute('href'))
    if (parsed) categories.push(parsed.title.replace(/^Category:/, ''))
  })
  const templates = new Set<string>()
  root.querySelectorAll('[typeof~="mw:Transclusion"]').forEach((el) => {
    for (const part of readDataMw(el)?.parts ?? []) {
      const href = part?.template?.target?.href
      if (typeof href === 'string') templates.add(normalizeTemplateTitle(href.replace(/^\.\//, '')))
    }
  })
  return {
    ctx,
    blocks,
    runs,
    ...page,
    isDisambiguationPage: !!root.querySelector('meta[property="mw:PageProp/disambiguation"]'),
    categories,
    templates,
  }
}

function blockInfoFor(d: DetectContext, node: Node): BlockInfo | undefined {
  let el: Element | null = node.nodeType === 1 ? (node as Element) : node.parentElement
  while (el && el !== d.ctx.root) {
    const info = d.blocks.find((b) => b.block === el)
    if (info) return info
    el = el.parentElement
  }
  return undefined
}

const DISMISS: Choice = { action: 'dismiss', label: STR.dismiss }

// ── addReference ─────────────────────────────────────────────────────────────

function containsReference(el: Element, citationNeeded: Set<string>): boolean {
  if (blockHasInlineReference(el)) return true
  for (const sup of el.querySelectorAll('[typeof]')) {
    if (isTransclusion(sup) && isCitationNeededTemplate(sup, citationNeeded)) return true
  }
  return false
}

export function detectAddReference(d: DetectContext, citationNeeded: Set<string>): Finding[] {
  if (d.isDisambiguationPage) return []
  const out: Finding[] = []
  for (const info of d.blocks) {
    if (!info.isTopLevelParagraph) continue
    const run = d.runs.get(info.block)!
    if (run.text.length < 50) continue
    if (!isInValidSection(info, {})) continue
    if (containsReference(info.block, citationNeeded)) continue
    const next = info.block.nextElementSibling
    if (next && /^(UL|OL|DL|BLOCKQUOTE|TABLE)$/.test(next.tagName) && containsReference(next, citationNeeded)) continue
    out.push({
      id: nextId('addReference'),
      type: 'addReference',
      mode: 'suggestion',
      title: S.addReference.title,
      descriptionHtml: S.addReference.description,
      choices: [{ action: 'accept', label: S.addReference.accept }, DISMISS],
      ranges: [contentsRange(info.block)],
      data: { paragraph: info.block },
    })
  }
  return out
}

// ── citationNeeded ───────────────────────────────────────────────────────────

function templateTarget(el: Element): { title: string; params: Record<string, any> } | null {
  const part = readDataMw(el)?.parts?.[0]?.template
  const href = part?.target?.href
  if (typeof href !== 'string') return null
  return { title: normalizeTemplateTitle(decodeURIComponent(href.replace(/^\.\//, ''))), params: part.params ?? {} }
}

function isCitationNeededTemplate(el: Element, titles: Set<string>): boolean {
  const target = templateTarget(el)
  return !!target && titles.has(target.title)
}

export function detectCitationNeeded(d: DetectContext, titles: Set<string>): Finding[] {
  const out: Finding[] = []
  const seenAbout = new Set<string>()
  d.ctx.root.querySelectorAll('[typeof~="mw:Transclusion"]').forEach((el) => {
    if (/^(DIV|TABLE|SECTION|FIGURE|UL|OL|P)$/.test(el.tagName)) return
    if (isInReferenceList(el) || (el.parentElement && hasOpaqueAncestor(el.parentElement, d.ctx))) return
    const about = el.getAttribute('about')
    if (about) {
      if (seenAbout.has(about)) return
      seenAbout.add(about)
    }
    const target = templateTarget(el)
    if (!target || !titles.has(target.title)) return
    const anchor = transclusionDisplayElement(d.ctx.root, el)
    const date = target.params?.date?.wt
    const reason = target.params?.reason?.wt
    let description = `<p>${S.citationNeeded.description}${date ? ` (${date})` : ''}</p>`
    if (reason) description += `<p>${S.citationNeeded.reason(reason)}</p>`
    out.push({
      id: nextId('citationNeeded'),
      type: 'citationNeeded',
      mode: 'suggestion',
      title: S.citationNeeded.title,
      descriptionHtml: description,
      footerHtml: S.citationNeeded.footer,
      footerIcon: 'userAvatar',
      choices: [{ action: 'add', label: S.citationNeeded.accept }, DISMISS],
      ranges: [elementRange(anchor)],
      element: anchor,
    })
  })
  return out
}

// ── convertReference ─────────────────────────────────────────────────────────

const URL_PROTOCOLS =
  '(?:bitcoin:|ftp://|ftps://|geo:|git://|gopher://|http://|https://|irc://|ircs://|magnet:|mailto:|matrix:|mms://|news:|nntp://|redis://|sftp://|sip:|sips:|sms:|ssh://|svn://|tel:|telnet://|urn:|worldwind://|xmpp:|//)'
const URL_ONLY_RE = new RegExp(`^${URL_PROTOCOLS}\\S+$`, 'i')

function referenceBody(ref: Element): Element | null {
  const mw = readDataMw(ref)
  const id = mw?.body?.id
  if (id) return ref.ownerDocument.getElementById(id)
  if (mw?.body?.html) {
    const holder = ref.ownerDocument.createElement('div')
    holder.innerHTML = mw.body.html
    return holder
  }
  return null
}

export function detectConvertReference(d: DetectContext): Finding[] {
  const out: Finding[] = []
  const seen = new Set<string>()
  d.ctx.root.querySelectorAll('sup.mw-ref[typeof~="mw:Extension/ref"]').forEach((ref) => {
    if (isInReferenceList(ref)) return
    const body = referenceBody(ref)
    if (!body) return
    const key = body.id || readDataMw(ref)?.body?.html || ''
    if (seen.has(key)) return
    seen.add(key)

    const hrefs = new Set<string>()
    body.querySelectorAll('a[rel~="mw:ExtLink"]').forEach((a) => hrefs.add(a.getAttribute('href') ?? ''))
    if (hrefs.size !== 1) return
    const href = [...hrefs][0]
    try {
      const ext = new URL(href, 'https://x').pathname.split('.').pop()?.toLowerCase()
      if (ext === 'pdf') return
    } catch {
      /* unparseable URLs are allowed */
    }
    const text = (body.textContent ?? '').trim()
    const bareNumbered =
      body.querySelectorAll('a').length === 1 && !!body.querySelector('a.external.autonumber') && text === ''
    if (!bareNumbered && !URL_ONLY_RE.test(text)) return
    out.push({
      id: nextId('convertReference'),
      type: 'convertReference',
      mode: 'suggestion',
      title: S.convertReference.title,
      descriptionHtml: S.convertReference.description,
      choices: [{ action: 'convert', label: S.convertReference.accept }, DISMISS],
      ranges: [elementRange(ref)],
      element: ref,
      data: { href, body },
    })
  })
  return out
}

// ── disambiguation ───────────────────────────────────────────────────────────

export async function detectDisambiguation(d: DetectContext): Promise<Finding[]> {
  const candidates: { a: HTMLAnchorElement; title: string }[] = []
  for (const info of d.blocks) {
    if (!isInValidSection(info, {})) continue
    for (const a of internalLinksIn(d.runs.get(info.block)!)) {
      const parsed = parseWikiHref(a.getAttribute('href'))
      if (!parsed || parsed.fragment) continue
      candidates.push({ a, title: parsed.title })
    }
  }
  if (!candidates.length) return []
  const disambig = await fetchDisambiguationTitles(d.host, candidates.map((c) => c.title))
  return candidates
    .filter((c) => disambig.has(c.title))
    .map((c) => ({
      id: nextId('disambiguation'),
      type: 'disambiguation' as const,
      mode: 'suggestion' as const,
      title: S.disambiguation.title,
      descriptionHtml: S.disambiguation.description,
      choices: [{ action: 'edit' as const, label: S.disambiguation.accept }, DISMISS],
      ranges: [contentsRange(c.a)],
      element: c.a,
      data: { link: c.a, title: c.title },
    }))
}

// ── doubleBold ───────────────────────────────────────────────────────────────

export function detectDoubleBold(d: DetectContext): Finding[] {
  const out: Finding[] = []
  for (const info of d.blocks) {
    const level = headingLevel(info.block)
    const qualifies =
      (level !== null && level >= 3) || info.block.tagName === 'TH' || info.block.tagName === 'DT'
    if (!qualifies || !isInValidSection(info, {})) continue
    const run = d.runs.get(info.block)!
    const bolds = new Set<Element>()
    for (const seg of run.segments) {
      const b = seg.node.parentElement?.closest('b, strong')
      if (b && info.block.contains(b)) bolds.add(b)
    }
    for (const b of bolds) {
      out.push({
        id: nextId('doubleBold'),
        type: 'doubleBold',
        mode: 'suggestion',
        title: S.doubleBold.title,
        descriptionHtml: S.doubleBold.description,
        choices: [{ action: 'remove', label: S.doubleBold.accept }, DISMISS],
        ranges: [contentsRange(b)],
        element: b,
      })
    }
  }
  return out
}

// ── duplicateLink (+ adjacent) ───────────────────────────────────────────────

export function detectDuplicateLink(d: DetectContext): Finding[] {
  const linkKey = (a: Element) => {
    const parsed = parseWikiHref(a.getAttribute('href'))
    return parsed ? parsed.title + (parsed.fragment ? `#${parsed.fragment}` : '') : null
  }
  const counts = new Map<string, number>()
  for (const info of d.blocks) {
    for (const a of internalLinksIn(d.runs.get(info.block)!)) {
      const key = linkKey(a)
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  const out: Finding[] = []
  for (const info of d.blocks) {
    if (!info.isTopLevelParagraph || !isInValidSection(info, {})) continue
    const byKey = new Map<string, HTMLAnchorElement[]>()
    for (const a of internalLinksIn(d.runs.get(info.block)!)) {
      const key = linkKey(a)
      if (!key || (counts.get(key) ?? 0) < 2) continue
      byKey.set(key, [...(byKey.get(key) ?? []), a])
    }
    for (const links of byKey.values()) {
      if (links.length < 2) continue
      const adjacent = links.every((a, i) => {
        if (i === 0) return true
        const between = d.ctx.root.ownerDocument.createRange()
        between.setStartAfter(links[i - 1])
        between.setEndBefore(a)
        const frag = between.cloneContents()
        return !frag.querySelector('*') && /^\s*$/.test(frag.textContent ?? '')
      })
      links.slice(1).forEach((a) => {
        const others = links.filter((l) => l !== a)
        const strings = adjacent ? S.adjacentLink : S.duplicateLink
        out.push({
          id: nextId('duplicateLink'),
          type: 'duplicateLink',
          mode: 'suggestion',
          title: strings.title,
          descriptionHtml: strings.description,
          choices: [{ action: adjacent ? 'merge' : 'remove', label: strings.accept }, DISMISS],
          ranges: [contentsRange(a), ...others.map((o) => contentsRange(o))],
          element: a,
          data: { link: a, links, adjacent },
        })
      })
    }
  }
  return out
}

// ── externalLink ─────────────────────────────────────────────────────────────

/** enwiki `MediaWiki:Editcheck-config.json` → `externalLink.ignoreSections`. */
const EXTERNAL_LINK_CONFIG = {
  ignoreSections: [
    'notes',
    'notes and references',
    'references',
    'references and further reading',
    'sources',
    'footnotes',
    'citations',
    'external links',
    'external websites',
    'weblinks',
    'see also',
    'further reading',
    'bibliography',
    'publications',
    'works',
  ],
}

export async function detectExternalLink(d: DetectContext): Promise<Finding[]> {
  const interwiki = await fetchInterwikiPatterns(d.host)
  const out: Finding[] = []
  for (const info of d.blocks) {
    if (!isInValidSection(info, { ignoreSections: EXTERNAL_LINK_CONFIG.ignoreSections })) continue
    const run = d.runs.get(info.block)!
    const anchors = new Set<HTMLAnchorElement>()
    for (const seg of run.segments) {
      const a = seg.node.parentElement?.closest('a') as HTMLAnchorElement | null
      if (!a || !info.block.contains(a)) continue
      const rel = (a.getAttribute('rel') ?? '').split(/\s+/)
      if (rel.includes('mw:ExtLink') || rel.includes('mw:WikiLink/Interwiki')) anchors.add(a)
    }
    for (const a of anchors) {
      if (!(a.textContent ?? '').trim()) continue
      const href = a.getAttribute('href') ?? ''
      if (interwiki.some((re) => re.test(href))) continue
      out.push({
        id: nextId('externalLink'),
        type: 'externalLink',
        mode: 'suggestion',
        title: S.externalLink.title,
        descriptionHtml: S.externalLink.description,
        choices: [{ action: 'remove', label: S.externalLink.accept }, DISMISS],
        ranges: [contentsRange(a)],
        element: a,
      })
    }
  }
  return out
}

// ── headingLevel ─────────────────────────────────────────────────────────────

export function detectHeadingLevel(d: DetectContext): Finding[] {
  const out: Finding[] = []
  let previous: number | null = null
  for (const info of d.blocks) {
    const level = headingLevel(info.block)
    if (level === null) continue
    if (previous !== null && level - previous > 1) {
      out.push({
        id: nextId('headingLevel'),
        type: 'headingLevel',
        mode: 'suggestion',
        title: S.headingLevel.title,
        descriptionHtml: S.headingLevel.description,
        choices: [{ action: 'fix', label: S.headingLevel.accept }, DISMISS],
        ranges: [contentsRange(info.block)],
        element: info.block,
        data: { heading: info.block, targetLevel: previous + 1 },
      })
    }
    previous = level
  }
  return out
}

// ── imageCaption ─────────────────────────────────────────────────────────────

export function detectImageCaption(d: DetectContext): Finding[] {
  const out: Finding[] = []
  d.ctx.root.querySelectorAll('figure[typeof]').forEach((figure) => {
    if (figure.parentElement && hasOpaqueAncestor(figure.parentElement, d.ctx)) return
    if (isInReferenceList(figure)) return
    const first = (figure.getAttribute('typeof') ?? '').split(/\s+/)[0]
    if (!/^mw:(File|Image|Video|Audio)\/Thumb$/.test(first)) return
    const caption = figure.querySelector(':scope > figcaption')
    const empty = !caption || (!caption.children.length && !(caption.textContent ?? '').trim())
    if (!empty) return
    out.push({
      id: nextId('imageCaption'),
      type: 'imageCaption',
      mode: 'suggestion',
      title: S.imageCaption.title,
      descriptionHtml: S.imageCaption.description,
      choices: [{ action: 'edit', label: S.imageCaption.accept }, DISMISS],
      ranges: [elementRange(figure)],
      element: figure,
      data: { figure },
    })
  })
  return out
}

// ── suggestedLink ────────────────────────────────────────────────────────────

/** enwiki `MediaWiki:GrowthExperimentsSuggestedEdits.json` → `link_recommendation`. */
const GROWTH_LINK_CONFIG = {
  excludedSections: [
    '',
    'notes',
    'notes and references',
    'references',
    'sources',
    'external links',
    'weblinks',
    'see also',
    'further reading',
    'bibliography',
    'publications',
    'works',
  ],
  excludedCategories: ['Candidates for speedy deletion', 'Articles for deletion'],
  excludedTemplates: ['No newcomer task'],
}

export async function detectSuggestedLink(d: DetectContext): Promise<Finding[]> {
  if (d.isDisambiguationPage || !d.host.endsWith('.wikipedia.org')) return []
  if (GROWTH_LINK_CONFIG.excludedCategories.some((c) => d.categories.includes(c))) return []
  if (GROWTH_LINK_CONFIG.excludedTemplates.some((t) => d.templates.has(t))) return []
  const recs = await fetchLinkRecommendations(d.lang, d.title)
  if (!recs.length) return []

  const runs = d.blocks.map((b) => d.runs.get(b.block)!)
  const out: Finding[] = []
  for (const rec of recs) {
    if (rec.score < 0.8) continue
    const needle = rec.context_before + rec.link_text + rec.context_after
    if (!needle) continue
    const matches: { run: ContentRun; index: number }[] = []
    for (const run of runs) {
      let from = 0
      for (;;) {
        const i = run.text.indexOf(needle, from)
        if (i === -1) break
        matches.push({ run, index: i })
        from = i + 1
      }
    }
    const match = matches[rec.match_index]
    if (!match) continue
    const start = match.index + rec.context_before.length
    const end = start + rec.link_text.length
    if (start === end) continue
    const range = runRange(match.run, start, end)
    if (!range || range.toString() !== rec.link_text) continue
    const info = d.blocks.find((b) => b.block === match.run.block)!
    if (!isInValidSection(info, { ignoreSections: GROWTH_LINK_CONFIG.excludedSections })) continue
    const container = range.commonAncestorContainer
    const containerEl = container.nodeType === 1 ? (container as Element) : container.parentElement
    if (containerEl?.closest('a[rel~="mw:WikiLink"]')) continue
    out.push({
      id: nextId('suggestedLink'),
      type: 'suggestedLink',
      mode: 'suggestion',
      title: S.suggestedLink.title,
      descriptionHtml: S.suggestedLink.description,
      promptHtml: S.suggestedLink.prompt(rec.link_text, rec.link_target),
      footerHtml: S.suggestedLink.footer,
      footerIcon: 'robot',
      choices: [{ action: 'accept', label: S.suggestedLink.accept }, DISMISS],
      ranges: [range],
      data: { target: rec.link_target },
    })
  }
  return out
}

// ── textMatch ────────────────────────────────────────────────────────────────

interface TextMatchRule {
  id: 'cliches' | 'relative-time-ref' | 'editorializing' | 'potential-LLM'
  title: string
  message: string
  mode: 'replace' | 'delete' | 'info' | ''
  isRegExp: boolean
  caseSensitive: boolean
  query: string[]
  ignoreQuotedContent?: boolean
  ignoreLeadSection?: boolean
  minOccurrences?: number
  expand?: 'paragraph'
}

/** Beta `textMatch.matchRules` (test rules excluded). */
export const TEXT_MATCH_RULES: TextMatchRule[] = [
  {
    id: 'cliches',
    title: 'Cliches and idioms',
    message:
      'Clichés and idioms should generally be avoided in favor of direct, literal expressions.',
    mode: 'replace',
    isRegExp: true,
    caseSensitive: true,
    ignoreQuotedContent: true,
    query: [
      'tip of the iceberg',
      'white (elephant|dog)',
      'gild the (lily|rose)',
      '(take|took) the plunge',
      'ace up the sleeve',
      'bird in the hand',
      'twist of fate',
      'at the end of the day',
    ],
  },
  {
    id: 'relative-time-ref',
    title: 'Relative time references',
    message:
      'Absolute specifications of time are preferred to relative constructions such as this, because the latter may go out of date.',
    mode: 'info',
    isRegExp: true,
    caseSensitive: false,
    query: [
      'recently',
      'lately',
      'currently',
      'today',
      'presently',
      '(to|till) date',
      '(days|weeks|months|years) ago',
      'formerly',
      'in the (past|future)',
      'traditionally',
      'yesterday',
      'tomorrow',
      'to this day',
      'soon(er|est)',
    ],
  },
  {
    id: 'editorializing',
    title: 'Editorializing',
    message:
      'Use of adverbs such as these, to highlight something as particularly significant or certain without attributing that opinion, should usually be avoided so as to maintain an impartial tone.',
    mode: 'delete',
    isRegExp: true,
    caseSensitive: false,
    ignoreLeadSection: true,
    query: [
      'notably',
      'it should be noted',
      'arguably',
      'interestingly',
      'essentially',
      'utterly',
      'actually',
      'only',
      'clearly',
      'absolutely',
      'of course',
      'without a doubt',
      'indeed',
      'happily',
      'sadly',
      'tragically',
      'aptly',
      'unfortunately',
      'untimely',
    ],
  },
  {
    id: 'potential-LLM',
    title: 'Potential LLM content',
    message:
      'Is this LLM-generated content? Every edit that incorporates LLM output should be marked as LLM-assisted by identifying the name and, if possible, version of the AI in the edit summary.',
    mode: '',
    isRegExp: false,
    caseSensitive: true,
    minOccurrences: 5,
    expand: 'paragraph',
    query: ['In summary'],
  },
]

function textMatchChoices(rule: TextMatchRule): Choice[] {
  // `cliches` is replace mode with an array query (no replacement words), so
  // there is nothing to replace with — only Dismiss is offered.
  if (rule.mode === 'delete') return [{ action: 'delete', label: STR.delete }, DISMISS]
  return [DISMISS]
}

export function detectTextMatch(d: DetectContext): Finding[] {
  const out: Finding[] = []
  for (const rule of TEXT_MATCH_RULES) {
    const flags = 'g' + (rule.caseSensitive ? '' : 'i')
    const regex = rule.isRegExp
      ? new RegExp(rule.query.join('|'), flags)
      : new RegExp(rule.query.map((q) => q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), flags)
    for (const info of d.blocks) {
      if (!isInValidSection(info, { ignoreLeadSection: rule.ignoreLeadSection })) continue
      const run = d.runs.get(info.block)!
      const matches: { start: number; end: number }[] = []
      regex.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = regex.exec(run.text))) {
        const start = m.index
        const end = start + m[0].length
        regex.lastIndex = start + 1
        if (!m[0] || run.text.slice(start, end).includes('￼')) continue
        if (!isWholeWord(run.text, start, end)) continue
        if (rule.ignoreQuotedContent && isOffsetQuoted(run, start)) continue
        matches.push({ start, end })
      }
      if (!matches.length) continue
      const base = {
        type: `textMatch-${rule.id}` as SuggestionTypeId,
        mode: 'suggestion' as const,
        title: rule.title,
        descriptionHtml: rule.message,
        choices: textMatchChoices(rule),
        data: { rule: rule.id },
      }
      if (rule.expand === 'paragraph') {
        if (matches.length >= (rule.minOccurrences ?? 1)) {
          out.push({ ...base, id: nextId(base.type), ranges: [contentsRange(info.block)] })
        }
        continue
      }
      for (const { start, end } of matches) {
        const range = runRange(run, start, end)
        if (!range) continue
        out.push({ ...base, id: nextId(base.type), ranges: [range] })
      }
    }
  }
  return out
}

// ── tone ─────────────────────────────────────────────────────────────────────

/** `getText(true)`: inline objects become one `\n` per linear position. */
function toneText(run: ContentRun): string {
  return run.text.replace(/￼/g, '\n')
}

export function toneFinding(block: Element, mode: 'suggestion' | 'check'): Finding {
  return {
    id: nextId('tone'),
    type: 'tone',
    mode,
    title: S.tone.title,
    descriptionHtml: S.tone.description,
    footerHtml: S.tone.footer,
    footerIcon: 'robot',
    choices: [
      { action: 'edit', label: STR.revise },
      { action: 'dismiss', label: STR.decline },
    ],
    ranges: [contentsRange(block)],
    data: { block },
  }
}

export async function detectTone(d: DetectContext): Promise<Finding[]> {
  if (!TONE_LANGUAGES.includes(d.lang)) return []
  const candidates: { block: Element; text: string }[] = []
  for (const info of d.blocks) {
    if (!isInValidSection(info, {})) continue
    const run = d.runs.get(info.block)!
    if (isOffsetQuoted(run, 0)) continue
    const text = toneText(run)
    if (!text.trim()) continue
    candidates.push({ block: info.block, text })
  }
  const flagged = await predictTone(
    candidates.map((c) => c.text),
    { lang: d.lang, title: d.title },
  )
  return candidates.filter((_, i) => flagged[i]).map((c) => toneFinding(c.block, 'suggestion'))
}

// ── yearLink ─────────────────────────────────────────────────────────────────

export function detectYearLink(d: DetectContext): Finding[] {
  const out: Finding[] = []
  for (const info of d.blocks) {
    if (!isInValidSection(info, {})) continue
    for (const a of internalLinksIn(d.runs.get(info.block)!)) {
      const parsed = parseWikiHref(a.getAttribute('href'))
      if (!parsed) continue
      const main = parsed.title.replace(/^[^:]+:/, (ns) => (/^\d/.test(ns) ? ns : ''))
      const target = /^\d{3,4}$/.exec(main)?.[0]
      if (!target) continue
      const labelYears = (a.textContent ?? '').match(/\b\d{3,4}\b/g) ?? []
      if (labelYears.length !== 1 || labelYears[0] === target) continue
      const label = labelYears[0]
      out.push({
        id: nextId('yearLink'),
        type: 'yearLink',
        mode: 'suggestion',
        title: S.yearLink.title,
        descriptionHtml: S.yearLink.description,
        choices: [
          { action: 'useTarget', label: S.yearLink.use(target) },
          { action: 'useLabel', label: S.yearLink.use(label) },
          DISMISS,
        ],
        ranges: [contentsRange(a)],
        element: a,
        data: { link: a, target, label },
      })
    }
  }
  return out
}

// ── Experimental: fakeHeading ────────────────────────────────────────────────

/** Every piece of content in the paragraph is bold (`getAnnotationsFromRange` contains bold). */
function isAllBold(run: ContentRun): boolean {
  if (!run.text.trim()) return false
  const bold = (node: Node) => !!(node.nodeType === 1 ? (node as Element) : node.parentElement)?.closest('b, strong')
  const insideBlock = (el: Element | null) => !!el && run.block.contains(el)
  for (const seg of run.segments) {
    const b = seg.node.parentElement?.closest('b, strong') ?? null
    if (!bold(seg.node) || !insideBlock(b)) return false
  }
  return run.inlineNodes.every(({ el }) => insideBlock(el.closest('b, strong')))
}

export function detectFakeHeading(d: DetectContext): Finding[] {
  const out: Finding[] = []
  for (const info of d.blocks) {
    if (!info.isTopLevelParagraph) continue
    const run = d.runs.get(info.block)!
    if (!isAllBold(run)) continue
    out.push({
      id: nextId('fakeHeading'),
      type: 'fakeHeading',
      mode: 'suggestion',
      experimental: true,
      title: X.fakeHeading.title,
      descriptionHtml: X.fakeHeading.description,
      choices: [{ action: 'fix', label: X.fakeHeading.fix }, DISMISS],
      ranges: [contentsRange(info.block)],
      data: { paragraph: info.block },
    })
  }
  return out
}

// ── Experimental: leadLength ("Improve readability") ─────────────────────────

const MAX_LEAD_WORDS = 400

export function countWords(text: string): number {
  const Segmenter = (Intl as any).Segmenter
  if (Segmenter) {
    let n = 0
    for (const seg of new Segmenter('en', { granularity: 'word' }).segment(text)) if (seg.isWordLike) n++
    return n
  }
  return text.split(/\s+/).filter(Boolean).length
}

/** Lead paragraphs: top-level `p` before the first heading (none if the page has no headings). */
export function leadParagraphs(d: DetectContext): Element[] {
  if (!d.blocks.some((b) => headingLevel(b.block) !== null)) return []
  return d.blocks.filter((b) => b.isLead && b.isTopLevelParagraph).map((b) => b.block)
}

export function leadWordCount(d: DetectContext, paragraphs: Element[]): number {
  return paragraphs.reduce((sum, p) => sum + countWords(buildRun(p, d.ctx).text.replace(/\uFFFC/g, '')), 0)
}

export function detectLeadLength(d: DetectContext): Finding[] {
  if (d.isDisambiguationPage) return []
  const paragraphs = leadParagraphs(d)
  if (!paragraphs.length || leadWordCount(d, paragraphs) <= MAX_LEAD_WORDS) return []
  const range = d.ctx.root.ownerDocument.createRange()
  range.setStart(paragraphs[0], 0)
  range.setEnd(paragraphs[paragraphs.length - 1], paragraphs[paragraphs.length - 1].childNodes.length)
  return [
    {
      id: nextId('leadLength'),
      type: 'leadLength',
      mode: 'suggestion',
      experimental: true,
      title: X.leadLength.title,
      descriptionHtml: X.leadLength.description,
      choices: [
        { action: 'edit', label: STR.revise },
        { action: 'dismiss', label: STR.decline },
      ],
      ranges: [range],
      data: { paragraphs },
    },
  ]
}

// ── Experimental: redirect ("Link to the final page") ────────────────────────

export function detectRedirect(d: DetectContext): Finding[] {
  const out: Finding[] = []
  for (const info of d.blocks) {
    if (!isInValidSection(info, {})) continue
    for (const a of internalLinksIn(d.runs.get(info.block)!)) {
      if (!a.classList.contains('mw-redirect')) continue
      const parsed = parseWikiHref(a.getAttribute('href'))
      if (!parsed) continue
      // "Compact" links ([[USA]], [[USA]]s) aren't flagged — only piped ones.
      const label = (a.textContent ?? '').trim()
      const labelTitle = label.charAt(0).toUpperCase() + label.slice(1)
      if (labelTitle.startsWith(parsed.title)) continue
      out.push({
        id: nextId('redirect'),
        type: 'redirect',
        mode: 'suggestion',
        experimental: true,
        title: X.redirect.title,
        descriptionHtml: X.redirect.description,
        choices: [{ action: 'fix', label: X.redirect.fix }, DISMISS],
        ranges: [contentsRange(a)],
        element: a,
        data: { link: a, title: parsed.title },
      })
    }
  }
  return out
}

// ── Experimental: requiredTemplateParam ──────────────────────────────────────

export async function detectRequiredTemplateParam(d: DetectContext): Promise<Finding[]> {
  const groups: { el: Element; parts: { title: string; params: Record<string, any> }[] }[] = []
  const seenAbout = new Set<string>()
  d.ctx.root.querySelectorAll('[typeof~="mw:Transclusion"]').forEach((el) => {
    if (isInReferenceList(el) || (el.parentElement && hasOpaqueAncestor(el.parentElement, d.ctx))) return
    const about = el.getAttribute('about')
    if (about) {
      if (seenAbout.has(about)) return
      seenAbout.add(about)
    }
    const parts = (readDataMw(el)?.parts ?? [])
      .map((p: any) => p?.template)
      .filter((t: any) => typeof t?.target?.href === 'string')
      .map((t: any) => ({
        title: `Template:${normalizeTemplateTitle(decodeURIComponent(t.target.href.replace(/^\.\//, '')))}`,
        params: t.params ?? {},
      }))
    if (parts.length) groups.push({ el, parts })
  })
  if (!groups.length) return []
  const specs = await fetchTemplateData(d.host, groups.flatMap((g) => g.parts.map((p) => p.title)))
  const out: Finding[] = []
  for (const group of groups) {
    const missing: { template: string; name: string; partIndex: number }[] = []
    group.parts.forEach((part, partIndex) => {
      const spec = specs.get(part.title)
      if (!spec) return
      for (const [name, param] of Object.entries(spec)) {
        if (param?.required && !String(part.params?.[name]?.wt ?? '').trim()) {
          missing.push({ template: part.title, name, partIndex })
        }
      }
    })
    if (!missing.length) continue
    out.push({
      id: nextId('requiredTemplateParam'),
      type: 'requiredTemplateParam',
      mode: 'suggestion',
      experimental: true,
      title: X.requiredTemplateParam.title,
      descriptionHtml: X.requiredTemplateParam.description,
      choices: [{ action: 'edit', label: X.requiredTemplateParam.edit }, DISMISS],
      ranges: [elementRange(group.el)],
      element: group.el,
      data: { transclusion: group.el, missing },
    })
  }
  return out
}

// ── Experimental: llmSuggestion ──────────────────────────────────────────────

export async function detectLlmSuggestion(d: DetectContext): Promise<Finding[]> {
  const suggestions = await fetchLlmSuggestions(d.host, d.lang, d.title)
  const out: Finding[] = []
  for (const s of suggestions) {
    if (!s.target) continue
    for (const info of d.blocks) {
      const run = d.runs.get(info.block)!
      const i = run.text.indexOf(s.target)
      if (i === -1) continue
      const range = runRange(run, i, i + s.target.length)
      if (!range) break
      out.push({
        id: nextId('llmSuggestion'),
        type: 'llmSuggestion',
        mode: 'suggestion',
        experimental: true,
        title: s.title ?? 'Model sourced suggestion',
        descriptionHtml:
          s.static_description ?? 'This suggestion comes from a model and should be verified before being followed',
        promptHtml: X.llmSuggestion.prompt,
        footerHtml: X.llmSuggestion.footer,
        footerIcon: 'robot',
        choices: [
          { action: 'valid', label: X.llmSuggestion.valid },
          { action: 'invalid', label: X.llmSuggestion.invalid },
        ],
        ranges: [range],
      })
      break
    }
  }
  return out
}

// ── All suggestions ──────────────────────────────────────────────────────────

export interface DetectOptions {
  /** `suggestedLink` needs ≥1000 edits (`minimumEditCount.suggestionMode`). */
  experiencedEditor: boolean
  /** `leadLength` needs ≥25 edits. */
  atLeast25Edits?: boolean
  /** Skip the slow, API-based detectors (used to count candidates while loading). */
  syncOnly?: boolean
}

/** Every suggestion on the page, sorted like `EditCheckAction.static.compareStarts`. */
export async function detectSuggestions(
  root: Element,
  page: { host: string; lang: string; title: string },
  options: DetectOptions,
): Promise<Finding[]> {
  const d = prepare(root, page)
  const citationNeeded = await fetchCitationNeededTemplates(d.host)
  const sync = [
    ...detectAddReference(d, citationNeeded),
    ...detectCitationNeeded(d, citationNeeded),
    ...detectConvertReference(d),
    ...detectDoubleBold(d),
    ...detectDuplicateLink(d),
    ...detectHeadingLevel(d),
    ...detectImageCaption(d),
    ...detectTextMatch(d),
    ...detectYearLink(d),
    ...detectFakeHeading(d),
    ...(options.atLeast25Edits !== false ? detectLeadLength(d) : []),
    ...detectRedirect(d),
  ]
  let all = sync
  if (!options.syncOnly) {
    const asyncResults = await Promise.all([
      detectDisambiguation(d),
      detectExternalLink(d),
      options.experiencedEditor ? detectSuggestedLink(d) : Promise.resolve([]),
      detectTone(d),
      detectRequiredTemplateParam(d),
      detectLlmSuggestion(d),
    ])
    all = [...sync, ...asyncResults.flat()]
  }
  return sortFindings(all)
}

export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => compareRanges(a.ranges[0], b.ranges[0]))
}

/** For the paste check: is this element opaque in VE terms? (re-exported for callers) */
export { isOpaqueElement }
