import { onMounted, onUnmounted } from 'vue'

import { measureMusicalGroupStickyScrollOffset } from './musicalGroupScrollOffset'

function syncStickyLayout(page: Element) {
  const stack = page.querySelector('.musical-group-chrome-stack')
  if (!stack) return

  const gap = parseFloat(getComputedStyle(page).getPropertyValue('--spacing-50')) || 8
  const stackHeight = stack.getBoundingClientRect().height
  const tabsTop = stackHeight + gap

  page.style.setProperty('--musical-group-chrome-stack-height', `${stackHeight}px`)
  page.style.setProperty('--musical-group-tabs-sticky-top', `${tabsTop}px`)

  const tabsSticky = page.querySelector('.musical-group-tabs-sticky')
  if (tabsSticky) {
    page.style.setProperty(
      '--musical-group-tabs-height',
      `${tabsSticky.getBoundingClientRect().height}px`,
    )
  }

  page.style.setProperty(
    '--musical-group-scroll-margin-top',
    `${measureMusicalGroupStickyScrollOffset(page)}px`,
  )
}

/** Tracks title rule expand (chrome over carousel) and tabs stuck for border / layout state. */
export function useMusicalGroupScrollStates() {
  let scrollRoot: Element | null = null
  let resizeObserver: ResizeObserver | null = null
  let raf = 0

  function update() {
    if (!scrollRoot) return

    const stack = scrollRoot.querySelector('.musical-group-chrome-stack')
    const carouselTrack = scrollRoot.querySelector(
      '.musical-group-screen__intro .image-carousel__track',
    )
    const tabsSticky = scrollRoot.querySelector('.musical-group-tabs-sticky')

    if (!stack || !tabsSticky) return

    syncStickyLayout(scrollRoot)

    const stackRect = stack.getBoundingClientRect()
    const pageTop = scrollRoot.getBoundingClientRect().top
    const tabsTopPx =
      parseFloat(getComputedStyle(scrollRoot).getPropertyValue('--musical-group-tabs-sticky-top')) ||
      105

    let titleExpanded = false
    if (carouselTrack) {
      const carouselTrackRect = carouselTrack.getBoundingClientRect()
      // Full-width title rule only while the sticky stack is over the carousel track —
      // not while the short description is scrolling beneath the title.
      titleExpanded =
        carouselTrackRect.top < stackRect.bottom &&
        carouselTrackRect.bottom > stackRect.bottom
    }

    const tabsRect = tabsSticky.getBoundingClientRect()
    const tabsAtStickyPosition = tabsRect.top <= pageTop + tabsTopPx + 1
    const scrollEl = scrollRoot as HTMLElement
    const hasScrolled = scrollEl.scrollTop > 1
    const scrollAtEnd =
      scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 1

    scrollRoot.toggleAttribute('data-title-expanded', titleExpanded)
    scrollRoot.toggleAttribute('data-tabs-stuck', tabsAtStickyPosition && hasScrolled)
    scrollRoot.toggleAttribute('data-scroll-at-end', scrollAtEnd)
  }

  function scheduleUpdate() {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(update)
  }

  onMounted(() => {
    scrollRoot = document.querySelector('.musical-group-page')
    if (!scrollRoot) return

    scrollRoot.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate, { passive: true })

    resizeObserver = new ResizeObserver(scheduleUpdate)
    resizeObserver.observe(scrollRoot)

    const stack = scrollRoot.querySelector('.musical-group-chrome-stack')
    if (stack) {
      resizeObserver.observe(stack)
      const tabsSticky = scrollRoot.querySelector('.musical-group-tabs-sticky')
      if (tabsSticky) resizeObserver.observe(tabsSticky)
    }

    scheduleUpdate()
  })

  onUnmounted(() => {
    cancelAnimationFrame(raf)
    scrollRoot?.removeEventListener('scroll', scheduleUpdate)
    window.removeEventListener('resize', scheduleUpdate)
    resizeObserver?.disconnect()
    scrollRoot?.removeAttribute('data-title-expanded')
    scrollRoot?.removeAttribute('data-tabs-stuck')
    scrollRoot?.removeAttribute('data-scroll-at-end')
  })
}
