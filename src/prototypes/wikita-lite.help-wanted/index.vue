<script setup lang="ts">
import { provideWikitaLiteSaveFeedback } from '../wikita-lite/composables/useWikitaLiteSaveFeedback'
import { useWikitaLiteHelpWantedPage } from '../wikita-lite/composables/useWikitaLiteHelpWantedPage'
import WikitaLiteConfigureButton from '../wikita-lite/components/WikitaLiteConfigureButton.vue'
import MobileSubpageHeader from '../wikita-lite/components/MobileSubpageHeader.vue'
import WikitaLiteShell from '../wikita-lite/components/WikitaLiteShell.vue'
import HelpWantedModule from '../wikita-lite/modules/HelpWantedModule.vue'
import { HELP_WANTED_CONFIGURE_PAGE, MODULE_TITLES } from '../wikita-lite/routes'

definePage({
  meta: {
    title: 'Wikita-lite — Suggested edits',
    description: 'Edit suggestions in Wikita-lite.',
  },
})

provideWikitaLiteSaveFeedback()

const { helpWanted, helpWantedLoading, helpWantedLoadingMore, loadSentinel } =
  useWikitaLiteHelpWantedPage()
</script>

<template>
  <WikitaLiteShell :title="null">
    <MobileSubpageHeader :title="MODULE_TITLES.suggestedEdits">
      <template #actions>
        <WikitaLiteConfigureButton
          :to="HELP_WANTED_CONFIGURE_PAGE"
          label="Configure suggested edits"
        />
      </template>
    </MobileSubpageHeader>
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
.wikita-lite-help-wanted__sentinel {
  height: 1px;
  flex-shrink: 0;
}
</style>
