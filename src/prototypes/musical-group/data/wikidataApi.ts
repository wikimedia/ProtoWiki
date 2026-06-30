import { wikimediaApiFetchHeaders } from '@/config'

import { fetchWithTimeout } from './fetchWithTimeout'
import { entityDisplayLabel } from './formatLabel'
import {
  LOCATION_QIDS,
  MUSIC_PERFORMER_QIDS,
  type EditIndicator,
  type MusicalGroupSearchResult,
  type YearKind,
} from './types'

function musicPerformerValuesClause(variable = '?anchor'): string {
  const values = MUSIC_PERFORMER_QIDS.map((qid) => `wd:${qid}`).join(' ')
  return `VALUES ${variable} { ${values} }`
}

function locationValuesClause(variable = '?anchor'): string {
  const values = LOCATION_QIDS.map((qid) => `wd:${qid}`).join(' ')
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

function locationMatchClause(subject: string): string {
  return `{
  ${subject} wdt:P31/wdt:P279* ?anchor .
  ${locationValuesClause('?anchor')}
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

export async function isLocation(id: string, signal?: AbortSignal): Promise<boolean> {
  const query = `
ASK {
  ${locationMatchClause(`wd:${id}`)}
}`
  const data = await sparqlQuery<{ boolean: boolean }>(query, signal)
  return Boolean(data.boolean)
}

export async function isWikitaNavigableEntity(id: string, signal?: AbortSignal): Promise<boolean> {
  const [performer, location] = await Promise.all([
    isMusicPerformer(id, signal),
    isLocation(id, signal),
  ])
  return performer || location
}

interface EntitySearchSparqlRow {
  item: { value: string }
  itemLabel: { value: string }
  itemDescription?: { value: string }
  image?: { value: string }
  enwikiTitle?: { value: string }
}

function parseEntitySearchResults(
  bindings: EntitySearchSparqlRow[],
): MusicalGroupSearchResult[] {
  const seen = new Set<string>()
  const results: MusicalGroupSearchResult[] = []

  for (const row of bindings) {
    const id = row.item.value.replace(/^.*\//, '')
    if (seen.has(id)) continue
    seen.add(id)

    const rawImage = row.image?.value
    results.push({
      id,
      label: entityDisplayLabel(row.itemLabel.value, row.enwikiTitle?.value),
      description: row.itemDescription?.value,
      thumbnailUrl: rawImage ? `${rawImage}?width=256` : undefined,
    })
  }

  return results
}

function entitySearchSparql(escaped: string, filterClause?: string): string {
  const filter = filterClause ? `\n  ${filterClause}` : ''
  return `
SELECT ?item ?itemLabel ?itemDescription ?image ?enwikiTitle WHERE {
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:endpoint "www.wikidata.org";
                     wikibase:api "EntitySearch";
                     mwapi:search "${escaped}";
                     mwapi:language "en".
    ?item wikibase:apiOutputItem "@id".
  }${filter}
  OPTIONAL { ?item wdt:P18 ?image }
  OPTIONAL {
    ?enwikiArticle schema:about ?item ;
                     schema:isPartOf <https://en.wikipedia.org/> ;
                     schema:name ?enwikiTitle .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 8`
}

interface WbSearchEntityHit {
  id: string
  label: string
  description?: string
}

interface WbSearchEntitiesResponse {
  search?: WbSearchEntityHit[]
}

export async function searchWikidataItems(
  searchText: string,
  signal?: AbortSignal,
): Promise<MusicalGroupSearchResult[]> {
  const query = searchText.trim()
  if (!query.length) return []

  // wbsearchentities ranks exact matches first (e.g. "water" → Q283). SPARQL
  // EntitySearch via mwapi does not and often omits the primary item entirely.
  const searchUrl = actionUrl({
    action: 'wbsearchentities',
    search: query,
    language: 'en',
    limit: '8',
    type: 'item',
  })
  const searchResponse = await fetchWithTimeout(searchUrl, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-wbsearchentities'),
  })
  if (!searchResponse.ok) {
    throw new Error(`wbsearchentities failed (${searchResponse.status})`)
  }

  const searchData = (await searchResponse.json()) as WbSearchEntitiesResponse
  const hits = searchData.search ?? []
  if (!hits.length) return []

  const entitiesUrl = actionUrl({
    action: 'wbgetentities',
    ids: hits.map((hit) => hit.id).join('|'),
    props: 'claims|sitelinks',
  })
  const entitiesResponse = await fetchWithTimeout(entitiesUrl, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-wbsearchentities-enrich'),
  })
  if (!entitiesResponse.ok) {
    throw new Error(`wbgetentities failed (${entitiesResponse.status})`)
  }

  const entitiesData = (await entitiesResponse.json()) as WbGetEntitiesResponse
  const entities = entitiesData.entities ?? {}

  return hits.map((hit) => {
    const entity = entities[hit.id]
    const enwikiTitle = entity?.sitelinks?.enwiki?.title
    const imageFilename = firstClaimString(entity?.claims?.P18)
    return {
      id: hit.id,
      label: entityDisplayLabel(hit.label, enwikiTitle),
      description: hit.description,
      thumbnailUrl: imageFilename ? commonsFileUrl(imageFilename, 256) : undefined,
    }
  })
}

export async function searchMusicPerformers(
  searchText: string,
  signal?: AbortSignal,
): Promise<MusicalGroupSearchResult[]> {
  const query = searchText.trim()
  if (!query.length) return []

  const escaped = query.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const sparql = entitySearchSparql(escaped, musicPerformerMatchClause('?item'))
  const data = await sparqlQuery<{ results: { bindings: EntitySearchSparqlRow[] } }>(
    sparql,
    signal,
  )
  return parseEntitySearchResults(data.results.bindings)
}

interface WbEntityClaim {
  mainsnak: {
    datavalue?: {
      type: string
      value: string | { id?: string; time?: string; text?: string }
    }
  }
  rank?: string
  qualifiers?: Record<
    string,
    Array<{
      datavalue?: {
        type: string
        value: string | { id?: string; time?: string; text?: string }
      }
    }>
  >
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
  countryId?: string
  population?: number
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

function claimQuantityAmount(claim: WbEntityClaim): number | null {
  const value = claim.mainsnak.datavalue?.value
  if (typeof value !== 'object' || !value || !('amount' in value)) return null
  const amount = (value as { amount?: string }).amount
  if (!amount) return null
  const num = Number.parseFloat(amount.replace(/^\+/, ''))
  if (!Number.isFinite(num)) return null
  return Math.round(num)
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

function claimQualifierTime(claim: WbEntityClaim, property: string): string | null {
  const qual = claim.qualifiers?.[property]?.[0]
  const value = qual?.datavalue?.value
  if (typeof value === 'object' && value && 'time' in value && value.time) {
    return value.time
  }
  return null
}

function compareWikidataTime(a: string | null, b: string | null): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return a.localeCompare(b)
}

/** Pick the current or most recent value from a temporally qualified claim list (e.g. P17 country). */
function latestClaimEntityId(claims: WbEntityClaim[] | undefined): string | undefined {
  if (!claims?.length) return undefined

  const pool = claims.filter((claim) => claim.rank !== 'deprecated')
  const candidates = pool.length ? pool : claims

  const withEntity = candidates
    .map((claim) => ({ claim, id: claimEntityId(claim) }))
    .filter((entry): entry is { claim: WbEntityClaim; id: string } => Boolean(entry.id))

  if (!withEntity.length) return undefined

  const current = withEntity.filter(({ claim }) => !claimQualifierTime(claim, 'P582'))

  if (current.length) {
    const preferred = current.find(({ claim }) => claim.rank === 'preferred')
    if (preferred) return preferred.id

    return current.reduce((best, entry) =>
      compareWikidataTime(
        claimQualifierTime(best.claim, 'P580'),
        claimQualifierTime(entry.claim, 'P580'),
      ) <= 0
        ? entry
        : best,
    ).id
  }

  return withEntity.reduce((best, entry) =>
    compareWikidataTime(
      claimQualifierTime(best.claim, 'P582'),
      claimQualifierTime(entry.claim, 'P582'),
    ) <= 0
      ? entry
      : best,
  ).id
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
    countryId: latestClaimEntityId(claims.P17),
    population: claims.P1082?.length ? claimQuantityAmount(claims.P1082[0]) ?? undefined : undefined,
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

export async function resolveLocationTypeLabel(
  entityId: string,
  signal?: AbortSignal,
): Promise<string | undefined> {
  const sparql = `
SELECT ?type ?typeLabel ?anchor WHERE {
  wd:${entityId} wdt:P31 ?type .
  ?type wdt:P279* ?anchor .
  ${locationValuesClause('?anchor')}
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`

  interface TypeRow {
    type: { value: string }
    typeLabel: { value: string }
    anchor: { value: string }
  }

  const data = await sparqlQuery<{ results: { bindings: TypeRow[] } }>(sparql, signal)
  const bindings = data.results.bindings
  if (!bindings.length) return undefined

  for (const anchorQid of LOCATION_QIDS) {
    const match = bindings.find((row) => row.anchor.value.replace(/^.*\//, '') === anchorQid)
    if (match) return match.typeLabel.value
  }

  return bindings[0].typeLabel.value
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

/** Host + path for external link labels, e.g. `instagram.com/jadethirlwall`. */
export function externalLinkLabel(url: string): string {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    let path = parsed.pathname.replace(/\/+$/, '')
    if (!path || path === '/') return host
    return `${host}${path}`
  } catch {
    return url.replace(/^https?:\/\//, '')
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
