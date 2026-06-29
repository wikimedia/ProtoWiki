import { computed } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'

import type { TabId } from './data/types'

const TAB_IDS: TabId[] = [
  'overview',
  'info',
  'article',
  'photos',
  'links',
  'members',
  'awards',
]

export function parseTabQuery(raw: unknown): TabId {
  if (typeof raw === 'string' && TAB_IDS.includes(raw as TabId)) {
    return raw as TabId
  }
  return 'overview'
}

export function useMusicalGroupRoute() {
  const route = useRoute()
  const router = useRouter()

  const activeTab = computed(() => parseTabQuery(route.query.tab))

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

  async function setTab(tab: TabId) {
    await router.replace(tabRoute(tab))
  }

  return {
    route,
    router,
    activeTab,
    tabRoute,
    itemRoute,
    setTab,
  }
}
