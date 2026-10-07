import { onUnmounted, ref, watch, type Ref } from 'vue'

import type { WikitabSearchImage } from './data/fetchWikitabSearchImages'

export const WIKITAB_IMAGE_GRID_GAP_PX = 2
export const WIKITAB_IMAGE_MIN_COLUMNS = 2
/** Figma desktop column width (~319px in the 640px search column). */
export const WIKITAB_IMAGE_TARGET_COLUMN_WIDTH_PX = 320

export function columnCountForWidth(width: number): number {
  if (width <= 0) return WIKITAB_IMAGE_MIN_COLUMNS

  return Math.max(
    WIKITAB_IMAGE_MIN_COLUMNS,
    Math.floor(
      (width + WIKITAB_IMAGE_GRID_GAP_PX) /
        (WIKITAB_IMAGE_TARGET_COLUMN_WIDTH_PX + WIKITAB_IMAGE_GRID_GAP_PX),
    ),
  )
}

/** Minimum panel width that can fit `count` columns at the target width. */
export function minWidthForColumnCount(count: number): number {
  return (
    count * WIKITAB_IMAGE_TARGET_COLUMN_WIDTH_PX +
    (count - 1) * WIKITAB_IMAGE_GRID_GAP_PX
  )
}

/** Avoid flip-flopping column count when width hovers near a breakpoint. */
const COLUMN_COUNT_HYSTERESIS_PX = 48

export function columnCountForWidthWithHysteresis(
  width: number,
  currentCount: number,
): number {
  const ideal = columnCountForWidth(width)
  if (ideal === currentCount) return currentCount

  if (ideal > currentCount) {
    return width >= minWidthForColumnCount(ideal) ? ideal : currentCount
  }

  return width < minWidthForColumnCount(currentCount) - COLUMN_COUNT_HYSTERESIS_PX
    ? ideal
    : currentCount
}

/** Round-robin so the top of each column is the next search hit (row = rank band). */
export function distributeImagesToColumns(
  items: WikitabSearchImage[],
  columnCount: number,
): WikitabSearchImage[][] {
  const columns = Array.from({ length: columnCount }, () => [] as WikitabSearchImage[])

  for (let index = 0; index < items.length; index++) {
    columns[index % columnCount].push(items[index])
  }

  return columns
}

/** Column width for the full-bleed image grid (2px inset each side). */
export function imageGridColumnWidth(viewportWidth: number, columnCount: number): number {
  const gridWidth = Math.max(0, viewportWidth - 4)
  if (columnCount <= 0) return gridWidth

  return (gridWidth - (columnCount - 1) * WIKITAB_IMAGE_GRID_GAP_PX) / columnCount
}

export function estimateColumnContentHeight(
  images: WikitabSearchImage[],
  columnWidth: number,
): number {
  if (!images.length || columnWidth <= 0) return 0

  let height = 0
  for (let index = 0; index < images.length; index++) {
    if (index > 0) height += WIKITAB_IMAGE_GRID_GAP_PX

    const image = images[index]
    if (image.width > 0 && image.height > 0) {
      height += columnWidth * (image.height / image.width)
    } else {
      height += columnWidth * (3 / 4)
    }
  }

  return height
}

export function distributeCountToColumns(count: number, columnCount: number): number[] {
  const columns = new Array<number>(columnCount).fill(0)

  for (let index = 0; index < count; index++) {
    columns[index % columnCount] += 1
  }

  return columns
}

export function useWikitabSearchImageColumnCount(
  container: Ref<HTMLElement | null>,
): { columnCount: Ref<number> } {
  const columnCount = ref(WIKITAB_IMAGE_MIN_COLUMNS)
  let observer: ResizeObserver | null = null

  function measureWidth(): number {
    // Full-bleed image panel uses viewport width (minus 2px inset each side).
    // `window.innerWidth` is stable when a page scrollbar appears; `100vw` / element
    // clientWidth can oscillate and retrigger round-robin redistribution.
    return Math.max(0, window.innerWidth - 4)
  }

  function update(): void {
    columnCount.value = columnCountForWidthWithHysteresis(measureWidth(), columnCount.value)
  }

  watch(
    container,
    (element, _, onCleanup) => {
      observer?.disconnect()
      observer = null
      window.removeEventListener('resize', update)

      if (!element) return

      observer = new ResizeObserver(update)
      observer.observe(element)
      window.addEventListener('resize', update, { passive: true })
      update()

      onCleanup(() => {
        observer?.disconnect()
        observer = null
        window.removeEventListener('resize', update)
      })
    },
    { immediate: true },
  )

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
    window.removeEventListener('resize', update)
  })

  return { columnCount }
}
