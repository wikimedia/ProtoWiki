<script setup lang="ts">
import { provideWikitaLiteSaveFeedback } from '../wikita-lite/composables/useWikitaLiteSaveFeedback'
import { useWikitaLiteFurtherReadingPage } from '../wikita-lite/composables/useWikitaLiteFurtherReadingPage'
import WikitaLiteConfigureButton from '../wikita-lite/components/WikitaLiteConfigureButton.vue'
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

const { listsVersion } = provideWikitaLiteSaveFeedback()

const { relatedItems, relatedLoading, relatedLoadingMore, loadSentinel } =
  useWikitaLiteFurtherReadingPage()
</script>

<template>
  <WikitaLiteShell :title="null">
    <MobileSubpageHeader :title="MODULE_TITLES.furtherReading">
      <template #actions>
        <WikitaLiteConfigureButton />
      </template>
    </MobileSubpageHeader>
    <RelatedModule
      standalone
      :items="relatedItems"
      :loading="relatedLoading"
      :loading-more="relatedLoadingMore"
      :lists-version="listsVersion"
    />
    <div ref="loadSentinel" class="wikita-lite-further-reading__sentinel" aria-hidden="true" />
  </WikitaLiteShell>
</template>

<style scoped>
.wikita-lite-further-reading__sentinel {
  height: 1px;
  flex-shrink: 0;
}
</style>
