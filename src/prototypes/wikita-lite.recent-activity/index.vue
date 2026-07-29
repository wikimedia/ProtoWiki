<script setup lang="ts">
import { provideWikitaSaveFeedback } from '../musical-group/composables/useWikitaSaveFeedback'
import { useWikitaLiteHome } from '../wikita-lite/composables/useWikitaLiteHome'
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

provideWikitaSaveFeedback()

const { savedSorted, savedItemsLoading } = useWikitaLiteHome()
</script>

<template>
  <WikitaLiteShell :title="null">
    <MobileSubpageHeader :title="MODULE_TITLES.reviewChanges" />
    <RecentActivityModule
      standalone
      :saved-items="savedSorted"
      :saved-items-loading="savedItemsLoading"
    />
  </WikitaLiteShell>
</template>

<style scoped>
:deep(.wikita-lite-shell[data-skin='mobile']) {
  padding-top: var(--spacing-100, 16px);
}
</style>
