import { onMounted, ref, watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export type WikitabSearchTab = 'articles' | 'images' | 'activity' | 'contribute'

const VALID_TABS = new Set<WikitabSearchTab>([
  'articles',
  'images',
  'activity',
  'contribute',
])

function tabFromQuery(tab: unknown): WikitabSearchTab {
  if (typeof tab === 'string' && VALID_TABS.has(tab as WikitabSearchTab)) {
    return tab as WikitabSearchTab
  }
  return 'articles'
}

/**
 * Active search-results tab — synced to `?tab=` (activity / images / contribute);
 * omitted query means Articles. Tab clicks push browser history.
 */
export function useWikitabSearchTab(): { activeTab: Ref<WikitabSearchTab> } {
  const route = useRoute()
  const router = useRouter()
  const activeTab = ref<WikitabSearchTab>('articles')

  function applyQueryToTab(): void {
    const fromQuery = tabFromQuery(route.query.tab)
    if (activeTab.value !== fromQuery) {
      activeTab.value = fromQuery
    }
  }

  function syncTabToQuery(): void {
    const query = { ...route.query }
    delete query.tab

    if (activeTab.value !== 'articles') {
      query.tab = activeTab.value
    }

    const tabUnchanged =
      route.query.tab === query.tab || (!route.query.tab && !query.tab)

    if (tabUnchanged) return

    void router.push({ path: route.path, query })
  }

  onMounted(() => {
    applyQueryToTab()
  })

  watch(() => route.query.tab, applyQueryToTab)
  watch(activeTab, () => {
    syncTabToQuery()
  })

  return { activeTab }
}
