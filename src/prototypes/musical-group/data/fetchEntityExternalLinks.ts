import { wikimediaApiFetchHeaders } from '@/config'

import { fetchWithTimeout } from './fetchWithTimeout'
import type { ExternalLinkCategory, WikidataExternalLink } from './types'
import { externalLinkLabel } from './wikidataApi'

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php'

/** Social / streaming identifiers — shown after official website, before other IDs. */
const SOCIAL_PROPERTY_IDS = [
  'P2002', // X (Twitter) username
  'P2003', // Instagram username
  'P2013', // Facebook ID
  'P2397', // YouTube channel ID
  'P7085', // TikTok username
  'P4264', // LinkedIn personal profile
  'P4033', // Mastodon address
  'P12386', // Bluesky handle
  'P1902', // Spotify artist ID
  'P2722', // Deezer artist ID
  'P2850', // Apple Music artist ID (U.S.)
  'P3040', // SoundCloud ID
  'P7192', // Bandcamp profile ID
  'P4576', // Tidal artist ID
] as const

interface WbClaim {
  rank?: string
  mainsnak: {
    snaktype?: string
    datatype?: string
    datavalue?: {
      type: string
      value: string | { id?: string; time?: string; text?: string }
    }
  }
}

interface WbEntity {
  id?: string
  claims?: Record<string, WbClaim[]>
}

interface WbGetEntitiesResponse {
  entities?: Record<string, WbEntity>
}

interface RawEntityLink {
  propertyId: string
  propertyNumber: number
  claimIndex: number
  rank: string
  url: string
}

const formatterCache = new Map<string, string | undefined>()

const socialPropertyRank = new Map<string, number>(
  SOCIAL_PROPERTY_IDS.map((propertyId, index) => [propertyId, index]),
)

function actionUrl(params: Record<string, string>): string {
  const search = new URLSearchParams({
    format: 'json',
    formatversion: '2',
    origin: '*',
    ...params,
  })
  return `${WIKIDATA_API}?${search.toString()}`
}

function propertyNumber(propertyId: string): number {
  const match = propertyId.match(/^P(\d+)$/i)
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER
}

function claimStringValue(claim: WbClaim): string | null {
  if (claim.mainsnak.snaktype === 'novalue' || claim.mainsnak.snaktype === 'somevalue') {
    return null
  }

  const value = claim.mainsnak.datavalue?.value
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value && 'text' in value && value.text) {
    return value.text
  }
  return null
}

function formatterFromPropertyEntity(entity: WbEntity | undefined): string | undefined {
  const claims = entity?.claims?.P1630
  if (!claims?.length) return undefined

  const preferred = claims.find((claim) => claim.rank === 'preferred')
  const candidate = preferred ?? claims.find((claim) => claim.rank !== 'deprecated') ?? claims[0]
  return claimStringValue(candidate) ?? undefined
}

async function fetchPropertyFormatters(
  propertyIds: string[],
  signal?: AbortSignal,
): Promise<Map<string, string | undefined>> {
  const result = new Map<string, string | undefined>()
  const unresolved = propertyIds.filter((id) => !formatterCache.has(id))

  if (unresolved.length) {
    const url = actionUrl({
      action: 'wbgetentities',
      ids: unresolved.join('|'),
      props: 'claims',
    })

    const response = await fetchWithTimeout(url, {
      signal,
      headers: wikimediaApiFetchHeaders('musical-group-wikidata-formatters'),
    })

    if (response.ok) {
      const data = (await response.json()) as WbGetEntitiesResponse
      for (const propertyId of unresolved) {
        const formatter = formatterFromPropertyEntity(data.entities?.[propertyId])
        formatterCache.set(propertyId, formatter)
      }
    } else {
      for (const propertyId of unresolved) {
        formatterCache.set(propertyId, undefined)
      }
    }
  }

  for (const propertyId of propertyIds) {
    result.set(propertyId, formatterCache.get(propertyId))
  }

  return result
}

function buildFormatterUrl(template: string, identifier: string): string {
  return template.replace(/\$1/g, identifier)
}

