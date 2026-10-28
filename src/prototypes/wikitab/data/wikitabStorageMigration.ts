/**
 * The only place that knows old or dodgy Wikitab storage shapes.
 *
 * Runs once per page load: reads every config key that ever existed, upgrades
 * whatever it finds to the current shape as best it can, writes the result back
 * if it changed, and deletes legacy keys and stale caches. Everything else in
 * Wikitab reads the current shape only. When the shape changes, teach this file
 * to read the old form — never add a version step or a fallback elsewhere.
 */
import { CACHE_KEY as DAILY_READS_CACHE_KEY } from './dailyReadsCache'
import { CACHE_KEY as FEATURED_CACHE_KEY } from './featuredCache'
import { CACHE_KEY as FEED_CACHE_KEY, utcDayKey } from './feedCache'
import { CACHE_KEY as POTD_CACHE_KEY, wikipediaPotdPageUrl } from './fetchPictureOfTheDay'
import { CACHE_KEY as REVIEW_CHANGES_CACHE_KEY } from './reviewChangesCache'
import { listSavedId, quoteSavedId, snippetSavedId, wordSavedId } from './savedItemIds'
import { CACHE_KEY as SUGGESTED_EDITS_CACHE_KEY } from './suggestedEditsCache'
import { wikitabCardMenuArticleTitle } from './wikitabCardLinkLabel'
import type { WikitabColorThemeId } from './wikitabColorThemes'
import {
  nextWikitabConfigRevision,
  normalizePinnedSectionIds,
  normalizeWikitabConfig,
  WIKITAB_CONFIG_STORAGE_KEY,
  writeWikitabConfig,
} from './wikitabConfigNormalize'
import {
  articleTitleKey,
  articleUrl,
  discussionThreadIdFromUrl,
  EN_WIKI_HOST,
  wikiArticleUrl,
} from './wikitabHtml'
import {
  isWikitabSavedItemPrimitive,
  mergeSavedItemsById,
  normalizeSavedItems,
  wikitabSavedItemTypeToPrimitive,
  type WikitabSavedItem,
  type WikitabSavedItemType,
} from './wikitabSavedItems'
import { parseSeedArticle, seedArticle } from './wikitabSeedArticle'

const CONFIG_KEY_V2 = 'wikitab-config-v2'
const CONFIG_KEY_V1 = 'wikitab-config-v1'

const CURRENT_KEYS = new Set<string>([
  WIKITAB_CONFIG_STORAGE_KEY,
  FEED_CACHE_KEY,
  DAILY_READS_CACHE_KEY,
  SUGGESTED_EDITS_CACHE_KEY,
  REVIEW_CHANGES_CACHE_KEY,
  POTD_CACHE_KEY,
  FEATURED_CACHE_KEY,
])

const THEME_ALIASES: Record<string, WikitabColorThemeId> = {
  'gray-bold': 'off-black',
  'red-bold': 'red-light',
  'red-dark': 'red-light',
  brown: 'orange-light',
  'brown-light': 'orange-light',
  'orange-dark': 'orange-light',
  'orange-bold': 'orange-light',
  'yellow-bold': 'yellow-light',
  'yellow-dark': 'yellow-light',
  'lime-bold': 'lime-light',
  'lime-dark': 'lime-light',
  'green-dark': 'green-light',
  'blue-dark': 'blue-bold',
  'purple-dark': 'purple-bold',
  'pink-bold': 'pink-light',
  'pink-dark': 'pink-light',
  'maroon-bold': 'maroon-light',
  'maroon-dark': 'maroon-light',
}

/** Card blob stored by v2 `savedCards` and pre-typed `snippet` rows. */
interface LegacyCard {
  key: string
  url?: string
  title?: string
  description?: string
  thumbnailUrl?: string
  editUrl?: string
  suggestionBody?: string
  supportingText?: string
  supportingHtml?: string
  supportingTextEnd?: string
}

