import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import type { HomeTabId } from './components/WikitaHomeTabs.vue'
import {
  getMusicalGroupScrollPage,
  measureMusicalGroupHomeTabContentTopScroll,
} from './musicalGroupScrollOffset'
import { parseHomeTabQuery, useMusicalGroupRoute } from './useMusicalGroupRoute'

interface PendingSwitch {
  from: HomeTabId
  to: HomeTabId
  scrollTop: number
}

/** Per-tab scroll memory for the home view; cleared when MusicalGroupHome unmounts. */
export function useMusicalGroupHomeTabScroll() {
  const route = useRoute()
  const { activeHomeTab } = useMusicalGroupRoute()

  const tabScrollTops = new Map<HomeTabId, number>()
  const pendingSwitch = ref<PendingSwitch | null>(null)

  let scrollRoot: HTMLElement | null = null
  let isRestoringScroll = false
  let panelResizeObserver: ResizeObserver | null = null
  let panelStableTimer: ReturnType<typeof setTimeout> | null = null
  let pendingScrollTarget: number | null = null

  let previousTab = parseHomeTabQuery(route.query.tab)

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
      }, 500)
    })
    panelResizeObserver.observe(panel)
  }

  function applyScrollRestore(switchInfo: PendingSwitch) {
    const page = scrollRoot ?? getMusicalGroupScrollPage()
    if (!page) return

    disconnectPanelObserver()

    tabScrollTops.set(switchInfo.from, switchInfo.scrollTop)

    const target =
      tabScrollTops.get(switchInfo.to) ?? measureMusicalGroupHomeTabContentTopScroll(page)

    isRestoringScroll = true
    scrollPageTo(target)
    observePanelForScrollRestore(page, target)
    requestAnimationFrame(() => {
      isRestoringScroll = false
    })
  }

  function onScroll() {
    const page = scrollRoot
    if (!page) return
    if (isRestoringScroll || pendingSwitch.value) return

    const tab = parseHomeTabQuery(route.query.tab)
    tabScrollTops.set(tab, page.scrollTop)
  }

  watch(
    () => route.query.tab,
    (tabRaw) => {
      const to = parseHomeTabQuery(tabRaw)
      const from = previousTab

      if (from !== to) {
        const page = getMusicalGroupScrollPage()
        if (page) {
          pendingSwitch.value = {
            from,
            to,
            scrollTop: page.scrollTop,
          }
        }
      }

      previousTab = to
    },
    { flush: 'sync' },
  )

  watch(activeHomeTab, async () => {
    const switchInfo = pendingSwitch.value
    if (!switchInfo) return
    pendingSwitch.value = null

    await nextTick()
    requestAnimationFrame(() => {
      applyScrollRestore(switchInfo)
    })
  })

  onMounted(() => {
    scrollRoot = getMusicalGroupScrollPage()
    scrollRoot?.addEventListener('scroll', onScroll, { passive: true })
  })

  onUnmounted(() => {
    scrollRoot?.removeEventListener('scroll', onScroll)
    disconnectPanelObserver()
  })
}
