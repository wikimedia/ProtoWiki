import type { FakeWiki } from 'fakewiki'
import type { FWVeSuggestionItem, FWVeSuggestionResponse } from 'fakewiki/types'

import { formatSuggestionType, headingForSuggestionType } from './veDisplayHeadings'
import { stripLinksFromSnippetHtml, stripLinksFromWikitext } from './snippetLinkStrip'
import { normalizePageTitle } from './veSuggestionsCache'

export interface SuggestionCardData {
  cardId: string
  methodName: string
  suggestionType: string
  heading: string
  descriptionHtml: string
  rawSnippetWikitext: string
  renderedSnippetHtml: string
  cardLinkUrl: string
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
    description: (context, wiki) => createTargetDescription('Link to', context, wiki),
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
    heading: 'Add missing information',
    description: (context, wiki) => createRequiredTemplateParamDescription(context, wiki),
  },
  suggestedLink: {
    heading: 'Add link',
    description: (context, wiki) => createTargetDescription('Consider linking to', context, wiki),
  },
  textMatch: {
    heading: 'Rewrite flagged text',
    description: () => 'Replace language that may need improvement.',
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
const REDIRECT_GROUP_MAX_VISIBLE = 3
const REDIRECT_GROUP_HEADING = 'Replace redirect links'

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

function createTargetDescription(prefix: string, context: DescriptionContext, wiki: FakeWiki): string {
  const targetLabel = getTargetLabel(context)
  if (!targetLabel) return `${prefix} related article.`
  const href = escapeHtml(wiki.getPageUrl(targetLabel))
  const text = escapeHtml(targetLabel)
  return `${prefix} <a href="${href}" target="_blank" rel="noreferrer noopener">${text}</a>.`
}

function createRedirectDescription(context: DescriptionContext, wiki: FakeWiki): string {
  const suggestionData = context.suggestion.data as Record<string, unknown> | undefined
  const candidateData = context.selectedCandidate?.data as Record<string, unknown> | undefined
  const fromTarget =
    (typeof suggestionData?.target === 'string' && suggestionData.target.trim()) ||
    (typeof candidateData?.target === 'string' && candidateData.target.trim()) ||
    'this link'
  const toTarget =
    (typeof suggestionData?.finalTarget === 'string' && suggestionData.finalTarget.trim()) || ''
  const fromHref = escapeHtml(wiki.getPageUrl(fromTarget))
  const fromText = escapeHtml(fromTarget)
  if (!toTarget) {
    return `Change link from <a href="${fromHref}" target="_blank" rel="noreferrer noopener">${fromText}</a>.`
  }
  const toHref = escapeHtml(wiki.getPageUrl(toTarget))
  const toText = escapeHtml(toTarget)
  return `Change link from <a href="${fromHref}" target="_blank" rel="noreferrer noopener">${fromText}</a> to <a href="${toHref}" target="_blank" rel="noreferrer noopener">${toText}</a>.`
}

function createRequiredTemplateParamDescription(
  context: DescriptionContext,
  wiki: FakeWiki,
): string {
  const suggestionData = context.suggestion.data as Record<string, unknown> | undefined
  const templateRaw = typeof suggestionData?.template === 'string' ? suggestionData.template.trim() : ''
  const templateCore = templateRaw.replace(/^Template:/i, '').trim()
  const templatePageTitle = templateCore ? `Template:${templateCore}` : ''
  const templateHref = templatePageTitle ? escapeHtml(wiki.getPageUrl(templatePageTitle)) : ''
  const templateLabel = escapeHtml(templateCore || templateRaw || 'this template')
  const emptyNamedParams =
    Array.isArray(suggestionData?.emptyNamedParams) ?
      suggestionData.emptyNamedParams
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean)
    : []
  const allowedFieldNames = new Set(['website'])
  const allowedMissingFields = emptyNamedParams.filter((field) =>
    allowedFieldNames.has(field.toLowerCase()),
  )
  const fieldSummary =
    allowedMissingFields.length === 1 ?
      `the missing ${escapeHtml(allowedMissingFields[0] ?? '')} field`
    : emptyNamedParams.length === 0 ? 'a missing field'
    : emptyNamedParams.length === 1 ? 'a missing field'
    : 'missing fields'
  if (!templateHref) {
    return `Complete the ${templateLabel} template by adding ${fieldSummary}.`
  }
  return `Complete the <a href="${templateHref}" target="_blank" rel="noreferrer noopener">${templateLabel}</a> template by adding ${fieldSummary}.`
}

function getTemplateTitleSnippet(context: DescriptionContext): string | null {
  const candidateData = context.selectedCandidate?.data as Record<string, unknown> | undefined
  const invocation = typeof candidateData?.invocation === 'string' ? candidateData.invocation : ''
  if (!invocation) return null
  const match = invocation.match(/\|\s*title\s*=\s*([^|}]+)/i)
  const title = (match?.[1] ?? '').trim()
  return title || null
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

function formatContextualSnippetWikitext(
  contextBefore: string,
  coreText: string,
  contextAfter: string,
): string {
  const boldCore =
    coreText.startsWith("'''") && coreText.endsWith("'''") ? coreText : `'''${coreText}'''`
  return normalizeSnippetWikitext(`…${contextBefore}${boldCore}${contextAfter}…`)
}

