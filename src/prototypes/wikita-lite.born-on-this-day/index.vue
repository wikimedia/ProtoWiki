<script setup lang="ts">
import { provideWikitaLiteSaveFeedback } from '../wikita-lite/composables/useWikitaLiteSaveFeedback'
import { useWikitaLiteHome } from '../wikita-lite/composables/useWikitaLiteHome'
import MobileSubpageHeader from '../wikita-lite/components/MobileSubpageHeader.vue'
import WikitaLiteShell from '../wikita-lite/components/WikitaLiteShell.vue'
import BornOnThisDayModule from '../wikita-lite/modules/BornOnThisDayModule.vue'
import { MODULE_TITLES } from '../wikita-lite/routes'

definePage({
  meta: {
    title: 'Wikita-lite — Born on this day',
    description: 'Born on this day entries in Wikita-lite.',
  },
})

const { listsVersion } = provideWikitaLiteSaveFeedback()

const { bornOnThisDay, featuredTabLoading } = useWikitaLiteHome()
</script>

<template>
  <WikitaLiteShell :title="null">
    <MobileSubpageHeader :title="MODULE_TITLES.bornOnThisDay" />
    <BornOnThisDayModule
      standalone
      :items="bornOnThisDay"
      :loading="featuredTabLoading"
      :lists-version="listsVersion"
    />
  </WikitaLiteShell>
</template>
