import { onUnmounted, watch, type Ref } from 'vue'

const LOOKAHEAD_PX = 320

/**
 * Viewport-rooted infinite scroll: observe multiple sentinels and call
 * `onReach` when any of them enters view.
 */
export function useInfiniteScrollMany(options: {
  sentinels: Ref<(HTMLElement | null)[]>
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

    const targets = options.sentinels.value.filter(
      (target): target is HTMLElement => target instanceof HTMLElement,
    )
    if (!targets.length) return

    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) options.onReach()
      },
      { root: null, rootMargin: `0px 0px ${LOOKAHEAD_PX}px 0px` },
    )

    for (const target of targets) {
      observer.observe(target)
    }
  }

  watch(
    () => {
      const targets = options.sentinels.value
      return [options.enabled.value, targets.length, ...targets] as const
    },
    ([enabled]) => {
      if (enabled) connect()
      else disconnect()
    },
    { immediate: true, flush: 'post' },
  )

  onUnmounted(disconnect)
}