type LegacySnippetSource = 'dyk' | 'otd' | 'news' | 'featured'

const LEGACY_SNIPPET_SOURCES = new Set<string>(['dyk', 'otd', 'news', 'featured'])

type Row = Record<string, unknown>

let migrated = false

export function migrateWikitabStorage(): void {
  if (migrated || typeof window === 'undefined') return
  migrated = true

  try {
    runMigration()
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[wikitab] storage migration failed', error)
  }
}

function runMigration(): void {
  const storedRaw = readKey(WIKITAB_CONFIG_STORAGE_KEY)
  const v2Raw = readKey(CONFIG_KEY_V2)
  const v1Raw = readKey(CONFIG_KEY_V1)
  const urlPinned = readPinnedFromUrl()
  const hadLegacyKeys = v2Raw !== null || v1Raw !== null

  if (storedRaw !== null || hadLegacyKeys || urlPinned !== null) {
    const sources = [storedRaw, v2Raw, v1Raw].map(parseRow).filter((row): row is Row => !!row)
    const previous = storedRaw
      ? normalizeWikitabConfig(JSON.parse(storedRaw))
      : normalizeWikitabConfig({})
    const config = normalizeWikitabConfig(upgradeConfig(sources, urlPinned ?? []))

    if (JSON.stringify(config) !== JSON.stringify(previous)) {
      const written = writeWikitabConfig({
        ...config,
        configRevision: nextWikitabConfigRevision(config.configRevision),
      })
      if (!written) return
    }
  }

  if (hadLegacyKeys) removeLegacyConfigKeys()
  stripPinnedFromUrl()
  removeStaleKeys()
}

function removeLegacyConfigKeys(): void {
  try {
    window.localStorage.removeItem(CONFIG_KEY_V1)
    window.localStorage.removeItem(CONFIG_KEY_V2)
  } catch {
    // ignore
  }
}

function upgradeConfig(sources: Row[], urlPinned: string[]): Row {
  const newest = sources[0] ?? {}
  const savedItems = mergeSavedItemsById(...sources.map(savedItemsFromConfigRow))
  const hasPins = normalizePinnedSectionIds(newest.pinnedSectionIds).length > 0

  return {
    ...newest,
    pinnedSectionIds: hasPins ? newest.pinnedSectionIds : urlPinned,
    colorThemeId: upgradeColorThemeId(newest.colorThemeId),
    savedItems,
  }
}

function upgradeColorThemeId(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  const id = raw.trim()
  return THEME_ALIASES[id] ?? id
}

/* ---------- saved items ---------- */

function savedItemsFromConfigRow(row: Row): WikitabSavedItem[] {
  const rows: Row[] = []

  if (Array.isArray(row.savedItems)) {
    for (const raw of row.savedItems) {
      const upgraded = isRow(raw) ? upgradeSavedItemRow(raw) : null
      if (upgraded) rows.push(upgraded)
    }
  }
  if (Array.isArray(row.savedCards)) {
    for (const raw of row.savedCards) {
      const upgraded = isRow(raw) ? upgradeV2CardRow(raw) : null
      if (upgraded) rows.push(upgraded)
    }
  }
  if (Array.isArray(row.savedArticles)) {
    for (const raw of row.savedArticles) {
      const upgraded = isRow(raw) ? upgradeV1ArticleRow(raw) : null
      if (upgraded) rows.push(upgraded)
    }
  }

  return normalizeSavedItems(rows.map(backfillSavedItemRow))
}

