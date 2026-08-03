<script setup lang="ts">
import { useWikitaLiteHome } from '../wikita-lite/composables/useWikitaLiteHome'
import MobileSubpageHeader from '../wikita-lite/components/MobileSubpageHeader.vue'
import WikitaLiteShell from '../wikita-lite/components/WikitaLiteShell.vue'
import ActiveDiscussionsModule from '../wikita-lite/modules/ActiveDiscussionsModule.vue'
import { MODULE_TITLES } from '../wikita-lite/routes'

definePage({
  meta: {
    title: 'Wikita-lite — Active discussions',
    description: 'Active noticeboard discussions in Wikita-lite.',
  },
})

const {
  activeDiscussions,
  activeDiscussionsLoading,
  activeDiscussionsError,
  retryActiveDiscussionsFeed,
} = useWikitaLiteHome()
</script>

<template>
  <WikitaLiteShell :title="null">
    <MobileSubpageHeader :title="MODULE_TITLES.activeDiscussions" />
    <ActiveDiscussionsModule
      standalone
      :items="activeDiscussions"
      :loading="activeDiscussionsLoading"
      :error="activeDiscussionsError"
      @retry="retryActiveDiscussionsFeed"
    />
  </WikitaLiteShell>
</template>

<style scoped>
:deep(.wikita-lite-shell[data-skin='mobile']) {
  padding-top: var(--spacing-100, 16px);
}
</style>
