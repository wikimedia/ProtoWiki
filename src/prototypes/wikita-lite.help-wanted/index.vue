<script setup lang="ts">
import { t } from '@/i18n'

import { provideWikitaLiteSaveFeedback } from '../wikita-lite/composables/useWikitaLiteSaveFeedback'
import { useWikitaLiteHelpWantedPage } from '../wikita-lite/composables/useWikitaLiteHelpWantedPage'
import WikitaLiteConfigureButton from '../wikita-lite/components/WikitaLiteConfigureButton.vue'
import MobileSubpageHeader from '../wikita-lite/components/MobileSubpageHeader.vue'
import WikitaLiteShell from '../wikita-lite/components/WikitaLiteShell.vue'
import HelpWantedModule from '../wikita-lite/modules/HelpWantedModule.vue'
import { MODULE_TITLES, PERSONALIZATION_PAGE } from '../wikita-lite/routes'

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
          :to="PERSONALIZATION_PAGE"
          :label="t('personalization.openButton')"
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
