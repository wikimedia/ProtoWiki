import type { CarouselImage } from './data/types'

/** Wider than 3:2 → full-width row (too landscape for half column). */
export const FULL_WIDTH_MIN_RATIO = 3 / 2

export type PhotoGridRow =
  | { kind: 'full'; image: CarouselImage }
  | { kind: 'pair'; left: CarouselImage; right: CarouselImage }
  | { kind: 'single'; image: CarouselImage }

export function imageAspectRatio(image: CarouselImage): number {
  if (image.width <= 0 || image.height <= 0) return 1
  return image.width / image.height
}

export function isFullWidthLandscape(image: CarouselImage): boolean {
  return imageAspectRatio(image) > FULL_WIDTH_MIN_RATIO
}

export function photoCellStyle(image: CarouselImage): { aspectRatio: string } {
  if (image.width > 0 && image.height > 0) {
    return { aspectRatio: `${image.width} / ${image.height}` }
  }
  return { aspectRatio: '1' }
}

/** At equal column width, the image with the larger width/height ratio is shorter. */
export function shorterImageInPair(left: CarouselImage, right: CarouselImage): CarouselImage {
  return imageAspectRatio(left) >= imageAspectRatio(right) ? left : right
}

/** Shared aspect ratio for both cells in a pair row (matches the shorter image). */
export function pairCellStyle(left: CarouselImage, right: CarouselImage): { aspectRatio: string } {
  return photoCellStyle(shorterImageInPair(left, right))
}

export function photoGridRowKey(row: PhotoGridRow): string {
  switch (row.kind) {
    case 'full':
    case 'single':
      return row.image.title ?? row.image.url
    case 'pair':
      return `${row.left.title ?? row.left.url}|${row.right.title ?? row.right.url}`
  }
}

/** Incrementally commits rows from a buffer — already-emitted rows never change. */
export class PhotoGridLayoutState {
  rows: PhotoGridRow[] = []
  private buffer: CarouselImage[] = []

  reset(): void {
    this.rows = []
    this.buffer = []
  }

  appendImages(images: CarouselImage[]): void {
    if (!images.length) return
    this.buffer.push(...images)
    this.processBuffer(false)
  }

  flush(): void {
    this.processBuffer(true)
  }

  private processBuffer(flush: boolean): void {
    while (this.buffer.length > 0) {
      const head = this.buffer[0]

      if (isFullWidthLandscape(head)) {
        this.rows.push({ kind: 'full', image: this.buffer.shift()! })
        continue
      }

      const leftRatio = imageAspectRatio(head)
      let bestIdx = -1
      let bestScore = Infinity

      for (let i = 1; i < this.buffer.length; i++) {
        if (isFullWidthLandscape(this.buffer[i])) continue
        const score = Math.abs(leftRatio - imageAspectRatio(this.buffer[i]))
        if (score < bestScore) {
          bestScore = score
          bestIdx = i
        }
      }

      if (bestIdx >= 0) {
        const right = this.buffer.splice(bestIdx, 1)[0]
        const left = this.buffer.shift()!
        this.rows.push({ kind: 'pair', left, right })
        continue
      }

      if (!flush) break

      const item = this.buffer.shift()!
      if (isFullWidthLandscape(item)) {
        this.rows.push({ kind: 'full', image: item })
      } else {
        this.rows.push({ kind: 'single', image: item })
      }
    }
  }
}
