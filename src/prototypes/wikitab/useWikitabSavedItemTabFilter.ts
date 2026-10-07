import { computed, ref, watch, type Ref } from 'vue'

import {
  buildSavedItemTabs,
  filterSavedItemsByTab,
  savedItemTypesPresent,
  type WikitabSavedItemTab,
} from './data/wikitabSavedItemTabs'
import type { WikitabSavedItem } from './data/wikitabSavedItems'

export function useWikitabSavedItemTabFilter(savedItems: Ref<WikitabSavedItem[]>) {
  const activeTab = ref<WikitabSavedItemTab>('all')

  const presentTypes = computed(() => savedItemTypesPresent(savedItems.value))

  const showTabs = computed(() => presentTypes.value.length > 1)

  const tabs = computed(() => buildSavedItemTabs(savedItems.value))

  const filteredItems = computed(() => filterSavedItemsByTab(savedItems.value, activeTab.value))

  watch(presentTypes, (types) => {
    if (!showTabs.value) {
      activeTab.value = 'all'
      return
    }
    if (activeTab.value !== 'all' && !types.includes(activeTab.value)) {
      activeTab.value = 'all'
    }
  })

  return { activeTab, showTabs, tabs, filteredItems }
}
