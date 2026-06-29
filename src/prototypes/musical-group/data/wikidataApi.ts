import { wikimediaApiFetchHeaders } from '@/config'

import { fetchWithTimeout } from './fetchWithTimeout'
import {
  MUSIC_PERFORMER_QIDS,
  type EditIndicator,
  type MusicalGroupSearchResult,
  type YearKind,
} from './types'

function musicPerformerValuesClause(variable = '?anchor'): string {
  const values = MUSIC_PERFORMER_QIDS.map((qid) => `wd:${qid}`).join(' ')
  return `VALUES ${variable} { ${values} }`
}

function musicPerformerMatchClause(subject: string): string {
  return `{
  ${subject} wdt:P31/wdt:P279* ?anchor .
  ${musicPerformerValuesClause('?anchor')}
} UNION {
  ${subject} wdt:P106/wdt:P279* ?anchor .
  ${musicPerformerValuesClause('?anchor')}
}`
}

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php'
const WIKIDATA_SPARQL = 'https://query.wikidata.org/sparql'

function actionUrl(params: Record<string, string>): string {
  const search = new URLSearchParams({
    format: 'json',
    formatversion: '2',
    origin: '*',
    ...params,
  })
  return `${WIKIDATA_API}?${search.toString()}`
}

async function sparqlQuery<T>(query: string, signal?: AbortSignal): Promise<T> {
  const url = `${WIKIDATA_SPARQL}?query=${encodeURIComponent(query)}`
  const response = await fetchWithTimeout(url, {
    signal,
    headers: {
      Accept: 'application/sparql-results+json',
      ...wikimediaApiFetchHeaders('musical-group-sparql'),
    },
  })
  if (!response.ok) {
    throw new Error(`SPARQL request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

export function normalizeQid(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  const match = trimmed.match(/^Q(\d+)$/i)
  if (!match) return null
  return `Q${match[1]}`
}

export function parseQidInput(raw: string): string | null {
  const trimmed = raw.trim()
  const direct = normalizeQid(trimmed)
  if (direct) return direct
  const urlMatch = trimmed.match(/wikidata\.org\/wiki\/(Q\d+)/i)
  if (urlMatch) return normalizeQid(urlMatch[1])
  return null
}

export async function isMusicPerformer(id: string, signal?: AbortSignal): Promise<boolean> {
  const query = `
ASK {
  ${musicPerformerMatchClause(`wd:${id}`)}
}`
  const data = await sparqlQuery<{ boolean: boolean }>(query, signal)
  return Boolean(data.boolean)
}

export async function searchMusicPerformers(
  searchText: string,
  signal?: AbortSignal,
): Promise<MusicalGroupSearchResult[]> {
  const query = searchText.trim()
  if (!query.length) return []

  const escaped = query.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const sparql = `
SELECT ?item ?itemLabel ?itemDescription ?image WHERE {
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:endpoint "www.wikidata.org";
                     wikibase:api "EntitySearch";
                     mwapi:search "${escaped}";
                     mwapi:language "en".
    ?item wikibase:apiOutputItem "@id".
  }
  ${musicPerformerMatchClause('?item')}
  OPTIONAL { ?item wdt:P18 ?image }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 8`

  interface SparqlRow {
    item: { value: string }
    itemLabel: { value: string }
    itemDescription?: { value: string }
    image?: { value: string }
  }

  const data = await sparqlQuery<{ results: { bindings: SparqlRow[] } }>(sparql, signal)
  const seen = new Set<string>()
  const results: MusicalGroupSearchResult[] = []

  for (const row of data.results.bindings) {
    const id = row.item.value.replace(/^.*\//, '')
    if (seen.has(id)) continue
    seen.add(id)

    const rawImage = row.image?.value
    results.push({
      id,
      label: row.itemLabel.value,
      description: row.itemDescription?.value,
      thumbnailUrl: rawImage ? `${rawImage}?width=256` : undefined,
    })
  }

  return results
}

interface WbEntityClaim {
  mainsnak: {
    datavalue?: {
      type: string
      value: string | { id?: string; time?: string; text?: string }
    }
  }
}

interface WbEntity {
  id?: string
  labels?: Record<string, { value: string }>
  descriptions?: Record<string, { value: string }>
  claims?: Record<string, WbEntityClaim[]>
  sitelinks?: Record<string, { title?: string; url?: string }>
}

interface WbGetEntitiesResponse {
  entities?: Record<string, WbEntity>
}

export interface ParsedEntityClaims {
  label: string
  description?: string
  imageFilename?: string
  commonsCategory?: string
  enwikiTitle?: string
  websiteUrl?: string
  inceptionYear?: number
  yearKind?: YearKind
  genreIds: string[]
  typeIds: string[]
}

function claimEntityId(claim: WbEntityClaim): string | null {
  const value = claim.mainsnak.datavalue?.value
  if (typeof value === 'object' && value && 'id' in value && value.id) {
    return value.id
  }
  return null
}

function claimStringValue(claim: WbEntityClaim): string | null {
  const value = claim.mainsnak.datavalue?.value
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value && 'text' in value && value.text) {
    return value.text
  }
  return null
}

function claimTimeYear(claim: WbEntityClaim): number | null {
  const value = claim.mainsnak.datavalue?.value
  if (typeof value !== 'object' || !value || !('time' in value) || !value.time) return null
  const match = value.time.match(/^\+?(-?\d{4})/)
  if (!match) return null
  return Number.parseInt(match[1], 10)
}

function firstClaimString(claims: WbEntityClaim[] | undefined): string | undefined {
  if (!claims?.length) return undefined
  for (const claim of claims) {
    const value = claimStringValue(claim)
    if (value) return value
  }
  return undefined
}

function allClaimEntityIds(claims: WbEntityClaim[] | undefined): string[] {
  if (!claims?.length) return []
  const ids: string[] = []
  for (const claim of claims) {
    const id = claimEntityId(claim)
    if (id) ids.push(id)
  }
  return ids
}

export async function fetchEntityClaims(
  id: string,
  signal?: AbortSignal,
): Promise<ParsedEntityClaims> {
  const url = actionUrl({
    action: 'wbgetentities',
    ids: id,
    props: 'labels|descriptions|claims|sitelinks',
    languages: 'en',
    languagefallback: '1',
  })

  const response = await fetchWithTimeout(url, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-wbgetentities'),
  })
  if (!response.ok) {
    throw new Error(`wbgetentities failed (${response.status})`)
  }

  const data = (await response.json()) as WbGetEntitiesResponse
  const entity = data.entities?.[id]
  if (!entity) {
    throw new Error(`Entity ${id} not found`)
  }

  const label =
    entity.labels?.en?.value ??
    Object.values(entity.labels ?? {})[0]?.value ??
    id
  const description =
    entity.descriptions?.en?.value ?? Object.values(entity.descriptions ?? {})[0]?.value

  const claims = entity.claims ?? {}
  const inceptionYear = claims.P571?.length ? claimTimeYear(claims.P571[0]) : null
  const birthYear = claims.P569?.length ? claimTimeYear(claims.P569[0]) : null

  let year: number | undefined
  let yearKind: YearKind | undefined
  if (inceptionYear != null) {
    year = inceptionYear
    yearKind = 'inception'
  } else if (birthYear != null) {
    year = birthYear
    yearKind = 'birth'
  }

  return {
    label,
    description,
    imageFilename: firstClaimString(claims.P18),
    commonsCategory: firstClaimString(claims.P373),
    enwikiTitle: entity.sitelinks?.enwiki?.title,
    websiteUrl: firstClaimString(claims.P856),
    inceptionYear: year,
    yearKind,
    genreIds: allClaimEntityIds(claims.P136),
    typeIds: allClaimEntityIds(claims.P31),
  }
}

export async function resolveEntityLabels(
  ids: string[],
  signal?: AbortSignal,
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))]
  const labels = new Map<string, string>()
  if (!unique.length) return labels

  const url = actionUrl({
    action: 'wbgetentities',
    ids: unique.join('|'),
    props: 'labels',
    languages: 'en',
    languagefallback: '1',
  })

  const response = await fetchWithTimeout(url, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-wbgetentities-labels'),
  })
  if (!response.ok) {
    throw new Error(`wbgetentities labels failed (${response.status})`)
  }

  const data = (await response.json()) as WbGetEntitiesResponse
  for (const entityId of unique) {
    const entity = data.entities?.[entityId]
    const label =
      entity?.labels?.en?.value ??
      Object.values(entity?.labels ?? {})[0]?.value ??
      entityId
    labels.set(entityId, label)
  }
  return labels
}

export async function resolveMusicTypeLabel(
  entityId: string,
  _typeIds: string[],
  signal?: AbortSignal,
): Promise<string | undefined> {
  const sparql = `
SELECT ?type ?typeLabel WHERE {
  {
    wd:${entityId} wdt:P31 ?type .
    ?type wdt:P279* ?anchor .
    ${musicPerformerValuesClause('?anchor')}
  } UNION {
    wd:${entityId} wdt:P106 ?type .
    ?type wdt:P279* ?anchor .
    ${musicPerformerValuesClause('?anchor')}
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`

  interface TypeRow {
    type: { value: string }
    typeLabel: { value: string }
  }

  const data = await sparqlQuery<{ results: { bindings: TypeRow[] } }>(sparql, signal)
  const musicalTypes = data.results.bindings.map((row) => ({
    id: row.type.value.replace(/^.*\//, ''),
    label: row.typeLabel.value,
  }))

  if (!musicalTypes.length) return undefined

  musicalTypes.sort((a, b) => b.label.length - a.label.length)
  return musicalTypes[0].label
}

export async function fetchEditIndicator(
  id: string,
  signal?: AbortSignal,
): Promise<EditIndicator | undefined> {
  const url = actionUrl({
    action: 'query',
    prop: 'revisions',
    rvprop: 'timestamp',
    rvlimit: '1',
    titles: `${id}|Talk:${id}`,
  })

  const response = await fetchWithTimeout(url, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-revisions'),
  })
  if (!response.ok) {
    throw new Error(`revisions query failed (${response.status})`)
  }

  interface RevisionPage {
    title: string
    revisions?: { timestamp?: string }[]
  }

  interface RevisionsResponse {
    query?: { pages?: RevisionPage[] }
  }

  const data = (await response.json()) as RevisionsResponse
  const pages = data.query?.pages ?? []

  let itemTimestamp: string | undefined
  let talkTimestamp: string | undefined

  for (const page of pages) {
    const timestamp = page.revisions?.[0]?.timestamp
    if (!timestamp) continue
    if (page.title === id) itemTimestamp = timestamp
    if (page.title === `Talk:${id}`) talkTimestamp = timestamp
  }

  if (!itemTimestamp && !talkTimestamp) return undefined
  if (!itemTimestamp) return 'talk'
  if (!talkTimestamp) return 'history'

  return talkTimestamp > itemTimestamp ? 'talk' : 'history'
}

export function commonsFileUrl(filename: string, width = 640): string {
  const name = filename.replace(/^File:/i, '').trim().replace(/ /g, '_')
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}?width=${width}`
}

export function normalizeFileTitle(title: string): string {
  return title.replace(/^File:/i, '').trim().toLowerCase()
}

export function fileTitleFromInput(title: string): string {
  return title.replace(/^File:/i, '').trim()
}

export function websiteHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  }
}

export function wikidataHistoryUrl(id: string): string {
  return `https://www.wikidata.org/w/index.php?title=${encodeURIComponent(id)}&action=history`
}

export function wikidataTalkHistoryUrl(id: string): string {
  return `https://www.wikidata.org/w/index.php?title=${encodeURIComponent(`Talk:${id}`)}&action=history`
}

export function wikidataEditEntityUrl(id: string): string {
  return `https://www.wikidata.org/wiki/Special:EditEntity/${encodeURIComponent(id)}`
}

export function enwikiVisualEditorUrl(title: string): string {
  return `https://en.wikipedia.org/w/index.php?${new URLSearchParams({
    title: title.replace(/ /g, '_'),
    veaction: 'edit',
  })}`
}
