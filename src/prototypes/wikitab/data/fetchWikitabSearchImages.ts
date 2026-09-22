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
}

function normalizeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  return url.startsWith('//') ? `https:${url}` : url
}

function commonsFilePageUrl(title: string): string {
  const path = encodeURIComponent(title.replace(/ /g, '_'))
  return `https://${COMMONS_HOST}/wiki/${path}`
}

function parseImagePage(
  page: {
    pageid?: number
    title?: string
    index?: number
    imageinfo?: Array<{
      url?: string
      thumburl?: string
      width?: number
      height?: number
      mime?: string
    }>
  },
): WikitabSearchImage | null {
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

  return {
    pageid: page.pageid,
    title: page.title,
    width,
    height,
    thumbnailUrl,
    filePageUrl: commonsFilePageUrl(page.title),
    mime,
  }
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
    gsrsearch: `${MEDIASEARCH_IMAGE_FILTERS} ${trimmed}`,
    gsrnamespace: '6',
    gsrlimit: String(WIKITAB_SEARCH_IMAGES_BATCH_SIZE),
    prop: 'imageinfo',
    iiprop: 'url|size|mime',
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
    ? Object.fromEntries(
        Object.entries(data.continue).filter(([key]) => key !== 'continue'),
      )
    : null

  return {
    images,
    continueParams: continueParams && Object.keys(continueParams).length ? continueParams : null,
  }
}
