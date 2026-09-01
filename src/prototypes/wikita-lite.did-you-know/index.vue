<script setup lang="ts">
import { provideWikitaLiteSaveFeedback } from '../wikita-lite/composables/useWikitaLiteSaveFeedback'
import { useWikitaLiteHome } from '../wikita-lite/composables/useWikitaLiteHome'
import MobileSubpageHeader from '../wikita-lite/components/MobileSubpageHeader.vue'
import WikitaLiteShell from '../wikita-lite/components/WikitaLiteShell.vue'
import DidYouKnowModule from '../wikita-lite/modules/DidYouKnowModule.vue'
import { MODULE_TITLES } from '../wikita-lite/routes'

definePage({
  meta: {
    title: 'Wikita-lite — Did you know',
    description: 'Did you know hooks in Wikita-lite.',
  },
})

const { listsVersion } = provideWikitaLiteSaveFeedback()

const { didYouKnow, featuredTabLoading } = useWikitaLiteHome()
</script>

<template>
  <WikitaLiteShell :title="null">
    <MobileSubpageHeader :title="MODULE_TITLES.didYouKnow" />
    <DidYouKnowModule
      standalone
      :items="didYouKnow"
      :loading="featuredTabLoading"
      :lists-version="listsVersion"
    />
  </WikitaLiteShell>
</template>

<style scoped>
:deep(.wikita-lite-shell[data-skin='mobile']) {
  padding-top: var(--spacing-100, 16px);
}
</style>