function getSnippetWikitext(context: DescriptionContext, suggestionType: string): string {
  if (SNIPPETLESS_SUGGESTION_TYPES.has(suggestionType)) {
    return ''
  }

  if (suggestionType === 'requiredTemplateParam') {
    return normalizeSnippetWikitext(getTemplateTitleSnippet(context) ?? '')
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

function resolveBestEffortCardLink(
  wiki: FakeWiki,
  pageTitle: string,
  context: DescriptionContext,
  sectionTitleMap: Map<string, string>,
  sectionRanges: SectionRange[],
  pageSource: string,
  rawSnippet: string,
): string {
  const baseUrl = wiki.getPageUrl(pageTitle)
  const suggestionData = context.suggestion.data as Record<string, unknown> | undefined
  const candidateData = context.selectedCandidate?.data as Record<string, unknown> | undefined
  const sectionHintRaw =
    (typeof suggestionData?.section === 'string' && suggestionData.section) ||
    (typeof candidateData?.section === 'string' && candidateData.section) ||
    (typeof suggestionData?.sectionTitle === 'string' && suggestionData.sectionTitle) ||
    (typeof candidateData?.sectionTitle === 'string' && candidateData.sectionTitle) ||
    ''
  const sectionHint = sectionHintRaw.trim()
  if (sectionHint && sectionHint.toLowerCase() !== 'lead') {
    const exactSectionTitle = sectionTitleMap.get(sectionHint.toLowerCase()) ?? sectionHint
    const hash = toSectionHash(exactSectionTitle)
    return hash ? `${baseUrl}#${hash}` : baseUrl
  }
  if (rawSnippet && pageSource && sectionRanges.length > 0) {
    const exactOffset = pageSource.indexOf(rawSnippet)
    if (exactOffset >= 0) {
      const section = sectionRanges.find(
        (range) => exactOffset >= range.startOffset && exactOffset < range.endOffset,
      )
      if (section?.title) {
        const hash = toSectionHash(section.title)
        if (hash) return `${baseUrl}#${hash}`
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
        const section = sectionRanges.find(
          (range) => approxOffset >= range.startOffset && approxOffset < range.endOffset,
        )
        if (section?.title) {
          const hash = toSectionHash(section.title)
          if (hash) return `${baseUrl}#${hash}`
        }
      }
    }
  }
  return baseUrl
}

export function editUrlForSuggestionCard(
  wiki: FakeWiki,
  pageTitle: string,
  card: SuggestionCardData,
): string {
  const hashIndex = card.cardLinkUrl.indexOf('#')
  if (hashIndex >= 0) {
    const fragment = decodeURIComponent(card.cardLinkUrl.slice(hashIndex + 1))
    const sectionTitle = fragment.replace(/_/g, ' ')
    return wiki.getEditUrl(pageTitle, sectionTitle)
  }
  return wiki.getEditUrl(pageTitle)
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

export function shouldShowSnippet(card: SuggestionCardData): boolean {
  if (SNIPPETLESS_SUGGESTION_TYPES.has(card.suggestionType)) return false
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
  const selectedCandidate =
    response.candidates.find((candidate) => candidate.id === suggestion.id) ??
    response.candidates[0] ??
    null
  const display = DISPLAY_BY_TYPE[response.suggestionType] ?? {
    heading: headingForSuggestionType(response.suggestionType),
    description: () => 'Help explain where this information is coming from.',
  }
  const context = { suggestion, selectedCandidate }
  const rawSnippet = getSnippetWikitext(context, response.suggestionType)
  const renderedSnippetHtml = await renderSnippetHtml(
    wiki,
    pageTitle,
    rawSnippet,
    snippetHtmlCache,
  )

  return {
    cardId: `${methodName}-${suggestion.id}-${index}`,
    methodName,
    suggestionType: response.suggestionType,
    heading: display.heading,
    descriptionHtml: display.description(context, wiki),
    rawSnippetWikitext: rawSnippet,
    renderedSnippetHtml,
    cardLinkUrl: resolveBestEffortCardLink(
      wiki,
      pageTitle,
      context,
      sectionTitleMap,
      sectionRanges,
      pageSource,
      rawSnippet,
    ),
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
): SuggestionCardData {
  const selectedCandidate =
    response.candidates.find((candidate) => candidate.id === suggestion.id) ??
    response.candidates[0] ??
    null
  const display = DISPLAY_BY_TYPE[response.suggestionType] ?? {
    heading: formatSuggestionType(response.suggestionType),
    description: () => 'Help explain where this information is coming from.',
  }
  const context = { suggestion, selectedCandidate }
  const rawSnippet = getSnippetWikitext(context, response.suggestionType)
  const cachedHtml = rawSnippet ?
    snippetHtmlByKey[snippetCacheKey(pageTitle, rawSnippet)]
  : undefined
  const renderedSnippetHtml =
    cachedHtml && cachedHtml !== rawSnippet ?
      stripLinksFromSnippetHtml(cachedHtml)
    : ''

  return {
    cardId: `${methodName}-${suggestion.id}-${index}`,
    methodName,
    suggestionType: response.suggestionType,
    heading: display.heading,
    descriptionHtml: display.description(context, wiki),
    rawSnippetWikitext: rawSnippet,
    renderedSnippetHtml,
    cardLinkUrl: wiki.getPageUrl(response.pageTitle),
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
    rawSnippetWikitext: '',
    renderedSnippetHtml: '',
    cardLinkUrl: first.cardLinkUrl,
    raw: first.raw,
    groupedSuggestions: cards.map((card) => card.raw),
    diagnostics: first.diagnostics,
    responseMeta: first.responseMeta,
  }
}
