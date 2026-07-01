import { computed } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'

import type { HomeTabId } from './components/WikitaHomeTabs.vue'
import type { TabId } from './data/types'

const TAB_IDS: TabId[] = [
  'overview',
  'info',
  'article',
  'images',
  'links',
]

const HOME_TAB_IDS: HomeTabId[] = [
  'home',
  'read',
  'featured',
  'trending',
  'activity',
  'contribute',
  'saved',
]

export function parseTabQuery(raw: unknown): TabId {
  if (raw === 'photos') return 'images'
  if (typeof raw === 'string' && TAB_IDS.includes(raw as TabId)) {
    return raw as TabId
  }
  return 'overview'
}

export function parseHomeTabQuery(raw: unknown): HomeTabId {
  if (typeof raw === 'string' && HOME_TAB_IDS.includes(raw as HomeTabId)) {
    return raw as HomeTabId
  }
  return 'home'
}

export function useMusicalGroupRoute() {
  const route = useRoute()
  const router = useRouter()

  const activeTab = computed(() => parseTabQuery(route.query.tab))
  const activeHomeTab = computed(() => parseHomeTabQuery(route.query.tab))

  function tabRoute(tab: TabId): RouteLocationRaw {
    const query = { ...route.query }
    if (tab === 'overview') {
      delete query.tab
    } else {
      query.tab = tab
    }
    return { query }
  }

  function itemRoute(id: string): RouteLocationRaw {
    const query = { ...route.query, item: id }
    delete query.tab
    return { query }
  }

  function homeTabRoute(tab: HomeTabId): RouteLocationRaw {
    const query = { ...route.query }
    if (tab === 'home') {
      delete query.tab
    } else {
      query.tab = tab
    }
    return { query }
  }

  async function setTab(tab: TabId) {
    await router.replace(tabRoute(tab))
  }

  async function setHomeTab(tab: HomeTabId) {
    if (tab === activeHomeTab.value) return
    await router.push(homeTabRoute(tab))
  }

  return {
    route,
    router,
    activeTab,
    activeHomeTab,
    tabRoute,
    homeTabRoute,
    itemRoute,
    setTab,
    setHomeTab,
  }
}
