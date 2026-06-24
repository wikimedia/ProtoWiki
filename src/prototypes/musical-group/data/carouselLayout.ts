import type { CarouselImage, CarouselImageOrientation } from './types'

/** Mirrors ImageCarousel.vue layout — not live DOM measurement. */
export const CAROUSEL_VIEWPORT_WIDTH = 412
export const CAROUSEL_GAP = 10
export const CAROUSEL_LEADING_INSET = 8

const SLIDE_WIDTH: Record<CarouselImageOrientation, number> = {
  landscape: 231,
  square: 154,
  portrait: 103,
  tall: 77,
}

export function slideWidth(orientation: CarouselImageOrientation): number {
  return SLIDE_WIDTH[orientation]
}

/** First slide whose start x is fully off-screen (start >= viewport width). */
export function firstOffScreenCarouselIndex(images: CarouselImage[]): number | null {
  if (!images.length) return null

  let x = CAROUSEL_LEADING_INSET

  for (let i = 0; i < images.length; i++) {
    if (i > 0) x += CAROUSEL_GAP
    if (x >= CAROUSEL_VIEWPORT_WIDTH) return i
    x += slideWidth(images[i].orientation)
  }

  return null
}

export function offScreenCarouselThumbnailUrl(images: CarouselImage[]): string | undefined {
  const index = firstOffScreenCarouselIndex(images)
  if (index === null) return undefined

  const url = images[index]?.url
  if (!url) return undefined

  if (url.includes('commons.wikimedia.org/wiki/Special:FilePath/')) {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}width=72`
  }

  return url
}
