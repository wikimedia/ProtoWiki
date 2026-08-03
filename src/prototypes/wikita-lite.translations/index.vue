<script setup lang="ts">
import { useConfig } from '@/composables/useConfig'

import { useWikitaLiteHome } from '../wikita-lite/composables/useWikitaLiteHome'
import MobileSubpageHeader from '../wikita-lite/components/MobileSubpageHeader.vue'
import WikitaLiteShell from '../wikita-lite/components/WikitaLiteShell.vue'
import TranslationModule from '../wikita-lite/modules/TranslationModule.vue'
import { MODULE_TITLES } from '../wikita-lite/routes'

definePage({
  meta: {
    title: 'Wikita-lite — Translate articles',
    description: 'Translation suggestions in Wikita-lite.',
  },
})

const { knownLanguages } = useConfig()

const {
  translationSuggestions,
  translationLoading,
  translationError,
  retryTranslationFeed,
} = useWikitaLiteHome({
  translationLanguages: () => knownLanguages.value,
  translationCountPerLanguage: 6,
})
</script>

<template>
  <WikitaLiteShell :title="null">
    <MobileSubpageHeader :title="MODULE_TITLES.translateArticles" />
    <TranslationModule
      standalone
      :items="translationSuggestions"
      :loading="translationLoading"
      :error="translationError"
      @retry="retryTranslationFeed"
    />
  </WikitaLiteShell>
</template>

<style scoped>
:deep(.wikita-lite-shell[data-skin='mobile']) {
  padding-top: var(--spacing-100, 16px);
}
</style>
