import { nextTick, onMounted, onUnmounted, watch, type ComputedRef, type Ref } from 'vue'

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
  let rafId = 0

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
      item.style.height = 'auto'
    }

    if (!items.length) return

    // Reflow after clearing inline heights so wrapped text is measured at full height.
    void items[0].offsetHeight

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
      for (const el of row) {
        // Definite height so the bordered CdxCard can fill the slot (not just min-height).
        if (el.style.height !== rowHeight) el.style.height = rowHeight
        if (el.style.minHeight !== rowHeight) el.style.minHeight = rowHeight
      }
    }
  }

  /**
   * Cards often paint on the same tick as `ready` flips; measuring immediately
   * can lock a row before title/description wrapping finishes, clipping text
   * until a viewport resize retriggers equalization.
   */
  function scheduleEqualize(): void {
    cancelAnimationFrame(rafId)
    void nextTick(() => {
      rafId = requestAnimationFrame(() => {
        rafId = requestAnimationFrame(equalize)
      })
    })
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

    observer = new ResizeObserver(() => scheduleEqualize())
    observer.observe(options.container.value)
    observeCards()
    scheduleEqualize()
    void document.fonts.ready.then(scheduleEqualize)
  }

  onMounted(setup)
  onUnmounted(() => {
    cancelAnimationFrame(rafId)
    observer?.disconnect()
  })

  watch([options.container, options.columns, options.cardHeight, options.enabled], setup)
  watch(options.watchKeys, () => {
    observeCards()
    scheduleEqualize()
  })
}
