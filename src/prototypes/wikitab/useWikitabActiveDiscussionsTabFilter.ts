import { computed, ref, watch, type Ref } from 'vue'

import {
  activeDiscussionsItemsForTab,
  WIKITAB_ACTIVE_DISCUSSIONS_TABS,
  type WikitabActiveDiscussionsTab,
} from './data/wikitabActiveDiscussionsTabs'
import type { WikitabCardData } from './sections'

export function useWikitabActiveDiscussionsTabFilter(
  noticeboardItems: Ref<WikitabCardData[]>,
  articleItems: Ref<WikitabCardData[]>,
  options: {
    showNoticeboards: Ref<boolean>
    showSavedTalk: Ref<boolean>
  },
) {
  const activeTab = ref<WikitabActiveDiscussionsTab>('all')

  /** Tabs when both Configure sources are enabled — not gated on having cards. */
  const showTabs = computed(
    () => options.showNoticeboards.value && options.showSavedTalk.value,
  )

  const tabs = computed(() => (showTabs.value ? [...WIKITAB_ACTIVE_DISCUSSIONS_TABS] : []))

  /** Active list for the current tab (All = merge of both pools). */
  const filteredItems = computed(() => {
    if (!options.showNoticeboards.value && options.showSavedTalk.value) {
      return [...articleItems.value]
    }
    if (options.showNoticeboards.value && !options.showSavedTalk.value) {
      return [...noticeboardItems.value]
    }
    return activeDiscussionsItemsForTab(
      noticeboardItems.value,
      articleItems.value,
      activeTab.value,
    )
  })

  watch(showTabs, (visible) => {
    if (!visible) activeTab.value = 'all'
  })

  return { activeTab, showTabs, tabs, filteredItems }
}
