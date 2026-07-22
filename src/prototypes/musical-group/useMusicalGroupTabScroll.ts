import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import type { TabId } from './data/types'
import {
  getMusicalGroupScrollPage,
  isMusicalGroupTabsStuck,
  measureMusicalGroupTabsStuckBaseline,
  measureMusicalGroupTabContentTopScroll,
} from './musicalGroupScrollOffset'
import { parseTabQuery, useMusicalGroupRoute } from './useMusicalGroupRoute'

interface PendingSwitch {
  from: TabId
  to: TabId
  scrollTop: number
  tabsStuck: boolean
}

/** Item-page tab scroll: preserve scroll when tabs are in flow; snap to stuck baseline when stuck. */
export function useMusicalGroupTabScroll() {
  const route = useRoute()
  const { activeTab } = useMusicalGroupRoute()

  const pendingSwitch = ref<PendingSwitch | null>(null)

  let scrollRoot: HTMLElement | null = null
  let isRestoringScroll = false
  let panelResizeObserver: ResizeObserver | null = null
  let panelStableTimer: ReturnType<typeof setTimeout> | null = null
  let pendingScrollTarget: number | null = null

  let previousItem = route.query.item
  let previousTab = parseTabQuery(route.query.tab)
  let forceScrollToContent = false

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

    const panel = page.querySelector('.musical-group-screen__panel')
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

  function scrollActiveTabToTop() {
    const apply = () => {
      const page = scrollRoot ?? getMusicalGroupScrollPage()
      if (!page) return

      const target = measureMusicalGroupTabsStuckBaseline(page)
      disconnectPanelObserver()
      scrollPageTo(target)
      observePanelForScrollRestore(page, target)
    }

    apply()
    requestAnimationFrame(apply)
    window.setTimeout(apply, 100)
    window.setTimeout(apply, 400)
  }

  function scrollToTabContentWhenUnstuck() {
    const page = scrollRoot ?? getMusicalGroupScrollPage()
    if (!page) return

    disconnectPanelObserver()

    const target = measureMusicalGroupTabContentTopScroll(page)
    isRestoringScroll = true
    scrollPageTo(target)
    observePanelForScrollRestore(page, target)
    requestAnimationFrame(() => {
      isRestoringScroll = false
    })
  }

  function scrollToTabContent() {
    const page = scrollRoot ?? getMusicalGroupScrollPage()
    if (!page) return

    if (isMusicalGroupTabsStuck(page)) {
      scrollActiveTabToTop()
      return
    }

    scrollToTabContentWhenUnstuck()
  }

  function requestScrollToTabContent() {
    forceScrollToContent = true
  }

  function applyScrollRestore(switchInfo: PendingSwitch) {
    const page = scrollRoot ?? getMusicalGroupScrollPage()
    if (!page) return

    disconnectPanelObserver()

    if (forceScrollToContent) {
      forceScrollToContent = false
      if (switchInfo.tabsStuck) {
        scrollActiveTabToTop()
      } else {
        scrollToTabContentWhenUnstuck()
      }
      return
    }

    if (switchInfo.tabsStuck) {
      scrollActiveTabToTop()
      return
    }

    isRestoringScroll = true
    scrollPageTo(switchInfo.scrollTop)
    requestAnimationFrame(() => {
      isRestoringScroll = false
    })
  }

  watch(
    () => [route.query.item, route.query.tab] as const,
    ([item, tabRaw]) => {
      const to = parseTabQuery(tabRaw)

      if (item !== previousItem) {
        pendingSwitch.value = null
        disconnectPanelObserver()
        previousItem = item
        previousTab = to
        return
      }

      const from = previousTab
      if (from !== to) {
        const page = getMusicalGroupScrollPage()
        if (page) {
          pendingSwitch.value = {
            from,
            to,
            scrollTop: page.scrollTop,
            tabsStuck: isMusicalGroupTabsStuck(page),
          }
        }
      }

      previousItem = item
      previousTab = to
    },
    { flush: 'sync' },
  )

  watch(activeTab, async () => {
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
  })

  onUnmounted(() => {
    disconnectPanelObserver()
  })

  return {
    requestScrollToTabContent,
    scrollToTabContent,
    scrollActiveTabToTop,
  }
}
