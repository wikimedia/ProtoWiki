import type { FakeWiki } from 'fakewiki'
import type { FWVeSuggestionItem, FWVeSuggestionResponse } from 'fakewiki/types'

import { formatSuggestionType, headingForSuggestionType } from './veDisplayHeadings'
import { stripLinksFromSnippetHtml, stripLinksFromWikitext } from './snippetLinkStrip'
import { normalizePageTitle } from './veSuggestionsCache'

export type SuggestionDescriptionPart =
  | { kind: 'text'; text: string }
  | { kind: 'link'; label: string; href: string }

export interface SuggestionCardData {
  cardId: string
  methodName: string
  suggestionType: string
  heading: string
  descriptionHtml: string
  descriptionParts: SuggestionDescriptionPart[]
  rawSnippetWikitext: string
  renderedSnippetHtml: string
  cardLinkUrl: string
  /** MediaWiki section index (0 = lead) for VisualEditor edit links. */
  editSectionIndex?: number
  raw: FWVeSuggestionItem
  groupedSuggestions?: FWVeSuggestionItem[]
  diagnostics?: FWVeSuggestionResponse['diagnostics']
  responseMeta: Pick<FWVeSuggestionResponse, 'pageTitle' | 'pageId' | 'candidates'>
}

export interface SectionRange {
  title: string
  startOffset: number
  endOffset: number
}

type DescriptionContext = {
  suggestion: FWVeSuggestionItem
  selectedCandidate: {
    id: string
    text?: string
    context?: string
    data?: Record<string, unknown>
  } | null
}

type SuggestionDisplayConfig = {
  heading: string
  description: (context: DescriptionContext, wiki: FakeWiki) => string
}

const DISPLAY_BY_TYPE: Record<string, SuggestionDisplayConfig> = {
  addReference: {
    heading: 'Add reference',
    description: () => 'Help explain where this information is coming from.',
  },
  citationNeeded: {
    heading: 'Add citation needed',
    description: () => 'Flag this statement as needing a source.',
  },
  convertReference: {
    heading: 'Convert reference',
    description: () => 'Replace this with a formatted reference.',
  },
  disambiguation: {
    heading: 'Fix disambiguation link',
    description: (context, wiki) => createTargetDescription('Link to', context, wiki),
  },
  doubleBold: {
    heading: 'Remove bold formatting',
    description: () => 'Avoid extra emphasis in this part of the article.',
  },
  duplicateLink: {
    heading: 'Remove duplicate link',
    description: (context, wiki) => createTargetDescription('Remove link to', context, wiki),
  },
  externalLink: {
    heading: 'Remove external link',
    description: () => 'Keep external links out of body text where possible.',
  },
  fakeHeading: {
    heading: 'Convert fake heading',
    description: () => 'Use a real section heading format instead.',
  },
  imageCaption: {
    heading: 'Improve image caption',
    description: () => 'Make the caption more descriptive for readers.',
  },
  redirect: {
    heading: 'Replace redirect link',
    description: (context, wiki) => createRedirectDescription(context, wiki),
  },
  requiredTemplateParam: {
    heading: 'Complete the citation',
    description: (context) => createRequiredTemplateParamDescription(context),
  },
  suggestedLink: {
    heading: 'Add link',
    description: (context, wiki) => createTargetDescription('Consider linking to', context, wiki),
  },
  textMatch: {
    heading: 'Rewrite flagged text',
    description: () => 'Replace or remove AI-generated text.',
  },
  tone: {
    heading: 'Adjust tone',
    description: () => 'Make this wording more neutral and encyclopedic.',
  },
  yearLink: {
    heading: 'Fix year link',
    description: () => 'Match the linked year to the intended text.',
  },
}

const SNIPPETLESS_SUGGESTION_TYPES = new Set(['redirect'])
/** Link suggestions where a lone bold label adds nothing beyond the description. */
const LABEL_ONLY_SNIPPETLESS_LINK_TYPES = new Set([
  'duplicateLink',
  'disambiguation',
  'suggestedLink',
])
const REDIRECT_GROUP_MAX_VISIBLE = 3
const REDIRECT_GROUP_HEADING = 'Replace redirect links'

type KnownRequiredTemplateConfig = {
  /** Normalized template names (lowercase, no Template: prefix). */
  names: ReadonlySet<string>
  /** When set, only these empty params qualify; otherwise any empty param qualifies. */
  allowedMissingFields?: ReadonlySet<string>
  heading: string
  description: (missingFields: string[]) => string
}

const CITE_WEB_FIELD_LABELS: Record<string, string> = {
  website: 'website',
  last: 'author last name',
  first: 'author first name',
  author: 'author',
  date: 'date',
  'access-date': 'access date',
  url: 'URL',
  title: 'title',
  publisher: 'publisher',
  work: 'work',
}

function humanizeMissingFieldName(field: string): string {
  return CITE_WEB_FIELD_LABELS[field.toLowerCase()] ?? field.replace(/-/g, ' ')
}

/** Hardcoded display + eligibility rules for required-template-param suggestions. */
const KNOWN_REQUIRED_TEMPLATE_CONFIGS: KnownRequiredTemplateConfig[] = [
  {
    names: new Set(['cite web']),
    heading: 'Complete the citation',
    description: (missingFields) => {
      if (missingFields.length === 1) {
        return `Add the missing ${humanizeMissingFieldName(missingFields[0] ?? '')}.`
      }
      return 'Add the missing information.'
    },
  },
]