function normalizeUrlForDedup(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.hash = ''
    parsed.hostname = parsed.hostname.toLowerCase()
    if (parsed.pathname.endsWith('/') && parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, '')
    }
    return parsed.toString()
  } catch {
    return url.trim().toLowerCase()
  }
}

function rankOrder(rank: string | undefined): number {
  if (rank === 'preferred') return 0
  if (rank === 'normal') return 1
  return 2
}

/** Official website first, then social/streaming, then others; alphabetically within each tier. */
function compareEntityLinks(a: RawEntityLink, b: RawEntityLink): number {
  const tier = (link: RawEntityLink): number => {
    if (link.propertyId === 'P856') return 0
    if (socialPropertyRank.has(link.propertyId)) return 1
    return 2
  }

  const tierDiff = tier(a) - tier(b)
  if (tierDiff !== 0) return tierDiff

  const labelDiff = externalLinkLabel(a.url).localeCompare(externalLinkLabel(b.url), undefined, {
    sensitivity: 'base',
  })
  if (labelDiff !== 0) return labelDiff

  const rankDiff = rankOrder(a.rank) - rankOrder(b.rank)
  if (rankDiff !== 0) return rankDiff

  return a.claimIndex - b.claimIndex
}

function linkCategory(propertyId: string): ExternalLinkCategory {
  if (propertyId === 'P856') return 'official'
  if (socialPropertyRank.has(propertyId)) return 'social'
  return 'other'
}

function toExternalLink(link: RawEntityLink): WikidataExternalLink {
  return {
    url: link.url,
    displayText: externalLinkLabel(link.url),
    category: linkCategory(link.propertyId),
  }
}

export async function fetchEntityExternalLinks(
  id: string,
  signal?: AbortSignal,
): Promise<WikidataExternalLink[]> {
  const url = actionUrl({
    action: 'wbgetentities',
    ids: id,
    props: 'claims',
  })

  const response = await fetchWithTimeout(url, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-wikidata-links'),
  })

  if (!response.ok) {
    throw new Error(`wbgetentities failed (${response.status})`)
  }

  const data = (await response.json()) as WbGetEntitiesResponse
  const entity = data.entities?.[id]
  if (!entity?.claims) return []

  const urlClaims: RawEntityLink[] = []
  const externalIdClaims: { propertyId: string; propertyNumber: number; claimIndex: number; rank: string; value: string }[] = []

  for (const [propertyId, claims] of Object.entries(entity.claims)) {
    const propNumber = propertyNumber(propertyId)

    claims.forEach((claim, claimIndex) => {
      if (claim.rank === 'deprecated') return

      const datatype = claim.mainsnak.datatype
      const value = claimStringValue(claim)
      if (!value) return

      const rank = claim.rank ?? 'normal'

      if (datatype === 'url') {
        urlClaims.push({
          propertyId,
          propertyNumber: propNumber,
          claimIndex,
          rank,
          url: value,
        })
        return
      }

      if (datatype === 'external-id') {
        externalIdClaims.push({
          propertyId,
          propertyNumber: propNumber,
          claimIndex,
          rank,
          value,
        })
      }
    })
  }

  const propertyIds = [...new Set(externalIdClaims.map((claim) => claim.propertyId))]
  const formatters = propertyIds.length
    ? await fetchPropertyFormatters(propertyIds, signal)
    : new Map<string, string | undefined>()

  const resolvedLinks: RawEntityLink[] = [...urlClaims]

  for (const claim of externalIdClaims) {
    const template = formatters.get(claim.propertyId)
    if (!template) continue
    resolvedLinks.push({
      propertyId: claim.propertyId,
      propertyNumber: claim.propertyNumber,
      claimIndex: claim.claimIndex,
      rank: claim.rank,
      url: buildFormatterUrl(template, claim.value),
    })
  }

  resolvedLinks.sort(compareEntityLinks)

  const seen = new Set<string>()
  const links: WikidataExternalLink[] = []

  for (const rawLink of resolvedLinks) {
    const trimmed = rawLink.url.trim()
    if (!trimmed) continue

    const key = normalizeUrlForDedup(trimmed)
    if (seen.has(key)) continue
    seen.add(key)

    links.push(toExternalLink(rawLink))
  }

  return links
}