/** Renamed fields and per-type defaults on `savedItems` rows. */
function upgradeSavedItemRow(raw: Row): Row | null {
  const row: Row = { ...raw }

  rename(row, 'href', 'url')
  rename(row, 'editHref', 'editUrl')
  rename(row, 'need', 'task')
  rename(row, 'shortDescription', 'description')
  rename(row, 'revid', 'revisionId')
  rename(row, 'isLatest', 'isLatestRevision')
  if (row.delta === undefined) {
    const added = num(row, 'charsAdded')
    const removed = num(row, 'charsRemoved')
    if (added !== undefined || removed !== undefined) row.delta = (added ?? 0) - (removed ?? 0)
  }

  const type = str(row, 'type')

  if (type === 'snippet' && str(row, 'snippetHtml') === undefined) {
    const source = str(row, 'source')
    if (!source || !LEGACY_SNIPPET_SOURCES.has(source)) return null
    const card = legacyCard(row.card) ?? legacyCard(row)
    if (!card) return null
    return legacySnippetToItem(legacyBase(row), source as LegacySnippetSource, {
      ...card,
      key: card.key || str(row, 'id') || '',
    })
  }

  switch (type) {
    case 'article':
      fill(row, 'title', row.articleTitle)
      Object.assign(row, legacySupporting(row))
      if (row.id === 'featured:wotd' || row.id === 'featured:qotd') {
        return (
          featuredToItem(legacyBase(row), {
            key: row.id,
            url: str(row, 'url'),
            title: str(row, 'title'),
            description: str(row, 'description'),
            supportingText: row.id === 'featured:wotd' ? 'Word of the day' : 'Quote of the day',
          }) ?? row
        )
      }
      break
    case 'word':
      fill(row, 'word', row.articleTitle)
      fill(row, 'description', row.html)
      break
    case 'quote':
      fill(row, 'quoteText', row.description)
      fill(row, 'personName', row.title)
      break
    case 'list':
      fill(row, 'listTitle', row.articleTitle)
      break
  }

  return row
}

/** Fields every current item needs, filled from whatever the row still has. */
function backfillSavedItemRow(row: Row): Row {
  const next: Row = { ...row }
  const type = str(next, 'type') as WikitabSavedItemType | undefined

  if (typeof next.articleTitle === 'string') {
    next.articleTitle = next.articleTitle.trim().replace(/_/g, ' ')
  }
  fill(next, 'articleTitleKey', articleTitleKey(str(next, 'articleTitle') ?? ''))
  if (num(next, 'savedAt') === undefined) next.savedAt = Date.now()

  if (type && !isWikitabSavedItemPrimitive(next.primitive)) {
    next.primitive = wikitabSavedItemTypeToPrimitive(type)
  }
  if (!parseSeedArticle(next.seedArticle) && (type === 'article' || type === 'suggestion')) {
    next.seedArticle = seedArticle(str(next, 'articleTitle'), 'self')
  }

  return next
}

function legacyBase(row: Row): Row {
  return {
    id: str(row, 'id'),
    type: 'article',
    savedAt: num(row, 'savedAt'),
    articleTitleKey: str(row, 'articleTitleKey'),
    articleTitle: str(row, 'articleTitle'),
    seedArticle: row.seedArticle,
  }
}

function legacyCard(raw: unknown): LegacyCard | null {
  if (!isRow(raw)) return null
  const key = str(raw, 'key')
  if (!key) return null

  return {
    key,
    url: str(raw, 'url') ?? str(raw, 'href'),
    title: str(raw, 'title') ?? str(raw, 'linkTitle'),
    description: str(raw, 'description') ?? str(raw, 'html'),
    thumbnailUrl: str(raw, 'thumbnailUrl'),
    editUrl: str(raw, 'editUrl') ?? str(raw, 'editHref'),
    suggestionBody: str(raw, 'suggestionBody'),
    ...legacySupporting(raw),
  }
}

/** v2 `supportingSignals` → plain `supportingText`. */
function legacySupporting(row: Row): Pick<
  LegacyCard,
  'supportingText' | 'supportingHtml' | 'supportingTextEnd'
