/**
 * Wikimedia Commons image search — same Action API contract as Special:MediaSearch
 * (image tab defaults): `generator=search` in File namespace with MediaSearch's
 * default file filters. Unlike the Articles tab (title curation + morelike seeds),
 * the user's query is not rewritten through article search.
 *
 * @see MediaSearch resources/store/actions.js — getMediaFilters('image', …)
 */
import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'
import { normalizeFeedHtml, unwrapLinksInHtml } from './wikitabHtml'

const COMMONS_HOST = 'commons.wikimedia.org'
const COMMONS_API = `https://${COMMONS_HOST}/w/api.php`
/** MediaSearch LIMIT — see extensions/MediaSearch resources/store/actions.js */
export const WIKITAB_SEARCH_IMAGES_BATCH_SIZE = 40
/** MediaSearch uses iiurlheight=180; we request wider thumbs for full-bleed masonry. */
const THUMB_WIDTH = 640
/** Default image-tab filters from MediaSearch getMediaFilters('image', {}) */
const MEDIASEARCH_IMAGE_FILTERS = 'filetype:bitmap|drawing -fileres:0'
/**
 * Explicit-content category trees excluded via CirrusSearch `-deepcat:`.
 * Explicit-only — does not exclude broad nudity/art trees (e.g. Nudity, Nude art).
 * Coverage is partial; Commons has no official safe-search API.
 */
const EXPLICIT_CONTENT_DEEPCAT_EXCLUSIONS =
  '-deepcat:"Pornography" -deepcat:"Sexual acts" -deepcat:"Explicit content" -deepcat:"Hentai"'
const IMAGE_SEARCH_FILTERS = `${MEDIASEARCH_IMAGE_FILTERS} ${EXPLICIT_CONTENT_DEEPCAT_EXCLUSIONS}`

export interface WikitabSearchImage {
  pageid: number
  title: string
  width: number
  height: number
  thumbnailUrl: string
  filePageUrl: string
  mime: string
  licenseType: string
  licenseUrl: string
  artistHtml: string
  /** Plain-text caption from ImageDescription / ObjectName — used for saved card titles. */
  description: string
}

type ExtMetadataField = { value?: string }

function normalizeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  return url.startsWith('//') ? `https:${url}` : url
}

function extMetadataValue(field: ExtMetadataField | undefined): string {
  if (!field || typeof field.value !== 'string') return ''
  return field.value.trim()
}

function htmlToPlainText(html: string): string {
  if (!html) return ''
  if (!html.includes('<')) return html.replace(/\s+/g, ' ').trim()

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  return doc.body.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}

function parseArtistHtml(raw: string): string {
  if (!raw) return ''
  return htmlToPlainText(unwrapLinksInHtml(normalizeFeedHtml(raw)))
}

function parseLicenseType(raw: string): string {
  return htmlToPlainText(raw)
}

function parseImageMetadataText(raw: string): string {
  if (!raw) return ''
  return htmlToPlainText(unwrapLinksInHtml(normalizeFeedHtml(raw)))
}

/** Strip a leading language label such as "English: " from Commons metadata. */
function stripImageMetadataLanguagePrefix(text: string): string {
  return text.replace(/^[A-Za-z_-]+:\s*/, '').trim()
}

function resolveImageDescription(
  imageDescriptionRaw: string,
  objectNameRaw: string,
  fileTitle: string,
): string {
  const imageDescription = stripImageMetadataLanguagePrefix(parseImageMetadataText(imageDescriptionRaw))
  if (imageDescription) return imageDescription

  const objectName = stripImageMetadataLanguagePrefix(parseImageMetadataText(objectNameRaw))
  const fileName = imageDisplayTitle(fileTitle)
  if (objectName && objectName !== fileName && !objectName.startsWith('File:')) {
    return objectName
  }

  return ''
}

function commonsFilePageUrl(title: string): string {
  const path = encodeURIComponent(title.replace(/ /g, '_'))
  return `https://${COMMONS_HOST}/wiki/${path}`
}