function normalizeTemplateName(raw: string): string {
  return raw
    .replace(/^Template:/i, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function getKnownRequiredTemplateConfig(
  context: DescriptionContext,
): KnownRequiredTemplateConfig | null {
  const suggestionData = context.suggestion.data as Record<string, unknown> | undefined
  const templateRaw =
    typeof suggestionData?.template === 'string' ? suggestionData.template.trim() : ''
  if (!templateRaw) return null
  const normalized = normalizeTemplateName(templateRaw)
  return KNOWN_REQUIRED_TEMPLATE_CONFIGS.find((config) => config.names.has(normalized)) ?? null
}

function getAllowedMissingFields(
  context: DescriptionContext,
  config: KnownRequiredTemplateConfig,
): string[] {
  const suggestionData = context.suggestion.data as Record<string, unknown> | undefined
  const emptyNamedParams = Array.isArray(suggestionData?.emptyNamedParams)
    ? suggestionData.emptyNamedParams
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean)
    : []
  return emptyNamedParams.filter((field) => {
    if (!config.allowedMissingFields) return true
    return config.allowedMissingFields.has(field.toLowerCase())
  })
}

export function isEligibleRequiredTemplateParam(context: DescriptionContext): boolean {
  const config = getKnownRequiredTemplateConfig(context)
  if (!config) return false
  return getAllowedMissingFields(context, config).length > 0
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function toSectionHash(sectionTitle: string): string {
  const normalized = sectionTitle.trim().replaceAll(' ', '_')
  if (!normalized) return ''
  return encodeURIComponent(normalized)
}

function getTargetLabel(context: DescriptionContext): string | null {
  const suggestionData = context.suggestion.data as Record<string, unknown> | undefined
  const candidateData = context.selectedCandidate?.data as Record<string, unknown> | undefined
  const target =
    (typeof suggestionData?.target === 'string' && suggestionData.target) ||
    (typeof candidateData?.target === 'string' && candidateData.target) ||
    null
  return target?.trim() || null
}

function textDescriptionPart(text: string): SuggestionDescriptionPart {
  return { kind: 'text', text }
}

function linkDescriptionPart(label: string, href: string): SuggestionDescriptionPart {
  return { kind: 'link', label, href }
}

function createTargetDescriptionParts(
  prefix: string,
  context: DescriptionContext,
  wiki: FakeWiki,
): SuggestionDescriptionPart[] {
  const targetLabel = getTargetLabel(context)
  if (!targetLabel) return [textDescriptionPart(`${prefix} related article.`)]
  return [
    textDescriptionPart(`${prefix} `),
    linkDescriptionPart(targetLabel, wiki.getPageUrl(targetLabel)),
    textDescriptionPart('.'),
  ]
}

function createTargetDescription(
  prefix: string,
  context: DescriptionContext,
  wiki: FakeWiki,
): string {
  return descriptionPartsToHtml(createTargetDescriptionParts(prefix, context, wiki))
}

function createRedirectDescriptionParts(
  context: DescriptionContext,
  wiki: FakeWiki,
): SuggestionDescriptionPart[] {
  const suggestionData = context.suggestion.data as Record<string, unknown> | undefined
  const candidateData = context.selectedCandidate?.data as Record<string, unknown> | undefined
  const fromTarget =
    (typeof suggestionData?.target === 'string' && suggestionData.target.trim()) ||
    (typeof candidateData?.target === 'string' && candidateData.target.trim()) ||
    'this link'
  const toTarget =
    (typeof suggestionData?.finalTarget === 'string' && suggestionData.finalTarget.trim()) || ''

  if (!toTarget) {
    return [
      textDescriptionPart('Change link from '),
      linkDescriptionPart(fromTarget, wiki.getPageUrl(fromTarget)),
      textDescriptionPart('.'),
    ]
  }

  return [
    textDescriptionPart('Change link from '),
    linkDescriptionPart(fromTarget, wiki.getPageUrl(fromTarget)),
    textDescriptionPart(' to '),
    linkDescriptionPart(toTarget, wiki.getPageUrl(toTarget)),
    textDescriptionPart('.'),
  ]
}

function descriptionPartsToHtml(parts: SuggestionDescriptionPart[]): string {
  return parts
    .map((part) => {
      if (part.kind === 'text') return escapeHtml(part.text)
      const href = escapeHtml(part.href)
      const label = escapeHtml(part.label)
      return `<a href="${href}" target="_blank" rel="noreferrer noopener">${label}</a>`
    })
    .join('')
}

function createRedirectDescription(context: DescriptionContext, wiki: FakeWiki): string {
  return descriptionPartsToHtml(createRedirectDescriptionParts(context, wiki))
}

function buildDescriptionParts(
  context: DescriptionContext,
  suggestionType: string,
  wiki: FakeWiki,
  plainDescription: string,
): SuggestionDescriptionPart[] {
  if (suggestionType === 'disambiguation') {
    return createTargetDescriptionParts('Link to', context, wiki)
  }
  if (suggestionType === 'duplicateLink') {
    return createTargetDescriptionParts('Remove link to', context, wiki)
  }
  if (suggestionType === 'suggestedLink') {
    return createTargetDescriptionParts('Consider linking to', context, wiki)
  }
  if (suggestionType === 'redirect') {
    return createRedirectDescriptionParts(context, wiki)
  }
  return plainDescription ? [textDescriptionPart(plainDescription)] : []
}

export function hydrateCardDescriptionParts(
  card: SuggestionCardData,
  wiki: FakeWiki,
): SuggestionCardData {
  if (card.descriptionParts?.length) return card

  const context: DescriptionContext = {
    suggestion: card.raw,
    selectedCandidate:
      card.responseMeta.candidates.find((candidate) => candidate.id === card.raw.id) ??
      card.responseMeta.candidates[0] ??
      null,
  }
  const display = DISPLAY_BY_TYPE[card.suggestionType]
  const plainDescription =
    display?.description(context, wiki) ?? card.descriptionHtml.replace(/<[^>]+>/g, '').trim()
  const descriptionParts = buildDescriptionParts(
    context,
    card.suggestionType,
    wiki,
    plainDescription,
  )

  return {
    ...card,
    descriptionParts,
    descriptionHtml: descriptionPartsToHtml(descriptionParts),
  }
}

function createRequiredTemplateParamDescription(context: DescriptionContext): string {
  const config = getKnownRequiredTemplateConfig(context)
  if (!config) return ''
  return config.description(getAllowedMissingFields(context, config))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Turn MediaWiki template escapes (e.g. {{!}}) into readable text for snippets. */
function decodeTemplateParamValue(raw: string): string {
  return raw
    .trim()
    .replace(/\{\{!\}\}/gi, '|')
    .replace(/\{\{=\}\}/gi, '=')
}

const TEMPLATE_PARAM_MAGICS = ['{{!}}', '{{=}}'] as const

function tryConsumeTemplateParamMagic(
  invocation: string,
  index: number,
): { consumed: string; length: number } | null {
  const tail = invocation.slice(index).toLowerCase()
  for (const magic of TEMPLATE_PARAM_MAGICS) {
    if (tail.startsWith(magic)) {
      return { consumed: invocation.slice(index, index + magic.length), length: magic.length }
    }
  }
  return null
}

/**
 * Read a named parameter from template invocation wikitext.
 * Pipes inside values are escaped as {{!}} — a naive [^|}]+ capture stops at the first `}`.
 */
function readTemplateParamRawValue(invocation: string, fieldName: string): string | null {
  const fieldPattern = new RegExp(`\\|\\s*${escapeRegExp(fieldName)}\\s*=`, 'i')
  const match = fieldPattern.exec(invocation)
  if (!match) return null

  let value = ''
  for (let i = match.index + match[0].length; i < invocation.length; i += 1) {
    const magic = tryConsumeTemplateParamMagic(invocation, i)
    if (magic) {
      value += magic.consumed
      i += magic.length - 1
      continue
    }
    const ch = invocation[i]
    if (ch === '|') break
    if (ch === '}' && invocation[i + 1] === '}') break
    value += ch
  }

  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function getTemplateInvocationField(context: DescriptionContext, fieldName: string): string | null {
  const candidateData = context.selectedCandidate?.data as Record<string, unknown> | undefined
  const invocation = typeof candidateData?.invocation === 'string' ? candidateData.invocation : ''
  if (!invocation) return null
  const raw = readTemplateParamRawValue(invocation, fieldName)
  if (!raw) return null
  return decodeTemplateParamValue(raw) || null
}

function getTemplateTitleSnippet(context: DescriptionContext): string | null {
  return getTemplateInvocationField(context, 'title')
}

function readContextField(
  suggestionData: Record<string, unknown> | undefined,
  candidateData: Record<string, unknown> | undefined,
  field: 'context_before' | 'context_after',
): string {
  const fromSuggestion = suggestionData?.[field]
  if (typeof fromSuggestion === 'string') return fromSuggestion
  const fromCandidate = candidateData?.[field]
  if (typeof fromCandidate === 'string') return fromCandidate
  return ''
}

function normalizeSnippetWikitext(snippet: string): string {
  return snippet.trim()
}

const CITATION_MARKER_PATTERN =
  /\{\{\s*citation\s+needed(?:\s*\|[^}]*)?\s*\}\}|\[citation needed\]/gi

function stripSnippetDecorators(snippet: string): string {
  return snippet.replace(/^…+/g, '').replace(/…+$/g, '').replace(/'''/g, '').trim()
}

/** True when the snippet includes readable prose, not only a citation-needed marker. */
function hasSubstantiveSnippetContent(snippet: string): boolean {
  const trimmed = stripSnippetDecorators(normalizeSnippetWikitext(snippet))
  if (!trimmed.length) return false
  const withoutMarkers = trimmed.replace(CITATION_MARKER_PATTERN, '').trim()
  if (!withoutMarkers.length) return false
  return /[A-Za-z]{4,}/.test(withoutMarkers)
}

function getRequiredTemplateParamSnippetWikitext(context: DescriptionContext): string {
  const config = getKnownRequiredTemplateConfig(context)
  if (!config) return ''

  // For Cite web, show the source title so editors know which reference to fix.
  if (config.names.has('cite web')) {
    const title = getTemplateTitleSnippet(context)
    if (title && hasSubstantiveSnippetContent(title)) {
      return normalizeSnippetWikitext(boldWikitext(title))
    }
    const url = getTemplateInvocationField(context, 'url')
    if (url && hasSubstantiveSnippetContent(url)) {
      return normalizeSnippetWikitext(boldWikitext(url))
    }
  }

  const suggestionData = context.suggestion.data as Record<string, unknown> | undefined
  const candidateData = context.selectedCandidate?.data as Record<string, unknown> | undefined
  const invocation =
    typeof candidateData?.invocation === 'string' ? candidateData.invocation.trim() : ''
  const coreText = context.selectedCandidate?.text?.trim() || invocation
  const contextBefore = readContextField(suggestionData, candidateData, 'context_before')
  const contextAfter = readContextField(suggestionData, candidateData, 'context_after')

  if (coreText && (contextBefore.trim() || contextAfter.trim())) {
    const snippet = formatContextualSnippetWikitext(contextBefore, coreText, contextAfter)
    if (hasSubstantiveSnippetContent(snippet)) return snippet
  }

  const candidateContext = context.selectedCandidate?.context?.trim()
  if (candidateContext && hasSubstantiveSnippetContent(candidateContext)) {
    return normalizeSnippetWikitext(candidateContext)
  }

  return ''
}

function stripInlineWikiNoise(text: string): string {
  return text
    .replace(/<ref[^>]*(?:\/>|>[\s\S]*?<\/ref>)/gi, '')
    .replace(/\{\{[^{}|]*\}\}/g, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1')
    .replace(/'{2,5}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const CITATION_NEEDED_INLINE_PATTERN = /\{\{\s*(?:citation needed|cn)\b[^}]*\}\}/i

function readCitationNeededTemplateIndex(context: DescriptionContext): number | null {
  const suggestionData = context.suggestion.data as Record<string, unknown> | undefined
  const candidateData = context.selectedCandidate?.data as Record<string, unknown> | undefined
  const index =
    typeof candidateData?.index === 'number'
      ? candidateData.index
      : typeof suggestionData?.index === 'number'
        ? suggestionData.index
        : null
  return index != null && Number.isFinite(index) && index >= 0 ? index : null
}

function extractClaimBeforeCitationNeeded(rawBefore: string): string {
  const afterLastRef = rawBefore.split(/<\/ref>/i).pop() ?? rawBefore
  const cleaned = stripInlineWikiNoise(afterLastRef)
  if (!cleaned) return ''

  const sentences = cleaned
    .match(/[^.!?]+[.!?]?/g)
    ?.map((part) => part.trim())
    .filter(Boolean)
  const lastSentence = sentences?.[sentences.length - 1]
  if (lastSentence && hasSubstantiveSnippetContent(lastSentence)) return lastSentence

  return cleaned.slice(-120).trim()
}

function extractCitationNeededSnippetFromSource(
  pageSource: string,
  templateIndex: number,
  templateText?: string,
): string {
  const lineStart = pageSource.lastIndexOf('\n', templateIndex) + 1
  const lineEndIdx = pageSource.indexOf('\n', templateIndex)
  const line = pageSource.slice(lineStart, lineEndIdx === -1 ? undefined : lineEndIdx)
  const relIndex = templateIndex - lineStart

  let templateLength = templateText?.trim().length ?? 0
  if (!templateLength) {
    const match = line.slice(relIndex).match(CITATION_NEEDED_INLINE_PATTERN)
    templateLength = match?.[0]?.length ?? 0
  }
  if (!templateLength) return ''

  const rawBefore = line.slice(0, relIndex)
  const rawAfter = line.slice(relIndex + templateLength)
  const coreText = extractClaimBeforeCitationNeeded(rawBefore)
  if (!coreText) return ''

  const beforeClean = stripInlineWikiNoise(rawBefore.split(/<\/ref>/i).pop() ?? rawBefore)
  const coreStart = beforeClean.lastIndexOf(coreText)
  const contextBefore =
    coreStart > 0 ? beforeClean.slice(Math.max(0, coreStart - 60), coreStart).trim() : ''
  const contextAfterBody = stripInlineWikiNoise(rawAfter).slice(0, 60).trim()
  const contextAfter = contextAfterBody ? ` ${contextAfterBody}` : ''

  const snippet = formatContextualSnippetWikitext(contextBefore, coreText, contextAfter)
  return hasSubstantiveSnippetContent(snippet) ? snippet : ''
}

function getCitationNeededSnippetWikitext(
  context: DescriptionContext,
  pageSource?: string,
): string {
  const suggestionData = context.suggestion.data as Record<string, unknown> | undefined
  const candidateData = context.selectedCandidate?.data as Record<string, unknown> | undefined
  const coreText =
    context.selectedCandidate?.text?.trim() ||
    (typeof suggestionData?.link_text === 'string' ? suggestionData.link_text.trim() : '') ||
    ''
  const contextBefore = readContextField(suggestionData, candidateData, 'context_before')
  const contextAfter = readContextField(suggestionData, candidateData, 'context_after')

  if (coreText && (contextBefore.trim() || contextAfter.trim())) {
    const snippet = formatContextualSnippetWikitext(contextBefore, coreText, contextAfter)
    if (hasSubstantiveSnippetContent(snippet)) return snippet
  }

  const templateIndex = readCitationNeededTemplateIndex(context)
  if (pageSource && templateIndex != null) {
    const templateText = context.selectedCandidate?.text?.trim()
    const snippet = extractCitationNeededSnippetFromSource(pageSource, templateIndex, templateText)
    if (snippet) return snippet
  }

  const candidateContext = context.selectedCandidate?.context?.trim()
  if (candidateContext && hasSubstantiveSnippetContent(candidateContext)) {
    return normalizeSnippetWikitext(candidateContext)
  }

  return ''
}

function boldWikitext(text: string): string {
  const core = text.trim()
  if (!core) return ''
  return core.startsWith("'''") && core.endsWith("'''") ? core : `'''${core}'''`
}

function formatContextualSnippetWikitext(
  contextBefore: string,
  coreText: string,
  contextAfter: string,
): string {
  return normalizeSnippetWikitext(`…${contextBefore}${boldWikitext(coreText)}${contextAfter}…`)
}

function extractWikilinkDisplayLabel(raw: string): string {
  const trimmed = raw.trim()
  const match = trimmed.match(/^\[\[(?:[^\]|]*\|)?([^\]]+)\]\]$/)
  if (match?.[1]) return match[1].trim()
  return trimmed
}

function resolveDuplicateLinkCandidate(
  candidates: FWVeSuggestionResponse['candidates'],
  suggestion: FWVeSuggestionItem,
): DescriptionContext['selectedCandidate'] {
  const parsed = suggestion.id.match(/^duplicate-(\d+)-(.+)-(\d+)$/)
  if (!parsed) return null

  const unitIndex = Number(parsed[1])
  const key = parsed[2]
  const duplicateIndex = Number(parsed[3])
  if (!Number.isFinite(unitIndex) || !Number.isFinite(duplicateIndex) || duplicateIndex < 1) {
    return null
  }

  const matching = candidates
    .filter((candidate) => {
      const data = candidate.data as Record<string, unknown> | undefined
      return data?.unitIndex === unitIndex && data?.key === key
    })
    .sort((a, b) => {
      const positionA = Number((a.data as Record<string, unknown> | undefined)?.position ?? 0)
      const positionB = Number((b.data as Record<string, unknown> | undefined)?.position ?? 0)
      return positionA - positionB
    })

  return matching[duplicateIndex] ?? null
}

function resolveSelectedCandidate(
  response: FWVeSuggestionResponse,
  suggestion: FWVeSuggestionItem,
): DescriptionContext['selectedCandidate'] {
  const directMatch = response.candidates.find((candidate) => candidate.id === suggestion.id)
  if (directMatch) return directMatch

  if (response.suggestionType === 'duplicateLink') {
    return resolveDuplicateLinkCandidate(response.candidates, suggestion)
  }

  return response.candidates[0] ?? null
}

export function isEligibleSuggestion(
  response: Pick<FWVeSuggestionResponse, 'suggestionType' | 'candidates'>,
  suggestion: FWVeSuggestionItem,
): boolean {
  if (response.suggestionType !== 'requiredTemplateParam') return true
  const context: DescriptionContext = {
    suggestion,
    selectedCandidate: resolveSelectedCandidate(response as FWVeSuggestionResponse, suggestion),
  }
  return isEligibleRequiredTemplateParam(context)
}

export function isEligibleSuggestionCard(card: SuggestionCardData): boolean {
  if (card.suggestionType !== 'requiredTemplateParam') return true
  const context: DescriptionContext = {
    suggestion: card.raw,
    selectedCandidate:
      card.responseMeta.candidates.find((candidate) => candidate.id === card.raw.id) ??
      card.responseMeta.candidates[0] ??
      null,
  }
  return isEligibleRequiredTemplateParam(context)
}

function resolveSuggestionHeading(
  response: FWVeSuggestionResponse,
  context: DescriptionContext,
): string {
  if (response.suggestionType === 'requiredTemplateParam') {
    return (
      getKnownRequiredTemplateConfig(context)?.heading ??
      headingForSuggestionType(response.suggestionType)
    )
  }
  return (
    DISPLAY_BY_TYPE[response.suggestionType]?.heading ??
    headingForSuggestionType(response.suggestionType)
  )
}

function getSnippetWikitext(
  context: DescriptionContext,
  suggestionType: string,
  pageSource?: string,
): string {
  if (SNIPPETLESS_SUGGESTION_TYPES.has(suggestionType)) {
    return ''
  }

  if (suggestionType === 'requiredTemplateParam') {
    return getRequiredTemplateParamSnippetWikitext(context)
  }

  if (suggestionType === 'citationNeeded') {
    return getCitationNeededSnippetWikitext(context, pageSource)
  }

  const suggestionData = context.suggestion.data as Record<string, unknown> | undefined
  const candidateData = context.selectedCandidate?.data as Record<string, unknown> | undefined
  const coreText =
    context.selectedCandidate?.text?.trim() ||
    (typeof suggestionData?.link_text === 'string' ? suggestionData.link_text.trim() : '') ||
    ''
  const contextBefore = readContextField(suggestionData, candidateData, 'context_before')
  const contextAfter = readContextField(suggestionData, candidateData, 'context_after')

  if (coreText && (contextBefore || contextAfter)) {
    const snippet = formatContextualSnippetWikitext(contextBefore, coreText, contextAfter)
    if (snippet) return snippet
  }

  if (suggestionType === 'duplicateLink') {
    const displayLabel =
      (coreText ? extractWikilinkDisplayLabel(coreText) : '') ||
      (typeof suggestionData?.target === 'string' ? suggestionData.target.trim() : '')
    if (displayLabel) return normalizeSnippetWikitext(boldWikitext(displayLabel))
  }

  const candidateContext = context.selectedCandidate?.context?.trim()
  if (candidateContext) return normalizeSnippetWikitext(candidateContext)

  const fallback = coreText || context.suggestion.message?.trim() || 'Snippet unavailable.'
  return normalizeSnippetWikitext(fallback)
}

export function buildSectionTitleMap(source: string): Map<string, string> {
  const out = new Map<string, string>()
  const headingRegex = /^==+\s*(.*?)\s*==+\s*$/gm
  let match: RegExpExecArray | null
  while ((match = headingRegex.exec(source)) !== null) {
    const exactTitle = (match[1] ?? '').trim()
    if (!exactTitle) continue
    out.set(exactTitle.toLowerCase(), exactTitle)
  }
  return out
}

export function buildSectionRanges(source: string): SectionRange[] {
  const headings: Array<{ title: string; offset: number }> = []
  const headingRegex = /^==+\s*(.*?)\s*==+\s*$/gm
  let match: RegExpExecArray | null
  while ((match = headingRegex.exec(source)) !== null) {
    const title = (match[1] ?? '').trim()
    if (!title) continue
    headings.push({ title, offset: match.index })
  }
  if (headings.length === 0) return []
  const out: SectionRange[] = [
    {
      title: '',
      startOffset: 0,
      endOffset: headings[0]?.offset ?? source.length,
    },
  ]
  for (let i = 0; i < headings.length; i++) {
    const current = headings[i]
    if (!current) continue
    const next = headings[i + 1]
    out.push({
      title: current.title,
      startOffset: current.offset,
      endOffset: next?.offset ?? source.length,
    })
  }
  return out
}

function sectionIndexForOffset(sectionRanges: SectionRange[], offset: number): number | undefined {
  const sectionIndex = sectionRanges.findIndex(
    (range) => offset >= range.startOffset && offset < range.endOffset,
  )
  return sectionIndex >= 0 ? sectionIndex : undefined
}

function resolveSuggestionSection(
  context: DescriptionContext,
  sectionTitleMap: Map<string, string>,
  sectionRanges: SectionRange[],
  pageSource: string,
  rawSnippet: string,
): { sectionTitle?: string; editSectionIndex?: number } {
  const suggestionData = context.suggestion.data as Record<string, unknown> | undefined
  const candidateData = context.selectedCandidate?.data as Record<string, unknown> | undefined
  const sectionHintRaw =
    (typeof suggestionData?.section === 'string' && suggestionData.section) ||
    (typeof candidateData?.section === 'string' && candidateData.section) ||
    (typeof suggestionData?.sectionTitle === 'string' && suggestionData.sectionTitle) ||
    (typeof candidateData?.sectionTitle === 'string' && candidateData.sectionTitle) ||
    ''
  const sectionHint = sectionHintRaw.trim()
  if (sectionHint) {
    if (sectionHint.toLowerCase() === 'lead') {
      return { editSectionIndex: 0 }
    }
    const exactSectionTitle = sectionTitleMap.get(sectionHint.toLowerCase()) ?? sectionHint
    const sectionIndex = sectionRanges.findIndex(
      (range) => range.title.toLowerCase() === exactSectionTitle.toLowerCase(),
    )
    if (sectionIndex >= 0) {
      return { sectionTitle: exactSectionTitle, editSectionIndex: sectionIndex }
    }
    return { sectionTitle: exactSectionTitle }
  }
  if (rawSnippet && pageSource && sectionRanges.length > 0) {
    const exactOffset = pageSource.indexOf(rawSnippet)
    if (exactOffset >= 0) {
      const editSectionIndex = sectionIndexForOffset(sectionRanges, exactOffset)
      if (editSectionIndex != null) {
        const sectionTitle = sectionRanges[editSectionIndex]?.title
        return sectionTitle ? { sectionTitle, editSectionIndex } : { editSectionIndex }
      }
    }
  }
  if (rawSnippet && pageSource && sectionRanges.length > 0) {
    const compactSnippet = rawSnippet.replace(/\s+/g, ' ').trim()
    if (compactSnippet) {
      const compactSource = pageSource.replace(/\s+/g, ' ')
      const compactOffset = compactSource.indexOf(compactSnippet)
      if (compactOffset >= 0 && compactSource.length > 0) {
        const approxOffset = Math.floor((compactOffset / compactSource.length) * pageSource.length)
        const editSectionIndex = sectionIndexForOffset(sectionRanges, approxOffset)
        if (editSectionIndex != null) {
          const sectionTitle = sectionRanges[editSectionIndex]?.title
          return sectionTitle ? { sectionTitle, editSectionIndex } : { editSectionIndex }
        }
      }
    }
  }
  return {}
}

function resolveBestEffortCardLink(
  wiki: FakeWiki,
  pageTitle: string,
  context: DescriptionContext,
  sectionTitleMap: Map<string, string>,
  sectionRanges: SectionRange[],
  pageSource: string,
  rawSnippet: string,
): { cardLinkUrl: string; editSectionIndex?: number } {
  const baseUrl = wiki.getPageUrl(pageTitle)
  const resolved = resolveSuggestionSection(
    context,
    sectionTitleMap,
    sectionRanges,
    pageSource,
    rawSnippet,
  )
  if (resolved.sectionTitle) {
    const hash = toSectionHash(resolved.sectionTitle)
    return {
      cardLinkUrl: hash ? `${baseUrl}#${hash}` : baseUrl,
      editSectionIndex: resolved.editSectionIndex,
    }
  }
  if (resolved.editSectionIndex != null) {
    return { cardLinkUrl: baseUrl, editSectionIndex: resolved.editSectionIndex }
  }
  return { cardLinkUrl: baseUrl }
}

function sectionIndexFromCardLinkUrl(cardLinkUrl: string, pageSource: string): number | undefined {
  const hashIndex = cardLinkUrl.indexOf('#')
  if (hashIndex < 0) return undefined

  const fragment = decodeURIComponent(cardLinkUrl.slice(hashIndex + 1)).replace(/_/g, ' ')
  if (!fragment.trim()) return undefined

  const sectionRanges = buildSectionRanges(pageSource)
  const sectionIndex = sectionRanges.findIndex(
    (range) => range.title.toLowerCase() === fragment.trim().toLowerCase(),
  )
  return sectionIndex >= 0 ? sectionIndex : undefined
}

export function editUrlForSuggestionCard(
  wiki: FakeWiki,
  pageTitle: string,
  card: SuggestionCardData,
  pageSource?: string,
): string {
  let sectionIndex = card.editSectionIndex
  if (sectionIndex == null && pageSource) {
    sectionIndex = sectionIndexFromCardLinkUrl(card.cardLinkUrl, pageSource)
  }

  const params = `title=${wiki.encodeForUrl(pageTitle)}&action=edit&veaction=edit`
  if (sectionIndex != null && sectionIndex >= 0) {
    return `${wiki.base}w/index.php?${params}&section=${sectionIndex}`
  }
  return `${wiki.base}w/index.php?${params}`
}

function snippetCacheKey(pageTitle: string, snippet: string): string {
  return `${normalizePageTitle(pageTitle)}\0${snippet}`
}

export function isTransformedSnippetHtml(card: SuggestionCardData): boolean {
  const html = card.renderedSnippetHtml.trim()
  if (!html.length) return false
  if (html === card.rawSnippetWikitext.trim()) return false
  return html.includes('<')
}

function normalizeComparableText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function snippetPlainText(rawSnippetWikitext: string): string {
  return normalizeComparableText(
    stripSnippetDecorators(normalizeSnippetWikitext(rawSnippetWikitext)),
  )
}

function isLabelOnlySnippet(rawSnippetWikitext: string): boolean {
  const trimmed = normalizeSnippetWikitext(rawSnippetWikitext)
  if (!trimmed.length) return true
  if (trimmed.includes('{{')) return false
  if (trimmed.startsWith('…') || trimmed.endsWith('…')) return false
  return true
}

function snippetRepeatsDescription(card: SuggestionCardData): boolean {
  const snippetText = snippetPlainText(card.rawSnippetWikitext)
  if (!snippetText) return true

  for (const part of card.descriptionParts ?? []) {
    if (part.kind !== 'link') continue
    if (normalizeComparableText(part.label) === snippetText) return true
  }

  return false
}

export function shouldShowSnippet(card: SuggestionCardData): boolean {
  if (SNIPPETLESS_SUGGESTION_TYPES.has(card.suggestionType)) return false
  if (!hasSubstantiveSnippetContent(card.rawSnippetWikitext)) return false
  if (snippetRepeatsDescription(card)) return false
  if (
    LABEL_ONLY_SNIPPETLESS_LINK_TYPES.has(card.suggestionType) &&
    isLabelOnlySnippet(card.rawSnippetWikitext)
  ) {
    return false
  }
  return isTransformedSnippetHtml(card)
}

export function applySnippetHtmlFromCache(
  card: SuggestionCardData,
  pageTitle: string,
  snippetHtmlByKey: Record<string, string>,
): SuggestionCardData {
  if (!card.rawSnippetWikitext) return card
  const cachedHtml = snippetHtmlByKey[snippetCacheKey(pageTitle, card.rawSnippetWikitext)]
  if (cachedHtml && cachedHtml !== card.rawSnippetWikitext) {
    return { ...card, renderedSnippetHtml: stripLinksFromSnippetHtml(cachedHtml) }
  }
  if (isTransformedSnippetHtml(card)) return card
  return { ...card, renderedSnippetHtml: '' }
}

export function hydrateCardsFromSnippetCache(
  cards: SuggestionCardData[],
  pageTitle: string,
  snippetHtmlByKey: Record<string, string>,
): SuggestionCardData[] {
  return cards.map((card) => applySnippetHtmlFromCache(card, pageTitle, snippetHtmlByKey))
}

async function renderSnippetHtml(
  wiki: FakeWiki,
  pageTitle: string,
  snippet: string,
  snippetHtmlCache: Record<string, string>,
): Promise<string> {
  const normalizedSnippet = normalizeSnippetWikitext(snippet)
  if (!normalizedSnippet) return ''
  const key = snippetCacheKey(pageTitle, normalizedSnippet)
  const cached = snippetHtmlCache[key]
  if (cached !== undefined) return stripLinksFromSnippetHtml(cached)
  try {
    const strippedSnippet = stripLinksFromWikitext(normalizedSnippet)
    const html = await wiki.transformWikitextToHtml(strippedSnippet, pageTitle)
    const strippedHtml = stripLinksFromSnippetHtml(html)
    snippetHtmlCache[key] = strippedHtml
    return strippedHtml
  } catch {
    return normalizedSnippet
  }
}

export async function buildSuggestionCard(
  wiki: FakeWiki,
  methodName: string,
  pageTitle: string,
  response: FWVeSuggestionResponse,
  suggestion: FWVeSuggestionItem,
  index: number,
  sectionTitleMap: Map<string, string>,
  sectionRanges: SectionRange[],
  pageSource: string,
  snippetHtmlCache: Record<string, string>,
): Promise<SuggestionCardData> {
  const selectedCandidate = resolveSelectedCandidate(response, suggestion)
  const context = { suggestion, selectedCandidate }
  const display = DISPLAY_BY_TYPE[response.suggestionType] ?? {
    heading: headingForSuggestionType(response.suggestionType),
    description: () => 'Help explain where this information is coming from.',
  }
  const rawSnippet = getSnippetWikitext(context, response.suggestionType, pageSource)
  const descriptionParts = buildDescriptionParts(
    context,
    response.suggestionType,
    wiki,
    display.description(context, wiki),
  )
  const renderedSnippetHtml = await renderSnippetHtml(wiki, pageTitle, rawSnippet, snippetHtmlCache)
  const { cardLinkUrl, editSectionIndex } = resolveBestEffortCardLink(
    wiki,
    pageTitle,
    context,
    sectionTitleMap,
    sectionRanges,
    pageSource,
    rawSnippet,
  )

  return {
    cardId: `${methodName}-${suggestion.id}-${index}`,
    methodName,
    suggestionType: response.suggestionType,
    heading: resolveSuggestionHeading(response, context),
    descriptionHtml: descriptionPartsToHtml(descriptionParts),
    descriptionParts,
    rawSnippetWikitext: rawSnippet,
    renderedSnippetHtml,
    cardLinkUrl,
    editSectionIndex,
    raw: suggestion,
    diagnostics: response.diagnostics,
    responseMeta: {
      pageTitle: response.pageTitle,
      pageId: response.pageId,
      candidates: response.candidates,
    },
  }
}

export function buildFallbackCard(
  wiki: FakeWiki,
  methodName: string,
  pageTitle: string,
  response: FWVeSuggestionResponse,
  suggestion: FWVeSuggestionItem,
  index: number,
  snippetHtmlByKey: Record<string, string> = {},
  pageSource?: string,
): SuggestionCardData {
  const selectedCandidate = resolveSelectedCandidate(response, suggestion)
  const context = { suggestion, selectedCandidate }
  const display = DISPLAY_BY_TYPE[response.suggestionType] ?? {
    heading: formatSuggestionType(response.suggestionType),
    description: () => 'Help explain where this information is coming from.',
  }
  const rawSnippet = getSnippetWikitext(context, response.suggestionType, pageSource)
  const descriptionParts = buildDescriptionParts(
    context,
    response.suggestionType,
    wiki,
    display.description(context, wiki),
  )
  const cachedHtml = rawSnippet
    ? snippetHtmlByKey[snippetCacheKey(pageTitle, rawSnippet)]
    : undefined
  const renderedSnippetHtml =
    cachedHtml && cachedHtml !== rawSnippet ? stripLinksFromSnippetHtml(cachedHtml) : ''
  const sectionTitleMap = pageSource ? buildSectionTitleMap(pageSource) : new Map<string, string>()
  const sectionRanges = pageSource ? buildSectionRanges(pageSource) : []
  const { cardLinkUrl, editSectionIndex } = pageSource
    ? resolveBestEffortCardLink(
        wiki,
        pageTitle,
        context,
        sectionTitleMap,
        sectionRanges,
        pageSource,
        rawSnippet,
      )
    : { cardLinkUrl: wiki.getPageUrl(response.pageTitle) }

  return {
    cardId: `${methodName}-${suggestion.id}-${index}`,
    methodName,
    suggestionType: response.suggestionType,
    heading: resolveSuggestionHeading(response, context),
    descriptionHtml: descriptionPartsToHtml(descriptionParts),
    descriptionParts,
    rawSnippetWikitext: rawSnippet,
    renderedSnippetHtml,
    cardLinkUrl,
    editSectionIndex,
    raw: suggestion,
    diagnostics: response.diagnostics,
    responseMeta: {
      pageTitle: response.pageTitle,
      pageId: response.pageId,
      candidates: response.candidates,
    },
  }
}

export function sortCards(cards: SuggestionCardData[]): SuggestionCardData[] {
  return groupRedirectCards([...cards])
}

function groupRedirectCards(cards: SuggestionCardData[]): SuggestionCardData[] {
  const grouped: SuggestionCardData[] = []
  let redirectCards: SuggestionCardData[] = []

  function flushRedirectCards(): void {
    if (redirectCards.length === 0) return
    if (redirectCards.length === 1) {
      grouped.push(redirectCards[0]!)
    } else {
      grouped.push(buildGroupedRedirectCard(redirectCards))
    }
    redirectCards = []
  }

  for (const card of cards) {
    if (card.suggestionType === 'redirect') {
      redirectCards.push(card)
      continue
    }
    flushRedirectCards()
    grouped.push(card)
  }

  flushRedirectCards()
  return grouped
}

function formatMoreLinksLabel(count: number): string {
  return count === 1 ? '1 more link' : `${count} more links`
}

function buildGroupedRedirectDescriptionHtml(cards: SuggestionCardData[]): string {
  const visibleCards = cards.slice(0, REDIRECT_GROUP_MAX_VISIBLE)
  const lines = visibleCards.map((card) => card.descriptionHtml)
  const remainingCount = cards.length - visibleCards.length

  if (remainingCount > 0) {
    lines.push(
      `<span class="suggestion-card__more-links">${escapeHtml(formatMoreLinksLabel(remainingCount))}</span>`,
    )
  }

  return lines.join('<br>')
}

function buildGroupedRedirectCard(cards: SuggestionCardData[]): SuggestionCardData {
  const first = cards[0]!
  return {
    cardId: `${first.methodName}-redirect-group`,
    methodName: first.methodName,
    suggestionType: first.suggestionType,
    heading: REDIRECT_GROUP_HEADING,
    descriptionHtml: buildGroupedRedirectDescriptionHtml(cards),
    descriptionParts: [],
    rawSnippetWikitext: '',
    renderedSnippetHtml: '',
    cardLinkUrl: first.cardLinkUrl,
    raw: first.raw,
    groupedSuggestions: cards.map((card) => card.raw),
    diagnostics: first.diagnostics,
    responseMeta: first.responseMeta,
  }
}
