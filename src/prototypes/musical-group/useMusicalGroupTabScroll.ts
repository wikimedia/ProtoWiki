import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import type { TabId } from './data/types'
import {
  getMusicalGroupScrollPage,
  isMusicalGroupTabsStuck,
  measureMusicalGroupTabContentTopScroll,
} from './musicalGroupScrollOffset'
import { parseTabQuery, useMusicalGroupRoute } from './useMusicalGroupRoute'

interface PendingSwitch {
  from: TabId
  to: TabId
  scrollTop: number
  tabsStuck: boolean
}

/** Per-tab scroll memory while tabs are stuck; preserves scroll when tabs are in document flow. */
export function useMusicalGroupTabScroll() {
  const route = useRoute()
  const { activeTab } = useMusicalGroupRoute()

  const tabScrollTops = new Map<TabId, number>()
  const visitedTabs = new Set<TabId>()
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
      }, 500)
    })
    panelResizeObserver.observe(panel)
  }

  function scrollToTabContent() {
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

  function requestScrollToTabContent() {
    forceScrollToContent = true
  }

  function applyScrollRestore(switchInfo: PendingSwitch) {
    const page = scrollRoot ?? getMusicalGroupScrollPage()
    if (!page) return

    disconnectPanelObserver()

    if (forceScrollToContent) {
      forceScrollToContent = false
      visitedTabs.add(switchInfo.to)
      tabScrollTops.set(switchInfo.to, measureMusicalGroupTabContentTopScroll(page))
      scrollToTabContent()
      return
    }

    if (switchInfo.tabsStuck) {
      visitedTabs.add(switchInfo.from)
      tabScrollTops.set(switchInfo.from, switchInfo.scrollTop)

      const isFirstVisit = !visitedTabs.has(switchInfo.to)
      const target = isFirstVisit
        ? measureMusicalGroupTabContentTopScroll(page)
        : (tabScrollTops.get(switchInfo.to) ?? measureMusicalGroupTabContentTopScroll(page))

      visitedTabs.add(switchInfo.to)
      isRestoringScroll = true
      scrollPageTo(target)
      observePanelForScrollRestore(page, target)
      requestAnimationFrame(() => {
        isRestoringScroll = false
      })
      return
    }

    isRestoringScroll = true
    scrollPageTo(switchInfo.scrollTop)
    requestAnimationFrame(() => {
      isRestoringScroll = false
    })
  }

  function onScroll() {
    const page = scrollRoot
    if (!page || !isMusicalGroupTabsStuck(page)) return
    if (isRestoringScroll || pendingSwitch.value) return

    const tab = parseTabQuery(route.query.tab)
    visitedTabs.add(tab)
    tabScrollTops.set(tab, page.scrollTop)
  }

  watch(
    () => [route.query.item, route.query.tab] as const,
    ([item, tabRaw]) => {
      const to = parseTabQuery(tabRaw)

      if (item !== previousItem) {
        tabScrollTops.clear()
        visitedTabs.clear()
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
    scrollRoot?.addEventListener('scroll', onScroll, { passive: true })
  })

  onUnmounted(() => {
    scrollRoot?.removeEventListener('scroll', onScroll)
    disconnectPanelObserver()
  })

  return {
    requestScrollToTabContent,
    scrollToTabContent,
  }
}
