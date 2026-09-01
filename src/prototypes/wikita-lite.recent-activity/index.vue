<script setup lang="ts">
import { provideWikitaLiteSaveFeedback } from '../wikita-lite/composables/useWikitaLiteSaveFeedback'
import { useWikitaLiteRecentActivityPage } from '../wikita-lite/composables/useWikitaLiteRecentActivityPage'
import MobileSubpageHeader from '../wikita-lite/components/MobileSubpageHeader.vue'
import WikitaLiteShell from '../wikita-lite/components/WikitaLiteShell.vue'
import RecentActivityModule from '../wikita-lite/modules/RecentActivityModule.vue'
import { MODULE_TITLES } from '../wikita-lite/routes'

definePage({
  meta: {
    title: 'Wikita-lite — Review changes',
    description: 'Recent edits on saved pages in Wikita-lite.',
  },
})

provideWikitaLiteSaveFeedback()

const {
  mode,
  savedItems,
  savedItemsLoading,
  recentChanges,
  recentChangesLoading,
  recentChangesLoadingMore,
  loadSentinel,
} = useWikitaLiteRecentActivityPage()
</script>

<template>
  <WikitaLiteShell :title="null">
    <MobileSubpageHeader :title="MODULE_TITLES.reviewChanges" />
    <RecentActivityModule
      v-if="mode === 'saved'"
      standalone
      :saved-items="savedItems"
      :saved-items-loading="savedItemsLoading"
    />
    <template v-else>
      <RecentActivityModule
        standalone
        :items="recentChanges"
        :loading="recentChangesLoading"
        :loading-more="recentChangesLoadingMore"
      />
      <div
        ref="loadSentinel"
        class="wikita-lite-recent-activity__sentinel"
        aria-hidden="true"
      />
    </template>
  </WikitaLiteShell>
</template>

<style scoped>
:deep(.wikita-lite-shell[data-skin='mobile']) {
  padding-top: var(--spacing-100, 16px);
}

.wikita-lite-recent-activity__sentinel {
  height: 1px;
  flex-shrink: 0;
}
</style>
