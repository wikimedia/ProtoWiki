import type { CarouselImage } from './types'

/** Mirrors ImageCarousel.vue layout — not live DOM measurement. */
export const CAROUSEL_VIEWPORT_WIDTH = 412
export const CAROUSEL_GAP = 10
export const CAROUSEL_LEADING_INSET = 8
export const CAROUSEL_SLIDE_HEIGHT = 154

export function carouselSlideWidth(image: CarouselImage): number {
  if (image.width <= 0 || image.height <= 0) return CAROUSEL_SLIDE_HEIGHT
  return Math.round((CAROUSEL_SLIDE_HEIGHT * image.width) / image.height)
}

/** First slide whose start x is fully off-screen (start >= viewport width). */
export function firstOffScreenCarouselIndex(images: CarouselImage[]): number | null {
  if (!images.length) return null

  let x = CAROUSEL_LEADING_INSET

  for (let i = 0; i < images.length; i++) {
    if (i > 0) x += CAROUSEL_GAP
    if (x >= CAROUSEL_VIEWPORT_WIDTH) return i
    x += carouselSlideWidth(images[i])
  }

  return null
}

export function offScreenCarouselThumbnailUrl(images: CarouselImage[]): string | undefined {
  const index = firstOffScreenCarouselIndex(images)
  if (index === null) return undefined

  const url = images[index]?.url
  if (!url) return undefined

  return commonsThumbnailUrl(url)
}

function commonsThumbnailUrl(url: string): string {
  if (url.includes('commons.wikimedia.org/wiki/Special:FilePath/')) {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}width=72`
  }

  return url
}

/** Prefer an off-screen carousel slide; otherwise the first Commons image (for overview cards). */
export function overviewCarouselThumbnailUrl(
  images: CarouselImage[],
  options: { preferNonPrimary?: boolean } = {},
): string | undefined {
  const offScreen = offScreenCarouselThumbnailUrl(images)
  if (offScreen) return offScreen

  const index = options.preferNonPrimary && images.length > 1 ? 1 : 0
  const url = images[index]?.url
  if (!url) return undefined

  return commonsThumbnailUrl(url)
}
