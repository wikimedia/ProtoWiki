import { wikimediaApiFetchHeaders } from '@/config'

import { fetchWikimedia } from '@/lib/fetchWikimedia'
import { sentenceCase } from './formatLabel'
import {
  ACTOR_OCCUPATION_QIDS,
  MUSIC_PERFORMER_QIDS,
  SPORTS_OCCUPATION_QIDS,
} from './types'

const WIKIDATA_SPARQL = 'https://query.wikidata.org/sparql'

/** Broad writing sideline roles — skipped when a more specific P106 exists. */
const GENERIC_SIDELINE_QIDS = [
  'Q36180', // writer
  'Q18814623', // autobiographer
] as const

/** Visual / performance creatives that keep the intro image carousel for people. */
const CREATIVE_CAROUSEL_QIDS = [
  'Q483501', // artist
  'Q3391743', // visual artist
  'Q2526255', // film director
  'Q7042855', // television director
  'Q3282637', // film producer
  'Q1028181', // painter
  'Q1281618', // sculptor
  'Q28389', // screenwriter
  'Q214917', // playwright
  'Q33231', // photographer
  'Q13235160', // fashion designer
  'Q49757', // poet
] as const

export interface OccupationResolution {
  primaryId?: string
  primaryIsMusic: boolean
  primaryIsActor: boolean
  primaryIsCreative: boolean
  primaryIsSports: boolean
  /** Any non-deprecated P106 subclasses a music-performer anchor. */
  hasMusicOccupation: boolean
  /** Any non-deprecated P106 subclasses an actor anchor. */
  hasActorOccupation: boolean
}

interface OccupationSparqlRow {
  occ: { value: string }
  occLabel?: { value: string }
  music?: { value: string }
  actor?: { value: string }
  creative?: { value: string }
  sports?: { value: string }
  generic?: { value: string }
}

interface OccupationRow {
  id: string
  label?: string
  isMusic: boolean
  isActor: boolean
  isCreative: boolean
  isSports: boolean
  isGenericSideline: boolean
}

const EMPTY_RESOLUTION: OccupationResolution = {
  primaryIsMusic: false,
  primaryIsActor: false,
  primaryIsCreative: false,
  primaryIsSports: false,
  hasMusicOccupation: false,
  hasActorOccupation: false,
}

