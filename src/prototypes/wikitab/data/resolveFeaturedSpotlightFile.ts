import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'

import type { WikitabFeaturedSpotlight } from '../sections'
import { wikitabCardDescriptionText } from './wikitabCardDescription'
import { EN_WIKI_HOST } from './wikitabHtml'

const COMMONS_HOST = 'commons.wikimedia.org'

interface ImageInfoRow {
  thumburl?: string
  url?: string
  extmetadata?: Record<string, { value?: string }>
}

interface QueryPage {
  pageid?: number
  title?: string
  missing?: string
  imageinfo?: ImageInfoRow[]
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function decodeCommonsFilenameFromThumbUrl(thumbUrl: string): string | null {
  const cleaned = thumbUrl.replace(/^https?:/, '').split('?')[0] ?? thumbUrl
  const match = cleaned.match(/\/commons\/thumb\/(?:[^/]+\/)*([^/]+)\/\d+px-([^/]+)$/)
  if (match) return decodeURIComponent(match[2].replace(/_/g, ' '))
  const direct = cleaned.match(/\/commons\/([^/]+\/.+)$/)
  if (direct) {
    const segment = direct[1].split('/').pop()
    if (segment) return decodeURIComponent(segment.replace(/_/g, ' '))
  }
  return null
}

function fileTitleFromSpotlight(spot: WikitabFeaturedSpotlight): string | null {
  const captionHtml = wikitabCardDescriptionText(spot)
  if (captionHtml) {
    const doc = new DOMParser().parseFromString(captionHtml, 'text/html')
    const fileLink = doc.querySelector('a[href*="/wiki/File:"]')
    const href = fileLink?.getAttribute('href') ?? ''
    const match = href.match(/\/wiki\/File:([^#?]+)/)
    if (match) return decodeURIComponent(match[1].replace(/_/g, ' '))
  }
  if (spot.thumbnailUrl) {
    const name = decodeCommonsFilenameFromThumbUrl(spot.thumbnailUrl)
    if (name) return name
  }
  return null
}

async function fetchCommonsFileMetadata(
  fileTitle: string,
  signal?: AbortSignal,
): Promise<{
  pageid: number
  title: string
  thumbnailUrl: string
  description: string
  licenseType: string
  artistHtml: string
  filePageUrl: string
} | null> {
  const title = fileTitle.startsWith('File:') ? fileTitle : `File:${fileTitle}`
  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '320',
    format: 'json',
    origin: '*',
  })

  const response = await fetchWikimedia(`https://${COMMONS_HOST}/w/api.php?${params}`, {
    signal,
    headers: wikimediaApiFetchHeaders('wikitab-featured-image-resolve'),
  })
  if (!response.ok) return null

  const json = (await response.json()) as { query?: { pages?: Record<string, QueryPage> } }
  const page = Object.values(json.query?.pages ?? {})[0]
  if (!page?.pageid || page.missing !== undefined) return null

  const info = page.imageinfo?.[0]
  const meta = info?.extmetadata ?? {}
  const description =
    stripHtml(meta.ImageDescription?.value ?? meta.ObjectName?.value ?? '') || title
  const licenseType = stripHtml(meta.LicenseShortName?.value ?? '')
  const artistHtml = meta.Artist?.value?.trim() ?? ''

  return {
    pageid: page.pageid,
    title: page.title ?? title,
    thumbnailUrl: info?.thumburl ?? info?.url ?? '',
    description,
    licenseType,
    artistHtml,
    filePageUrl: `https://${COMMONS_HOST}/wiki/${encodeURIComponent((page.title ?? title).replace(/ /g, '_'))}`,
  }
}

export interface ResolvedFeaturedSpotlightImage {
  pageid: number
  title: string
  thumbnailUrl: string
  description: string
  licenseType: string
  artistHtml: string
  filePageUrl: string
  html?: string
}

/** Resolve TFP/POTD spotlight to Commons `File:` metadata when possible. */
export async function resolveFeaturedSpotlightFile(
  spot: WikitabFeaturedSpotlight,
  signal?: AbortSignal,
): Promise<ResolvedFeaturedSpotlightImage | null> {
  if (spot.kind !== 'tfp' && spot.kind !== 'potd') return null

  const fileName = fileTitleFromSpotlight(spot)
  if (!fileName) return null

  try {
    const resolved = await fetchCommonsFileMetadata(fileName, signal)
    if (!resolved?.thumbnailUrl) return null
    return {
      ...resolved,
      html: wikitabCardDescriptionText(spot),
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err
    return null
  }
}
