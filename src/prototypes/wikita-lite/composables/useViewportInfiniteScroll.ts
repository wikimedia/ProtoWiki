import { onUnmounted, watch, type Ref } from 'vue'

export function useViewportInfiniteScroll(options: {
  sentinel: Ref<HTMLElement | null>
  active: Ref<boolean>
  hasMore: Ref<boolean>
  loading: Ref<boolean>
  loadMore: () => void | Promise<void>
}): void {
  let observer: IntersectionObserver | null = null

  function disconnect(): void {
    observer?.disconnect()
    observer = null
  }

  function connect(): void {
    disconnect()
    const target = options.sentinel.value
    if (!target || !options.active.value) return

    observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        if (!options.active.value || options.loading.value || !options.hasMore.value) return
        void options.loadMore()
      },
      { rootMargin: '120px' },
    )
    observer.observe(target)
  }

  watch(
    () => [options.sentinel.value, options.active.value] as const,
    () => connect(),
    { flush: 'post' },
  )

  watch(
    () => options.loading.value,
    (isLoading, wasLoading) => {
      if (!wasLoading || isLoading) return
      requestAnimationFrame(() => connect())
    },
  )

  onUnmounted(disconnect)
}

export function isSentinelNearViewport(sentinel: HTMLElement | null, rootMarginPx = 120): boolean {
  if (!sentinel) {
    return document.documentElement.scrollHeight <= window.innerHeight + rootMarginPx
  }
  return sentinel.getBoundingClientRect().top <= window.innerHeight + rootMarginPx
}