> {
  const supportingHtml = str(row, 'supportingHtml')
  let supportingText = str(row, 'supportingText')
  const supportingTextEnd = str(row, 'supportingTextEnd')

  if (!supportingHtml && !supportingText && Array.isArray(row.supportingSignals)) {
    for (const signal of row.supportingSignals) {
      const text = isRow(signal) ? str(signal, 'text') : undefined
      if (text) {
        supportingText = text
        break
      }
    }
  }

  return {
    ...(supportingText ? { supportingText } : {}),
    ...(supportingHtml ? { supportingHtml } : {}),
    ...(supportingTextEnd ? { supportingTextEnd } : {}),
  }
}

/* ---------- pre-typed snippet rows and featured cards ---------- */

function legacySnippetToItem(base: Row, source: LegacySnippetSource, card: LegacyCard): Row | null {
  if (source === 'dyk' || source === 'news') return hookToSnippet(base, source, card)
  if (source === 'otd') return hookToArticle(base, card)
  return featuredToItem(base, card)
}

function hookToArticle(base: Row, card: LegacyCard): Row | null {
  const title = wikitabCardMenuArticleTitle(card)
  const key = articleTitleKey(title)
  if (!key) return null

  return {
    ...base,
    id: `search:${key}`,
    type: 'article',
    primitive: 'article',
    articleTitleKey: key,
    articleTitle: title,
    title,
    url: card.url || articleUrl(title),
    description: card.description,
    thumbnailUrl: card.thumbnailUrl,
  }
}

function hookToSnippet(base: Row, source: 'dyk' | 'news', card: LegacyCard): Row | null {
  const snippetHtml = card.description
  const title = wikitabCardMenuArticleTitle(card)
  const key = articleTitleKey(title)
  const url = card.url || (title ? articleUrl(title) : '')
  const id = snippetHtml ? snippetSavedId(source, snippetHtml) : ''
  if (!snippetHtml || !key || !id || !url) return null

  return {
    ...base,
    id,
    type: 'snippet',
    primitive: 'snippet',
    articleTitleKey: key,
    articleTitle: title,
    seedArticle: seedArticle(title, 'hook-link'),
    source,
    snippetHtml,
    url,
    thumbnailUrl: card.thumbnailUrl,
  }
}

const POTD_PORTAL_URL = wikiArticleUrl(EN_WIKI_HOST, 'Wikipedia:Picture of the day')

