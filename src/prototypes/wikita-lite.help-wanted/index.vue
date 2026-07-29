<script setup lang="ts">
import { provideWikitaSaveFeedback } from '../musical-group/composables/useWikitaSaveFeedback'
import { useWikitaLiteHelpWantedPage } from '../wikita-lite/composables/useWikitaLiteHelpWantedPage'
import MobileSubpageHeader from '../wikita-lite/components/MobileSubpageHeader.vue'
import WikitaLiteShell from '../wikita-lite/components/WikitaLiteShell.vue'
import HelpWantedModule from '../wikita-lite/modules/HelpWantedModule.vue'
import { MODULE_TITLES } from '../wikita-lite/routes'

definePage({
  meta: {
    title: 'Wikita-lite — Suggested edits',
    description: 'Edit suggestions in Wikita-lite.',
  },
})

provideWikitaSaveFeedback()

const { helpWanted, helpWantedLoading, helpWantedLoadingMore, loadSentinel } =
  useWikitaLiteHelpWantedPage()
</script>

<template>
  <WikitaLiteShell :title="null">
    <MobileSubpageHeader :title="MODULE_TITLES.suggestedEdits" />
    <HelpWantedModule
      standalone
      :items="helpWanted"
      :loading="helpWantedLoading"
      :loading-more="helpWantedLoadingMore"
    />
    <div ref="loadSentinel" class="wikita-lite-help-wanted__sentinel" aria-hidden="true" />
  </WikitaLiteShell>
</template>

<style scoped>
:deep(.wikita-lite-shell[data-skin='mobile']) {
  padding-top: var(--spacing-100, 16px);
}

.wikita-lite-help-wanted__sentinel {
  height: 1px;
  flex-shrink: 0;
}
</style>
