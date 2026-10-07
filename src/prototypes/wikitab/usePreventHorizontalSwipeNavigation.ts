import { onUnmounted, watch, type Ref } from 'vue'

function isAtLeftEdge(el: HTMLElement): boolean {
  return el.scrollLeft <= 0
}

function isAtRightEdge(el: HTMLElement): boolean {
  return el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
}

/**
 * Block browser back/forward navigation when a horizontal scroller is overscrolled
 * at its edges. CSS overscroll-behavior-x handles most cases; wheel and touch
 * listeners cover trackpad and touch browsers that still leak history gestures.
 */
export function usePreventHorizontalSwipeNavigation(options: {
  scroller: Ref<HTMLElement | null>
  enabled: Ref<boolean>
}) {
  let touchStartX = 0
  let touchStartY = 0

  function onWheel(event: WheelEvent): void {
    const el = options.scroller.value
    if (!el) return

    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return

    const scrollingLeft = event.deltaX < 0
    const scrollingRight = event.deltaX > 0

    if ((scrollingLeft && isAtLeftEdge(el)) || (scrollingRight && isAtRightEdge(el))) {
      event.preventDefault()
    }
  }

  function onTouchStart(event: TouchEvent): void {
    const touch = event.touches[0]
    if (!touch) return
    touchStartX = touch.clientX
    touchStartY = touch.clientY
  }

  function onTouchMove(event: TouchEvent): void {
    const el = options.scroller.value
    const touch = event.touches[0]
    if (!el || !touch) return

    const dx = touch.clientX - touchStartX
    const dy = touch.clientY - touchStartY

    if (Math.abs(dx) <= Math.abs(dy)) return

    const draggingRight = dx > 0
    const draggingLeft = dx < 0

    if ((draggingRight && isAtLeftEdge(el)) || (draggingLeft && isAtRightEdge(el))) {
      event.preventDefault()
    }
  }

  function disconnect(el: HTMLElement | null): void {
    if (!el) return
    el.removeEventListener('wheel', onWheel)
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
  }

  function connect(el: HTMLElement): void {
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
  }

  let attachedEl: HTMLElement | null = null

  function sync(): void {
    disconnect(attachedEl)
    attachedEl = null

    if (!options.enabled.value) return

    const el = options.scroller.value
    if (!el) return

    connect(el)
    attachedEl = el
  }

  watch([options.enabled, options.scroller], sync, { immediate: true, flush: 'post' })

  onUnmounted(() => disconnect(attachedEl))
}
