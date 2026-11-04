import { onUnmounted, watch, type Ref } from 'vue'

const LOOKAHEAD_PX = 320
/** Cap sync fill-the-viewport loops (sentinel stays in range after each reveal). */
const MAX_PUMP_STEPS = 24

/**
 * Infinite scroll: observe a sentinel near the bottom and call `onReach` when
 * it enters view. Defaults to the viewport; pass `root` for a scrollable panel
 * (e.g. `.wikitab-panel` fullscreen module screens).
 *
 * While the sentinel stays within the root + lookahead after a sync reveal,
 * keeps calling `onReach` so short viewports fill without a second scroll.
 * For async loads, flip `enabled` off while busy so reconnect re-checks.
 */
export function useInfiniteScroll(options: {
  sentinel: Ref<HTMLElement | null>
  enabled: Ref<boolean>
  onReach: () => void
  /** Scroll container; omit or null = viewport. */
  root?: Ref<Element | null | undefined>
}) {
  let observer: IntersectionObserver | null = null
  let pumpScheduled = false

  function disconnect(): void {
    observer?.disconnect()
    observer = null
    pumpScheduled = false
  }

  function rootBottom(): number {
    const root = options.root?.value
    if (root instanceof Element) return root.getBoundingClientRect().bottom
    return window.innerHeight
  }

  function sentinelInRange(el: HTMLElement): boolean {
    return el.getBoundingClientRect().top < rootBottom() + LOOKAHEAD_PX
  }

  function pump(): void {
    if (pumpScheduled || !options.enabled.value) return
    const target = options.sentinel.value
    if (!target || !sentinelInRange(target)) return

    pumpScheduled = true
    let steps = 0

    const step = (): void => {
      if (!options.enabled.value || steps >= MAX_PUMP_STEPS) {
        pumpScheduled = false
        return
      }
      const el = options.sentinel.value
      if (!el || !sentinelInRange(el)) {
        pumpScheduled = false
        return
      }

      const before = el.getBoundingClientRect().top
      options.onReach()
      steps += 1

      requestAnimationFrame(() => {
        if (!options.enabled.value) {
          pumpScheduled = false
          return
        }
        const next = options.sentinel.value
        if (!next) {
          pumpScheduled = false
          return
        }
        const after = next.getBoundingClientRect().top
        // Sync reveal moved the sentinel further down and it's still in range —
        // keep filling. Unchanged position means a no-op or async load; stop and
        // wait for `enabled` to bounce (reconnect) when the load settles.
        if (after !== before && sentinelInRange(next)) {
          step()
          return
        }
        pumpScheduled = false
      })
    }

    step()
  }

  function connect(): void {
    disconnect()
    const target = options.sentinel.value
    if (!target) return

    const root = options.root?.value ?? null

    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) pump()
      },
      { root, rootMargin: `0px 0px ${LOOKAHEAD_PX}px 0px` },
    )
    observer.observe(target)
    // Initial / reconnect delivery is async and can be missed when `enabled`
    // bounces after a reveal/load while the sentinel stays in range — check now.
    requestAnimationFrame(() => {
      if (options.enabled.value) pump()
    })
  }

  watch(
    [options.enabled, options.sentinel, () => options.root?.value ?? null],
    ([enabled]) => {
      if (enabled) connect()
      else disconnect()
    },
    { immediate: true, flush: 'post' },
  )

  onUnmounted(disconnect)
}
