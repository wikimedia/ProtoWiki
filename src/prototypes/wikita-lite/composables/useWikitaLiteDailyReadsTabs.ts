import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

import { useConfig } from '@/composables/useConfig'

import { listInterests } from '../../musical-group/data/interests'
import type { HomeRelated } from '../../musical-group/data/types'
import { useWikitaLiteSuggestionPreferencesSingleton } from './useWikitaLiteSuggestionPreferences'

export interface DailyReadsTab {
  id: string
  label: string
}

function tabId(prefix: string, title: string): string {
  return `${prefix}:${title.trim().toLowerCase()}`
}

export function useWikitaLiteDailyReadsTabs(options: {
  items: MaybeRefOrGetter<HomeRelated[]>
  listsVersion?: MaybeRefOrGetter<number>
}) {
  const { preferences, interestsVersion } = useWikitaLiteSuggestionPreferencesSingleton()
  const { currentUserPageLists } = useConfig()

  const activeTabId = ref('all')

  const tabs = computed((): DailyReadsTab[] => {
    void toValue(options.listsVersion)
    void interestsVersion.value
    void preferences.value.useInterests
    void preferences.value.useSavedPages
    void preferences.value.useEditingHistory
    void currentUserPageLists.value.readingList
    void currentUserPageLists.value.editedPages

    const result: DailyReadsTab[] = [{ id: 'all', label: 'All' }]

    if (preferences.value.useInterests) {
      for (const title of listInterests()) {
        result.push({ id: tabId('interest', title), label: title })
      }
    }

    if (preferences.value.useSavedPages) {
      for (const title of currentUserPageLists.value.readingList) {
        result.push({ id: tabId('saved', title), label: title })
      }
    }

    if (preferences.value.useEditingHistory) {
      for (const title of currentUserPageLists.value.editedPages) {
        result.push({ id: tabId('edited', title), label: title })
      }
    }

    return result
  })

  const showTabs = computed(() => tabs.value.length >= 3)

  watch(tabs, (next) => {
    if (!next.some((tab) => tab.id === activeTabId.value)) {
      activeTabId.value = 'all'
    }
  })

  const filteredItems = computed(() => {
    const allItems = toValue(options.items)

    if (activeTabId.value === 'all') {
      return allItems
    }

    const activeTab = tabs.value.find((tab) => tab.id === activeTabId.value)
    if (!activeTab) {
      return allItems
    }

    const key = activeTab.label.trim().toLowerCase()
    return allItems.filter((item) => item.relatedToTitle.trim().toLowerCase() === key)
  })

  return {
    tabs,
    activeTabId,
    showTabs,
    filteredItems,
  }
}
