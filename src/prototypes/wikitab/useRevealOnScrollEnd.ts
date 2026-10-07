import { onUnmounted, watch, type Ref } from 'vue'

/** Roughly one card ahead of the right edge, so the next page is already there. */
const LOOKAHEAD_PX = 320

/**
 * Mobile's replacement for a "Show more" button: watch a sentinel at the end of
 * a horizontal scroller and reveal the next page as it comes into view. The
 * observer is torn down once the section is exhausted, so scrolling simply ends.
 */
export function useRevealOnScrollEnd(options: {
  scroller: Ref<HTMLElement | null>
  sentinel: Ref<HTMLElement | null>
  enabled: Ref<boolean>
  onReach: () => void
}) {
  let observer: IntersectionObserver | null = null

  function disconnect(): void {
    observer?.disconnect()
    observer = null
  }

  function connect(): void {
    disconnect()
    const root = options.scroller.value
    const target = options.sentinel.value
    if (!root || !target) return

    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) options.onReach()
      },
      { root, rootMargin: `0px ${LOOKAHEAD_PX}px 0px 0px` },
    )
    observer.observe(target)
  }

  watch(
    [options.enabled, options.scroller, options.sentinel],
    ([enabled]) => {
      if (enabled) connect()
      else disconnect()
    },
    { immediate: true, flush: 'post' },
  )

  onUnmounted(disconnect)
}
