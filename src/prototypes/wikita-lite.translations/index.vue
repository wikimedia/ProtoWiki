<script setup lang="ts">
import { useWikitaLiteTranslationPage } from '../wikita-lite/composables/useWikitaLiteTranslationPage'
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

const {
  translationSuggestions,
  translationLoading,
  translationLoadingMore,
  translationError,
  retryTranslationFeed,
  loadSentinel,
} = useWikitaLiteTranslationPage()
</script>

<template>
  <WikitaLiteShell :title="null">
    <MobileSubpageHeader :title="MODULE_TITLES.translateArticles" />
    <TranslationModule
      standalone
      :items="translationSuggestions"
      :loading="translationLoading"
      :loading-more="translationLoadingMore"
      :error="translationError"
      @retry="retryTranslationFeed"
    />
    <div ref="loadSentinel" class="wikita-lite-translations__sentinel" aria-hidden="true" />
  </WikitaLiteShell>
</template>

<style scoped>
.wikita-lite-translations__sentinel {
  height: 1px;
  flex-shrink: 0;
}
</style>
