import { onUnmounted, watch, type Ref } from 'vue'

const LOOKAHEAD_PX = 320

/**
 * Viewport-rooted infinite scroll: observe a sentinel near the bottom of the
 * page and call `onReach` when it enters view.
 */
export function useInfiniteScroll(options: {
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
    const target = options.sentinel.value
    if (!target) return

    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) options.onReach()
      },
      { root: null, rootMargin: `0px 0px ${LOOKAHEAD_PX}px 0px` },
    )
    observer.observe(target)
  }

  watch(
    [options.enabled, options.sentinel],
    ([enabled]) => {
      if (enabled) connect()
      else disconnect()
    },
    { immediate: true, flush: 'post' },
  )

  onUnmounted(disconnect)
}
