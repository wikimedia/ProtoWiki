import { WIKITAB_SEARCH_IMAGES_BATCH_SIZE } from './data/fetchWikitabSearchImages'
import type { WikitabSearchImage } from './data/fetchWikitabSearchImages'

/** Mixed ratios so skeleton masonry feels like real Commons results. */
export const WIKITAB_IMAGE_SKELETON_ASPECT_RATIOS = [
  '4 / 3',
  '3 / 4',
  '16 / 9',
  '1 / 1',
  '5 / 4',
  '3 / 2',
  '2 / 3',
  '4 / 5',
  '5 / 3',
  '3 / 5',
]

/** Conservative placeholder while a load-more batch is in flight. */
export const WIKITAB_IMAGE_FETCHING_ASPECT_RATIO = '4 / 3'

export function skeletonAspectRatioForIndex(index: number): string {
  return WIKITAB_IMAGE_SKELETON_ASPECT_RATIOS[
    index % WIKITAB_IMAGE_SKELETON_ASPECT_RATIOS.length
  ]
}

export function parseSkeletonAspectRatio(aspectRatio: string): number {
  const [width, height] = aspectRatio.split('/').map((part) => Number(part.trim()))
  if (!width || !height) return 1
  return height / width
}

export function imageAspectRatio(image: WikitabSearchImage): string {
  if (image.width > 0 && image.height > 0) {
    return `${image.width} / ${image.height}`
  }
  return WIKITAB_IMAGE_FETCHING_ASPECT_RATIO
}

/** Round-robin batch slot counts per column during an in-flight load-more fetch. */
export function fetchingTailSlotCountsPerColumn(
  columnCount: number,
  loadingMore: boolean,
): number[] {
  const count = Math.max(1, columnCount)
  const slots = new Array<number>(count).fill(0)
  if (!loadingMore) return slots

  for (let index = 0; index < WIKITAB_SEARCH_IMAGES_BATCH_SIZE; index++) {
    slots[index % count] += 1
  }

  return slots
}

export type WikitabSearchImageColumnSlot =
  | { kind: 'image'; image: WikitabSearchImage }
  | { kind: 'fetching'; id: string; aspectRatio: string }
