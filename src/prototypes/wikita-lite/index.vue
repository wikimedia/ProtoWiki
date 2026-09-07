<script setup lang="ts">
import { useConfig } from '@/composables/useConfig'
import { provideWikitaLiteSaveFeedback } from '../wikita-lite/composables/useWikitaLiteSaveFeedback'
import WikitaLiteConfigureButton from './components/WikitaLiteConfigureButton.vue'
import WikitaLiteShell from './components/WikitaLiteShell.vue'
import WikitaLiteHome from './WikitaLiteHome.vue'

definePage({
  meta: {
    title: 'Wikita-lite',
    description: 'Toned down Wikita dashpage.',
  },
})

const { pageTitle } = useConfig()
provideWikitaLiteSaveFeedback()
</script>

<template>
  <WikitaLiteShell :title="pageTitle" actions>
    <template #actions>
      <WikitaLiteConfigureButton />
    </template>
    <WikitaLiteHome />
  </WikitaLiteShell>
</template>
