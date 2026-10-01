import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

import { activeDiscussionPages } from '../../musical-group/data/fetchActiveDiscussions'
import type { HomeActiveDiscussion } from '../../musical-group/data/types'
import { activeDiscussionTabLabel } from '../data/activeDiscussionLabels'
import { MESSAGES } from '../i18n'

export interface ActiveDiscussionsTab {
  id: string
  label: string
}

export function useWikitaLiteActiveDiscussionsTabs(options: {
  items: MaybeRefOrGetter<HomeActiveDiscussion[]>
}) {
  const activeTabId = ref('all')

  const tabs = computed((): ActiveDiscussionsTab[] => {
    const items = toValue(options.items)
    const presentPages = new Set(items.map((item) => item.noticeboardPage))

    const result: ActiveDiscussionsTab[] = [{ id: 'all', label: MESSAGES.allTab }]

    for (const page of activeDiscussionPages()) {
      if (!presentPages.has(page)) continue
      const sample = items.find((item) => item.noticeboardPage === page)
      if (!sample) continue
      result.push({
        id: page,
        label: activeDiscussionTabLabel(sample.noticeboardTitle),
      })
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

    return allItems.filter((item) => item.noticeboardPage === activeTabId.value)
  })

  return {
    tabs,
    activeTabId,
    showTabs,
    filteredItems,
  }
}