/** Undated portal link used before saved cards kept a per-day TFP target. */
function isPotdPortalUrl(href: string | undefined): boolean {
  if (!href) return false
  if (href === POTD_PORTAL_URL) return true
  try {
    const url = new URL(href)
    if (url.hostname !== EN_WIKI_HOST) return false
    const path = decodeURIComponent(url.pathname.replace(/^\/wiki\//, '')).replace(/_/g, ' ')
    return path === 'Wikipedia:Picture of the day' && !url.hash
  } catch {
    return false
  }
}

function displayTitle(title: string): string {
  return title.trim().replace(/_/g, ' ')
}

function featuredToItem(base: Row, card: LegacyCard): Row | null {
  let url = card.url
  const savedAt = typeof base.savedAt === 'number' ? base.savedAt : Date.now()
  if (card.key === 'featured:tfp' && isPotdPortalUrl(url)) {
    url = wikipediaPotdPageUrl(utcDayKey(new Date(savedAt)))
  }
  const fallbackTitle = typeof base.articleTitle === 'string' ? base.articleTitle : ''

  switch (card.key) {
    case 'featured:wotd': {
      const word = displayTitle(card.title ?? fallbackTitle)
      const key = articleTitleKey(word)
      if (!key || !url) return null
      return {
        ...base,
        id: wordSavedId(word),
        type: 'word',
        primitive: 'word',
        articleTitleKey: key,
        articleTitle: word,
        word,
        url,
        description: card.description,
      }
    }
    case 'featured:qotd': {
      const hook = card.description ?? ''
      const quoteText = card.title?.trim() || hook
      const supportingQuotee =
        card.supportingText?.trim() && card.supportingText.trim() !== 'Quote of the day'
          ? card.supportingText.trim()
          : undefined
      const person = displayTitle(
        card.description?.trim() ??
          supportingQuotee ??
          (hook ? card.title : undefined) ??
          fallbackTitle,
      )
      const key = articleTitleKey(person || quoteText || 'quote')
      if (!key || !url || !quoteText) return null
      return {
        ...base,
        id: quoteSavedId(person || key),
        type: 'quote',
        primitive: 'quote',
        articleTitleKey: key,
        articleTitle: person || displayTitle(quoteText.slice(0, 80)),
        personName: person || undefined,
        quoteText,
        url,
      }
    }
    case 'featured:tfl': {
      const listTitle = displayTitle(card.title ?? fallbackTitle)
      const key = articleTitleKey(listTitle)
      if (!key || !url) return null
      return {
        ...base,
        id: listSavedId(listTitle),
        type: 'list',
        primitive: 'list',
        articleTitleKey: key,
        articleTitle: listTitle,
        listTitle,
        url,
        description: card.description,
        thumbnailUrl: card.thumbnailUrl,
      }
    }
    case 'featured:tfp':
    case 'featured:potd': {
      const thumb = card.thumbnailUrl ?? ''
      if (!thumb && !card.description) return null
      const title = displayTitle(card.title ?? 'Featured picture')
      const id = card.key === 'featured:tfp' ? 'image:featured:tfp' : 'image:featured:potd'
      return {
        ...base,
        id,
        type: 'image',
        primitive: 'image',
        pageid: 0,
        title,
        articleTitle: title,
        articleTitleKey: id,
        description: card.description ?? '',
        thumbnailUrl: thumb || 'https://commons.wikimedia.org/static/images/icons/wikimedia.svg',
        filePageUrl: url ?? '',
        licenseType: '',
        artistHtml: '',
        captionHtml: card.description,
      }
    }
    case 'featured:tfa': {
      const title = displayTitle(card.title ?? fallbackTitle)
      const key = articleTitleKey(title)
      if (!key || !url) return null
      return {
        ...base,
        id: card.key,
        type: 'article',
        primitive: 'article',
        articleTitleKey: key,
        articleTitle: title,
        title,
        url,
        description: card.description,
        thumbnailUrl: card.thumbnailUrl,
      }
    }
    default:
      return null
  }
}

/* ---------- v2 savedCards ---------- */

function upgradeV2CardRow(raw: Row): Row | null {
  const id = str(raw, 'id')
  const articleTitle = displayTitle(str(raw, 'articleTitle') ?? '')
  const card = legacyCard(raw.card)
  const presentation = isRow(raw.presentation) ? raw.presentation : {}
  const source = str(presentation, 'source')
  if (!id || !articleTitle || !card || !source) return null

  const base: Row = {
    id,
    type: 'article',
    savedAt: num(raw, 'savedAt'),
    articleTitleKey:
      articleTitleKey(str(raw, 'articleTitleKey') ?? '') ||
      articleTitleKey(articleTitle) ||
      articleTitleKey(card.title ?? ''),
    articleTitle,
  }

  if (source === 'suggested-edits' || card.key.startsWith('suggested-edits:')) {
    return v2CardToSuggestion(base, card)
  }
  if (source === 'discussions') return v2CardToDiscussion(base, card)
  if (LEGACY_SNIPPET_SOURCES.has(source)) {
    return legacySnippetToItem(base, source as LegacySnippetSource, card)
  }

  return {
    ...base,
    title: card.title ?? articleTitle,
    url: card.url ?? '',
    description: card.description,
    thumbnailUrl: card.thumbnailUrl,
    supportingText: card.supportingText,
    supportingHtml: card.supportingHtml,
    supportingTextEnd: card.supportingTextEnd,
  }
}

function v2CardToDiscussion(base: Row, card: LegacyCard): Row | null {
  const threadId = discussionThreadIdFromUrl(card.url) ?? card.key
  if (!threadId || !card.title) return null

  const noticeboardPage = noticeboardFromUrl(card.url) ?? card.description ?? ''
  const commentMatch = (card.supportingText ?? '').match(/^(\d+)/)

  return {
    ...base,
    id: String(base.id).startsWith('discussion:') ? base.id : `discussion:${threadId}`,
    type: 'discussion',
    title: card.title,
    noticeboardPage,
    noticeboardLabel: card.description ?? noticeboardPage,
    commentCount: commentMatch ? Number(commentMatch[1]) : 0,
    latestReplyRelative: card.supportingTextEnd ?? '',
    url: card.url ?? '',
  }
}

function noticeboardFromUrl(href: string | undefined): string | undefined {
  if (!href) return undefined
  try {
    const path = new URL(href).pathname.replace(/^\/wiki\//, '')
    const hashIndex = path.indexOf('#')
    return (hashIndex === -1 ? path : path.slice(0, hashIndex)).replace(/_/g, ' ') || undefined
  } catch {
    return undefined
  }
}

function v2CardToSuggestion(base: Row, card: LegacyCard): Row | null {
  const pageidMatch = card.key.match(/^suggested-edits:(\d+)$/)
  if (!pageidMatch) return null
  const pageid = Number(pageidMatch[1])
  const suggestionLabel = card.supportingText ?? 'Suggested edit'
  const task = suggestionLabel.toLowerCase().replace(/\s+/g, '_')

  return {
    ...base,
    id: `suggestion:${pageid}:${task}`,
    type: 'suggestion',
    articleTitle: displayTitle(card.title ?? String(base.articleTitle)),
    pageid,
    task,
    suggestionLabel,
    body: card.suggestionBody ?? card.description ?? '',
    description: card.description,
    thumbnailUrl: card.thumbnailUrl,
    editUrl: card.editUrl ?? card.url ?? '',
  }
}

/* ---------- v1 savedArticles ---------- */

function upgradeV1ArticleRow(raw: Row): Row | null {
  const title = displayTitle(str(raw, 'title') ?? '')
  const key = articleTitleKey(str(raw, 'titleKey') ?? title)
  if (!title || !key) return null

  return {
    id: `search:${key}`,
    type: 'article',
    savedAt: num(raw, 'savedAt'),
    articleTitleKey: key,
    articleTitle: title,
    title,
    url: articleUrl(title),
    description: str(raw, 'description'),
    thumbnailUrl: str(raw, 'thumbnailUrl'),
  }
}

/* ---------- storage, URL, helpers ---------- */

function readKey(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function parseRow(raw: string | null): Row | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isRow(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Old builds kept pins in `?pinned=trending,dyk`. */
function readPinnedFromUrl(): string[] | null {
  const raw = new URLSearchParams(window.location.search).get('pinned')
  if (raw === null) return null
  return raw.split(',').map((id) => id.trim()).filter(Boolean)
}

function stripPinnedFromUrl(): void {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('pinned')) return
  url.searchParams.delete('pinned')
  window.history.replaceState(window.history.state, '', url)
}

/** Legacy config keys and caches whose key no longer matches the current version. */
function removeStaleKeys(): void {
  try {
    const stale: string[] = []
    for (let index = 0; index < window.localStorage.length; index++) {
      const key = window.localStorage.key(index)
      if (key?.startsWith('wikitab-') && !CURRENT_KEYS.has(key)) stale.push(key)
    }
    for (const key of stale) window.localStorage.removeItem(key)
  } catch {
    // Private mode or blocked storage — ignore.
  }
}

function isRow(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(row: Row, field: string): string | undefined {
  const value = row[field]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function num(row: Row, field: string): number | undefined {
  const value = row[field]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && !value.trim())
}

function fill(row: Row, field: string, value: unknown): void {
  if (isBlank(row[field]) && !isBlank(value)) row[field] = value
}

function rename(row: Row, from: string, to: string): void {
  fill(row, to, row[from])
  delete row[from]
}
