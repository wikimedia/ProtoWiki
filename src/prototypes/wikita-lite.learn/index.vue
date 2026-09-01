<script setup lang="ts">
import { provideWikitaLiteSaveFeedback } from '../wikita-lite/composables/useWikitaLiteSaveFeedback'
import MobileSubpageHeader from '../wikita-lite/components/MobileSubpageHeader.vue'
import WikitaLiteShell from '../wikita-lite/components/WikitaLiteShell.vue'
import LearnModule from '../wikita-lite/modules/LearnModule.vue'
import { MODULE_TITLES } from '../wikita-lite/routes'

definePage({
  meta: {
    title: 'Wikita-lite — Learn',
    description: 'Learn how to edit Wikipedia in Wikita-lite.',
  },
})

provideWikitaLiteSaveFeedback()
</script>

<template>
  <WikitaLiteShell :title="null">
    <MobileSubpageHeader :title="MODULE_TITLES.learn" />
    <LearnModule standalone />
  </WikitaLiteShell>
</template>
