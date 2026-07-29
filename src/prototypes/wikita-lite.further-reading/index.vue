<script setup lang="ts">
import { provideWikitaSaveFeedback } from '../musical-group/composables/useWikitaSaveFeedback'
import { useWikitaLiteHome } from '../wikita-lite/composables/useWikitaLiteHome'
import MobileSubpageHeader from '../wikita-lite/components/MobileSubpageHeader.vue'
import WikitaLiteShell from '../wikita-lite/components/WikitaLiteShell.vue'
import RelatedModule from '../wikita-lite/modules/RelatedModule.vue'
import { MODULE_TITLES } from '../wikita-lite/routes'

definePage({
  meta: {
    title: 'Wikita-lite — Further reading',
    description: 'Further reading suggestions in Wikita-lite.',
  },
})

const { listsVersion } = provideWikitaSaveFeedback()

const { homeRelatedItems, homeRelatedLoading } = useWikitaLiteHome()
</script>

<template>
  <WikitaLiteShell :title="null">
    <MobileSubpageHeader :title="MODULE_TITLES.furtherReading" />
    <RelatedModule
      standalone
      :items="homeRelatedItems"
      :loading="homeRelatedLoading"
      :lists-version="listsVersion"
    />
  </WikitaLiteShell>
</template>

<style scoped>
:deep(.wikita-lite-shell[data-skin='mobile']) {
  padding-top: var(--spacing-100, 16px);
}
</style>
