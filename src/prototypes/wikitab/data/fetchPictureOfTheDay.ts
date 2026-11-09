import type { FeaturedFeedResponse } from './fetchDailyFeed'
import { getFeaturedPayload } from './fetchDailyFeed'
import {
  readCacheJsonUnlessBypassed,
  utcDayKey,
  wikitabCacheKey,
  writeCacheJson,
} from './wikitabCacheHelpers'
import { WIKITAB_LANGUAGE } from './wikitabLanguage'
import { normalizeFeedHtml, unwrapLinksInHtml, wikiArticleUrl } from './wikitabHtml'

export const CACHE_KEY = 'wikitab-potd-cache-v7'

const COMMONS_POTD_PAGE = 'https://commons.wikimedia.org/wiki/Commons:Picture_of_the_day'

/** Largest width Commons reliably serves via `/thumb/…/{width}px-…` for typical POTD photos. */
const POTD_BACKGROUND_WIDTH = 1920

export interface WikitabPotd {
  thumbnailUrl: string | null
  /** Commons Picture of the day page, anchored to today's calendar day. */
  url: string
  descriptionHtml: string
  artistHtml: string
  licenseType: string
  licenseUrl: string
}

const EMPTY_POTD: WikitabPotd = {
  thumbnailUrl: null,
  url: '',
  descriptionHtml: '',
  artistHtml: '',
  licenseType: '',
  licenseUrl: '',
}

/** In-session memory — skips localStorage reads when the key matches. */
let sessionEntry: { lang: string; day: string; potd: WikitabPotd } | null = null

function readCachedPotd(lang: string, day: string): WikitabPotd | undefined {
  if (sessionEntry?.lang === lang && sessionEntry.day === day) return sessionEntry.potd

  const entry = readCacheJsonUnlessBypassed(wikitabCacheKey(CACHE_KEY, lang)) as {
    day?: string
    potd?: WikitabPotd
  } | null
  if (!entry || entry.day !== day || !entry.potd) return undefined

  sessionEntry = { lang, day, potd: entry.potd }
  return sessionEntry.potd
}

function writeCachedPotd(lang: string, day: string, potd: WikitabPotd): void {
  sessionEntry = { lang, day, potd }
  writeCacheJson(wikitabCacheKey(CACHE_KEY, lang), { day, potd })
}

function stripUrlQuery(url: string): string {
  return url.split('?')[0] ?? url
}

/** Scale an upload.wikimedia.org original to a fixed-width Commons thumb URL. */
function commonsScaledImageUrl(originalUrl: string, width: number): string | null {
  const base = stripUrlQuery(originalUrl)
  const match = base.match(/^https?:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/(?!thumb\/)(.+)$/)
  if (!match) return null

  const path = match[1]
  const slash = path.lastIndexOf('/')
  if (slash === -1) return null

  const dir = path.slice(0, slash)
  const file = path.slice(slash + 1)
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${dir}/${file}/${width}px-${file}`
}

function upsizeThumbUrl(thumbUrl: string, width: number): string {
  const base = stripUrlQuery(thumbUrl).replace(
    /^https?:\/\/thumb\.wikimedia\.org/,
    'https://upload.wikimedia.org',
  )
  return base.replace(/\/(\d+)px-/, `/${width}px-`)
}

/** Prefer a ~1920px render from `image.image`; fall back to upscaled thumbnail. */
function resolvePotdImageUrl(image: NonNullable<FeaturedFeedResponse['image']>): string | null {
  const original = image.image?.source
  const thumb = image.thumbnail?.source

  if (original) {
    const originalWidth = image.image?.width ?? 0
    if (originalWidth > POTD_BACKGROUND_WIDTH) {
      return commonsScaledImageUrl(original, POTD_BACKGROUND_WIDTH) ?? stripUrlQuery(original)
    }
    return stripUrlQuery(original)
  }

  if (thumb) {
    return upsizeThumbUrl(thumb, POTD_BACKGROUND_WIDTH)
  }

  return null
}

/**
 * Dated enwiki POTD entry — same target as `#mp-tfp` “archive” links on Main Page.
 * `Template:POTD/…` only exists on enwiki, so this never follows the language setting.
 */
export function wikipediaPotdPageUrl(day: string = utcDayKey()): string {
  return wikiArticleUrl('en.wikipedia.org', `Template:POTD/${day}`)
}

/** `Commons:Picture_of_the_day#28` — day-of-month anchor on the current-month POTD page. */
export function commonsPotdPageUrl(day: string = utcDayKey()): string {
  const dayOfMonth = Number(day.slice(8, 10))
  if (!Number.isFinite(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    return COMMONS_POTD_PAGE
  }
  return `${COMMONS_POTD_PAGE}#${dayOfMonth}`
}

function mapPotd(payload: FeaturedFeedResponse, day: string): WikitabPotd {
  const image = payload.image
  if (!image) return { ...EMPTY_POTD }

  const thumbnailUrl = resolvePotdImageUrl(image)
  const descriptionHtml =
    typeof image.description?.html === 'string' ? normalizeFeedHtml(image.description.html) : ''
  const artistHtml =
    typeof image.artist?.html === 'string'
      ? unwrapLinksInHtml(normalizeFeedHtml(image.artist.html))
      : ''
  const licenseType = image.license?.type ?? ''
  const licenseUrl = image.license?.url ?? ''
  const url = commonsPotdPageUrl(day)

  if (!thumbnailUrl && !descriptionHtml && !artistHtml && !licenseType) {
    return { ...EMPTY_POTD }
  }

  return {
    thumbnailUrl,
    url,
    descriptionHtml,
    artistHtml,
    licenseType,
    licenseUrl,
  }
}

export function potdHasAttribution(potd: WikitabPotd | null | undefined): boolean {
  if (!potd) return false
  return Boolean(potd.descriptionHtml || potd.artistHtml || potd.licenseType)
}

/** Today's Picture of the day from `feed/featured`, or empty fields when missing. */
export async function fetchPictureOfTheDay(
  day: string = utcDayKey(),
  signal?: AbortSignal,
): Promise<WikitabPotd> {
  // `getFeaturedPayload` reads this page load's wiki — cache under that language.
  const lang = WIKITAB_LANGUAGE
  const cached = readCachedPotd(lang, day)
  if (cached !== undefined) return cached

  try {
    const payload = await getFeaturedPayload(day, signal)
    const potd = mapPotd(payload, day)
    writeCachedPotd(lang, day, potd)
    return potd
  } catch {
    // Don't cache a network failure for the whole day — retry on next load.
    return { ...EMPTY_POTD }
  }
}