function parseImagePage(page: {
  pageid?: number
  title?: string
  index?: number
  imageinfo?: Array<{
    url?: string
    thumburl?: string
    width?: number
    height?: number
    mime?: string
    extmetadata?: Record<string, ExtMetadataField>
  }>
}): WikitabSearchImage | null {
  if (typeof page.pageid !== 'number' || !page.title) return null

  const info = page.imageinfo?.[0]
  if (!info) return null

  const mime = info.mime ?? ''
  if (!mime.startsWith('image/')) return null

  const width = info.width ?? 0
  const height = info.height ?? 0
  if (width <= 0 || height <= 0) return null

  const thumbnailUrl = normalizeUrl(info.thumburl ?? info.url)
  if (!thumbnailUrl) return null

  const extmetadata = info.extmetadata ?? {}
  const licenseType = parseLicenseType(extMetadataValue(extmetadata.LicenseShortName))
  const licenseUrl = normalizeUrl(extMetadataValue(extmetadata.LicenseUrl)) ?? ''
  const artistHtml = parseArtistHtml(extMetadataValue(extmetadata.Artist))
  const description = resolveImageDescription(
    extMetadataValue(extmetadata.ImageDescription),
    extMetadataValue(extmetadata.ObjectName),
    page.title,
  )

  return {
    pageid: page.pageid,
    title: page.title,
    width,
    height,
    thumbnailUrl,
    filePageUrl: commonsFilePageUrl(page.title),
    mime,
    licenseType,
    licenseUrl,
    artistHtml,
    description,
  }
}

export function imageDisplayTitle(title: string): string {
  const trimmed = title.trim()
  return trimmed.startsWith('File:') ? trimmed.slice(5) : trimmed
}

export type ImageCardTitleFields = Pick<WikitabSearchImage, 'title' | 'description'>

/** Human-readable card title — caption/description when available, else file name. */
export function imageCardTitle(fields: ImageCardTitleFields): string {
  const caption = fields.description.trim()
  if (caption) return caption
  return imageDisplayTitle(fields.title)
}

export type ImageAttributionFields = Pick<WikitabSearchImage, 'licenseType' | 'artistHtml'>

function imageArtistText({ licenseType, artistHtml }: ImageAttributionFields): string {
  let artist = artistHtml
  if (licenseType && artist) {
    const licensePrefix = new RegExp(
      `^${licenseType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*,?\\s*`,
      'i',
    )
    artist = artist.replace(licensePrefix, '').trim()
  }
  return artist
}

export function formatImageAttribution(fields: ImageAttributionFields): string {
  const license = fields.licenseType.trim()
  const artist = imageArtistText(fields)
  if (license && artist) return `${license}, ${artist}`
  return license || artist
}

export function imageHasAttribution(image: WikitabSearchImage | null | undefined): boolean {
  if (!image) return false
  return Boolean(image.licenseType || image.artistHtml)
}

export type WikitabSearchImagesContinue = Record<string, string>

export async function fetchWikitabSearchImages(
  query: string,
  options: { signal?: AbortSignal; continueParams?: WikitabSearchImagesContinue } = {},
): Promise<{ images: WikitabSearchImage[]; continueParams: WikitabSearchImagesContinue | null }> {
  const trimmed = query.trim()
  if (!trimmed.length) return { images: [], continueParams: null }

  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: `${IMAGE_SEARCH_FILTERS} ${trimmed}`,
    gsrnamespace: '6',
    gsrlimit: String(WIKITAB_SEARCH_IMAGES_BATCH_SIZE),
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiextmetadatalanguage: 'en',
    iiextmetadatafilter: 'LicenseShortName|Artist|LicenseUrl|ImageDescription|ObjectName',
    iiurlwidth: String(THUMB_WIDTH),
  })

  if (options.continueParams) {
    for (const [key, value] of Object.entries(options.continueParams)) {
      params.set(key, value)
    }
  }

  const response = await fetchWikimedia(`${COMMONS_API}?${params.toString()}`, {
    signal: options.signal,
    headers: wikimediaApiFetchHeaders('wikitab-search-images'),
  })

  if (!response.ok) {
    throw new Error(`Commons image search failed (HTTP ${response.status})`)
  }

  const data = (await response.json()) as {
    continue?: WikitabSearchImagesContinue
    query?: {
      pages?: Record<
        string,
        {
          pageid?: number
          title?: string
          index?: number
          imageinfo?: Array<{
            url?: string
            thumburl?: string
            width?: number
            height?: number
            mime?: string
            extmetadata?: Record<string, ExtMetadataField>
          }>
        }
      >
    }
  }

  const pages = Object.values(data.query?.pages ?? {}).sort(
    (left, right) => (left.index ?? 0) - (right.index ?? 0),
  )
  const images = pages
    .map(parseImagePage)
    .filter((item): item is WikitabSearchImage => item !== null)

  const continueParams = data.continue
    ? Object.fromEntries(Object.entries(data.continue).filter(([key]) => key !== 'continue'))
    : null

  return {
    images,
    continueParams: continueParams && Object.keys(continueParams).length ? continueParams : null,
  }
}
