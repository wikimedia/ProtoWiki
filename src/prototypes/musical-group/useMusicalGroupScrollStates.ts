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

/** Expanded vs collapsed chrome stack height — zero when the title is always one line. */
function measureTitleCollapseDelta(page: Element, stack: Element): number {
  const hadScrolled = page.hasAttribute('data-scrolled')

  page.removeAttribute('data-scrolled')
  const expandedHeight = stack.getBoundingClientRect().height

  page.setAttribute('data-scrolled', '')
  const collapsedHeight = stack.getBoundingClientRect().height

  if (!hadScrolled) page.removeAttribute('data-scrolled')

  return Math.max(0, expandedHeight - collapsedHeight)
}

/** Tracks title rule expand (chrome over carousel) and tabs stuck for border / layout state. */
export function useMusicalGroupScrollStates() {
  let scrollRoot: Element | null = null
  let resizeObserver: ResizeObserver | null = null
  let raf = 0
  let lastScrollTop = 0
  let expandedTabsTopPx = 132
  let titleCollapseDelta = 0
  let remeasureCollapseDelta = true
  let titleCollapsed = false

  function update() {
    if (!scrollRoot) return

    const stack = scrollRoot.querySelector('.musical-group-chrome-stack')
    const carouselTrack = scrollRoot.querySelector(
      '.musical-group-screen__intro .image-carousel__track',
    )
    const tabsSticky = scrollRoot.querySelector('.musical-group-tabs-sticky')

    if (!stack || !tabsSticky) return

    const gap = parseFloat(getComputedStyle(scrollRoot).getPropertyValue('--spacing-50')) || 8
    const pageTop = scrollRoot.getBoundingClientRect().top
    const scrollEl = scrollRoot as HTMLElement
    const scrollTop = scrollEl.scrollTop
    const hasScrolled = scrollTop > 1

    let wantTitleCollapsed = titleCollapsed
    if (scrollTop <= 1) {
      wantTitleCollapsed = false
    } else if (scrollTop > lastScrollTop) {
      wantTitleCollapsed = true
    } else if (scrollTop < lastScrollTop) {
      wantTitleCollapsed = false
    }

    const tabsRect = tabsSticky.getBoundingClientRect()
    const tabsAtStickyPosition = tabsRect.top <= pageTop + expandedTabsTopPx + 1
    const scrollAtEnd =
      scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 1

    scrollRoot.toggleAttribute('data-scrolled', wantTitleCollapsed)
    scrollRoot.style.setProperty(
      '--musical-group-title-collapse-padding',
      wantTitleCollapsed && titleCollapseDelta > 0 ? `${titleCollapseDelta}px` : '0px',
    )

    if (!wantTitleCollapsed) {
      if (remeasureCollapseDelta) {
        titleCollapseDelta = measureTitleCollapseDelta(scrollRoot, stack)
        remeasureCollapseDelta = false
      }
      expandedTabsTopPx = stack.getBoundingClientRect().height + gap
    }

    titleCollapsed = wantTitleCollapsed
    const stackRect = stack.getBoundingClientRect()

    let titleExpanded = false
    if (carouselTrack) {
      const carouselTrackRect = carouselTrack.getBoundingClientRect()
      // Full-width title rule only while the sticky stack is over the carousel track —
      // not while the short description is scrolling beneath the title.
      titleExpanded =
        carouselTrackRect.top < stackRect.bottom &&
        carouselTrackRect.bottom > stackRect.bottom
    }

    scrollRoot.toggleAttribute('data-title-expanded', titleExpanded)
    scrollRoot.toggleAttribute('data-tabs-stuck', tabsAtStickyPosition && hasScrolled)
    scrollRoot.toggleAttribute('data-scroll-at-end', scrollAtEnd)

    syncStickyLayout(scrollRoot)
    lastScrollTop = scrollTop
  }

  function scheduleUpdate() {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(update)
  }

  function onResize() {
    remeasureCollapseDelta = true
    scheduleUpdate()
  }

  onMounted(() => {
    scrollRoot = document.querySelector('.musical-group-page')
    if (!scrollRoot) return

    scrollRoot.style.setProperty('--musical-group-title-collapse-padding', '0px')
    scrollRoot.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })

    resizeObserver = new ResizeObserver(() => {
      remeasureCollapseDelta = true
      scheduleUpdate()
    })
    resizeObserver.observe(scrollRoot)

    const stack = scrollRoot.querySelector('.musical-group-chrome-stack')
    if (stack) {
      resizeObserver.observe(stack)
      const title = stack.querySelector('.wikita-title')
      if (title) resizeObserver.observe(title)
      const description = scrollRoot.querySelector('.image-carousel__description')
      if (description) resizeObserver.observe(description)
      const tabsSticky = scrollRoot.querySelector('.musical-group-tabs-sticky')
      if (tabsSticky) resizeObserver.observe(tabsSticky)
    }

    lastScrollTop = scrollRoot.scrollTop
    scheduleUpdate()
  })

  onUnmounted(() => {
    cancelAnimationFrame(raf)
    scrollRoot?.removeEventListener('scroll', scheduleUpdate)
    window.removeEventListener('resize', onResize)
    resizeObserver?.disconnect()
    scrollRoot?.removeAttribute('data-scrolled')
    scrollRoot?.removeAttribute('data-title-expanded')
    scrollRoot?.removeAttribute('data-tabs-stuck')
    scrollRoot?.removeAttribute('data-scroll-at-end')
    scrollRoot?.style.removeProperty('--musical-group-title-collapse-padding')
  })
}
