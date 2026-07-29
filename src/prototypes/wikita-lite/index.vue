<script setup lang="ts">
import { useConfig } from '@/composables/useConfig'
import { provideWikitaSaveFeedback } from '../musical-group/composables/useWikitaSaveFeedback'
import WikitaLiteShell from './components/WikitaLiteShell.vue'
import WikitaLiteHome from './WikitaLiteHome.vue'

definePage({
  meta: {
    title: 'Wikita-lite',
    description: 'Toned down Wikita dashpage.',
  },
})

const { pageTitle } = useConfig()
provideWikitaSaveFeedback()
</script>

<template>
  <WikitaLiteShell :title="pageTitle">
    <WikitaLiteHome />
  </WikitaLiteShell>
</template>