function qidFromUri(uri: string): string {
  return uri.replace(/^.*\//, '')
}

function valuesClause(variable: string, qids: readonly string[]): string {
  const values = qids.map((qid) => `wd:${qid}`).join(' ')
  return `VALUES ${variable} { ${values} }`
}

function hitFlag(value: string | undefined): boolean {
  return value === '1' || value === 'true'
}

async function sparqlQuery<T>(query: string, signal?: AbortSignal): Promise<T> {
  const url = `${WIKIDATA_SPARQL}?query=${encodeURIComponent(query)}`
  const response = await fetchWikimedia(url, {
    signal,
    headers: {
      Accept: 'application/sparql-results+json',
      ...wikimediaApiFetchHeaders('musical-group-occupation-sparql'),
    },
  })
  if (!response.ok) {
    throw new Error(`Occupation SPARQL request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

function defaultRow(id: string): OccupationRow {
  return {
    id,
    isMusic: false,
    isActor: false,
    isCreative: false,
    isSports: false,
    isGenericSideline: false,
  }
}

function parseOccupationRows(bindings: OccupationSparqlRow[]): Map<string, OccupationRow> {
  const rows = new Map<string, OccupationRow>()
  for (const row of bindings) {
    const id = qidFromUri(row.occ.value)
    rows.set(id, {
      id,
      label: row.occLabel?.value,
      isMusic: hitFlag(row.music?.value),
      isActor: hitFlag(row.actor?.value),
      isCreative: hitFlag(row.creative?.value),
      isSports: hitFlag(row.sports?.value),
      isGenericSideline: hitFlag(row.generic?.value),
    })
  }
  return rows
}

function pickPrimaryId(
  occupationIds: string[],
  preferredIds: string[],
): string | undefined {
  if (!occupationIds.length) return undefined

  for (const id of preferredIds) {
    if (occupationIds.includes(id)) return id
  }

  return occupationIds[0]
}

async function fetchOccupationRows(
  occupationIds: string[],
  signal?: AbortSignal,
): Promise<Map<string, OccupationRow>> {
  const occValues = valuesClause('?occ', occupationIds)
  const musicValues = valuesClause('?musicAnchor', MUSIC_PERFORMER_QIDS)
  const actorValues = valuesClause('?actorAnchor', ACTOR_OCCUPATION_QIDS)
  const creativeValues = valuesClause('?creativeAnchor', CREATIVE_CAROUSEL_QIDS)
  const sportsValues = valuesClause('?sportsAnchor', SPORTS_OCCUPATION_QIDS)
  const genericValues = valuesClause('?genericAnchor', GENERIC_SIDELINE_QIDS)

  const sparql = `
SELECT ?occ ?occLabel
       (MAX(?musicHit) AS ?music)
       (MAX(?actorHit) AS ?actor)
       (MAX(?creativeHit) AS ?creative)
       (MAX(?sportsHit) AS ?sports)
       (MAX(?genericHit) AS ?generic)
WHERE {
  ${occValues}
  OPTIONAL {
    ?occ wdt:P279* ?musicAnchor .
    ${musicValues}
    BIND(1 AS ?musicHit)
  }
  OPTIONAL {
    ?occ wdt:P279* ?actorAnchor .
    ${actorValues}
    BIND(1 AS ?actorHit)
  }
  OPTIONAL {
    ?occ wdt:P279* ?creativeAnchor .
    ${creativeValues}
    BIND(1 AS ?creativeHit)
  }
  OPTIONAL {
    ?occ wdt:P279* ?sportsAnchor .
    ${sportsValues}
    BIND(1 AS ?sportsHit)
  }
  OPTIONAL {
    ?occ wdt:P279* ?genericAnchor .
    ${genericValues}
    BIND(1 AS ?genericHit)
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
GROUP BY ?occ ?occLabel`

  const data = await sparqlQuery<{ results: { bindings: OccupationSparqlRow[] } }>(
    sparql,
    signal,
  )
  return parseOccupationRows(data.results.bindings)
}

/**
 * Resolve P106 flags for carousel rules and pick the primary occupation from
 * Wikidata claim rank (preferred, then normal) and statement order.
 */
export async function resolveOccupations(
  occupationIds: string[],
  options: {
    preferredIds?: string[]
    signal?: AbortSignal
  } = {},
): Promise<OccupationResolution> {
  if (!occupationIds.length) return { ...EMPTY_RESOLUTION }

  const preferredIds = options.preferredIds ?? []

  let rows: Map<string, OccupationRow>
  try {
    rows = await fetchOccupationRows(occupationIds, options.signal)
  } catch {
    const primaryId = pickPrimaryId(occupationIds, preferredIds)
    return {
      ...EMPTY_RESOLUTION,
      primaryId,
      hasMusicOccupation: occupationIds.some((id) =>
        (MUSIC_PERFORMER_QIDS as readonly string[]).includes(id),
      ),
      hasActorOccupation: occupationIds.some((id) =>
        (ACTOR_OCCUPATION_QIDS as readonly string[]).includes(id),
      ),
    }
  }

  const rowFor = (id: string): OccupationRow => rows.get(id) ?? defaultRow(id)
  const primaryId = pickPrimaryId(occupationIds, preferredIds)
  const primary = primaryId ? rowFor(primaryId) : undefined
  const hasMusicOccupation = occupationIds.some((id) => rowFor(id).isMusic)
  const hasActorOccupation = occupationIds.some((id) => rowFor(id).isActor)

  return {
    primaryId,
    primaryIsMusic: primary?.isMusic ?? false,
    primaryIsActor: primary?.isActor ?? false,
    primaryIsCreative: primary?.isCreative ?? false,
    primaryIsSports: primary?.isSports ?? false,
    hasMusicOccupation,
    hasActorOccupation,
  }
}

export function primaryOccupationLabel(
  labelMap: Map<string, string>,
  resolution: OccupationResolution,
): string | undefined {
  if (!resolution.primaryId) return undefined
  const fromMap = labelMap.get(resolution.primaryId)
  if (fromMap) return sentenceCase(fromMap)
  return undefined
}

/** Whether a person's primary occupation warrants the intro image carousel. */
export function personShowsImageCarousel(
  resolution: OccupationResolution,
  actorMusician = false,
): boolean {
  if (actorMusician) return false
  return (
    resolution.primaryIsMusic ||
    resolution.primaryIsActor ||
    resolution.primaryIsCreative ||
    resolution.primaryIsSports
  )
}
