import { computed } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'

import type { HomeTabId } from './components/WikitaHomeTabs.vue'
import type { TabId } from './data/types'
import { normalizeQid } from './data/wikidataApi'

const TAB_IDS: TabId[] = [
  'overview',
  'info',
  'article',
  'images',
  'links',
  'activity',
  'contribute',
]

const HOME_TAB_IDS: HomeTabId[] = [
  'home',
  'featured',
  'trending',
  'saved',
  'activity',
  'contribute',
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

  function homeTabRoute(tab: HomeTabId, hash?: string): RouteLocationRaw {
    const query = { ...route.query }
    if (tab === 'home') {
      delete query.tab
    } else {
      query.tab = tab
    }
    if (hash) {
      return { query, hash: hash.startsWith('#') ? hash : `#${hash}` }
    }
    return { query, hash: '' }
  }

  async function setTab(tab: TabId) {
    await router.replace(tabRoute(tab))
  }

  async function setHomeTab(tab: HomeTabId, hash?: string) {
    if (tab === activeHomeTab.value && !hash) {
      if (route.hash) {
        await router.push(homeTabRoute(tab))
      }
      return
    }
    await router.push(homeTabRoute(tab, hash))
  }

  async function goToHomeTab() {
    const query = { ...route.query }
    delete query.item
    delete query.tab
    await router.replace({ query })
  }

  async function goToContribute() {
    const id = normalizeQid(route.query.item)
    if (id) {
      await setTab('contribute')
    } else {
      await setHomeTab('contribute')
    }
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
    goToHomeTab,
    goToContribute,
  }
}
