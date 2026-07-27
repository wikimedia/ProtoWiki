import { nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'

import {
  getMusicalGroupScrollPage,
  scrollMusicalGroupPageToTop,
} from './musicalGroupScrollOffset'
import { useMusicalGroupRoute } from './useMusicalGroupRoute'

/** Scroll home tabs to their content top on every open (no per-tab scroll memory). */
export function useMusicalGroupHomeTabScroll() {
  const route = useRoute()
  const { activeHomeTab } = useMusicalGroupRoute()

  let scrollRoot: HTMLElement | null = null
  let panelResizeObserver: ResizeObserver | null = null
  let panelStableTimer: ReturnType<typeof setTimeout> | null = null
  let pendingScrollTarget: number | null = null

  let previousTab = activeHomeTab.value

  function disconnectPanelObserver() {
    panelResizeObserver?.disconnect()
    panelResizeObserver = null
    pendingScrollTarget = null
    if (panelStableTimer) {
      clearTimeout(panelStableTimer)
      panelStableTimer = null
    }
  }

  function scrollPageTo(top: number) {
    const page = scrollRoot ?? getMusicalGroupScrollPage()
    if (!page) return
    page.scrollTo({ top: Math.max(0, top), behavior: 'instant' })
  }

  function observePanelForScrollRestore(page: HTMLElement, target: number) {
    disconnectPanelObserver()
    pendingScrollTarget = target

    const panel = page.querySelector('.musical-group-home__body')
    if (!panel) return

    panelResizeObserver = new ResizeObserver(() => {
      if (pendingScrollTarget == null) return
      scrollPageTo(pendingScrollTarget)
      if (panelStableTimer) clearTimeout(panelStableTimer)
      panelStableTimer = setTimeout(() => {
        disconnectPanelObserver()
      }, 1500)
    })
    panelResizeObserver.observe(panel)
  }

  function shouldDeferToFeaturedHashScroll(): boolean {
    return activeHomeTab.value === 'featured' && Boolean(route.hash)
  }

  function scrollActiveHomeTabToTop() {
    if (shouldDeferToFeaturedHashScroll()) return

    const apply = () => {
      const page = scrollRoot ?? getMusicalGroupScrollPage()
      if (!page) return

      disconnectPanelObserver()
      scrollMusicalGroupPageToTop()
      observePanelForScrollRestore(page, 0)
    }

    apply()
    requestAnimationFrame(apply)
    // Contribute / Activity load cards asynchronously after the tab panel mounts.
    window.setTimeout(apply, 100)
    window.setTimeout(apply, 400)
  }

  watch(activeHomeTab, async (tab) => {
    if (tab === previousTab) return
    previousTab = tab

    await nextTick()
    requestAnimationFrame(() => {
      scrollActiveHomeTabToTop()
    })
  })

  onMounted(() => {
    scrollRoot = getMusicalGroupScrollPage()
  })

  onUnmounted(() => {
    disconnectPanelObserver()
  })

  return {
    scrollActiveHomeTabToTop,
  }
}
