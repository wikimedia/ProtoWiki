<script setup lang="ts">
import { provideWikitaSaveFeedback } from '../musical-group/composables/useWikitaSaveFeedback'
import { useWikitaLiteHome, WIKITA_LITE_HELP_WANTED_STANDALONE_LIMIT } from '../wikita-lite/composables/useWikitaLiteHome'
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

const { helpWanted, helpWantedLoading } = useWikitaLiteHome({
  helpWantedLimit: WIKITA_LITE_HELP_WANTED_STANDALONE_LIMIT,
})
</script>

<template>
  <WikitaLiteShell :title="null">
    <MobileSubpageHeader :title="MODULE_TITLES.suggestedEdits" />
    <HelpWantedModule standalone :items="helpWanted" :loading="helpWantedLoading" />
  </WikitaLiteShell>
</template>

<style scoped>
:deep(.wikita-lite-shell[data-skin='mobile']) {
  padding-top: var(--spacing-100, 16px);
}
</style>
