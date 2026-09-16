import { onMounted, onUnmounted, watch, type ComputedRef, type Ref } from 'vue'

/**
 * Keeps cards in each visual row the same height — pairs on desktop, the whole
 * carousel on mobile — equal to the tallest card in that row (at least
 * `cardHeight`, the reserved placeholder size from sections.ts).
 */
export function useEqualRowHeights(options: {
  container: Ref<HTMLElement | null>
  columns: ComputedRef<number>
  cardHeight: ComputedRef<number>
  enabled: ComputedRef<boolean>
  /** Re-run when slot count or readiness changes. */
  watchKeys: ComputedRef<unknown>[]
}): void {
  let observer: ResizeObserver | null = null

  function cardElements(): HTMLElement[] {
    const root = options.container.value
    if (!root) return []
    return Array.from(root.querySelectorAll<HTMLElement>(':scope > .wikitab-section__card'))
  }

  function equalize(): void {
    if (!options.enabled.value) return

    const items = cardElements()
    for (const item of items) {
      item.style.minHeight = ''
      item.style.height = ''
    }

    if (!items.length) return

    const floor = options.cardHeight.value
    const cols = options.columns.value
    const rows: HTMLElement[][] =
      cols <= 1
        ? [items]
        : Array.from({ length: Math.ceil(items.length / cols) }, (_, rowIndex) =>
            items.slice(rowIndex * cols, rowIndex * cols + cols),
          )

    for (const row of rows) {
      const max = Math.max(floor, ...row.map((el) => el.getBoundingClientRect().height))
      const rowHeight = `${max}px`
      for (const el of row) el.style.minHeight = rowHeight
    }
  }

  function observeCards(): void {
    const root = options.container.value
    if (!root || !observer) return
    for (const child of root.children) {
      if (child instanceof HTMLElement && child.classList.contains('wikitab-section__card')) {
        observer.observe(child)
      }
    }
  }

  function setup(): void {
    observer?.disconnect()
    if (!options.container.value || !options.enabled.value) return

    observer = new ResizeObserver(() => equalize())
    observer.observe(options.container.value)
    observeCards()
    equalize()
  }

  onMounted(setup)
  onUnmounted(() => observer?.disconnect())

  watch([options.container, options.columns, options.cardHeight, options.enabled], setup)
  watch(options.watchKeys, equalize)
}
