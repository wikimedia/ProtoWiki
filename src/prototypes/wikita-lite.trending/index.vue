<script setup lang="ts">
import { provideWikitaLiteSaveFeedback } from '../wikita-lite/composables/useWikitaLiteSaveFeedback'
import { useWikitaLiteHome } from '../wikita-lite/composables/useWikitaLiteHome'
import MobileSubpageHeader from '../wikita-lite/components/MobileSubpageHeader.vue'
import WikitaLiteShell from '../wikita-lite/components/WikitaLiteShell.vue'
import TrendingModule from '../wikita-lite/modules/TrendingModule.vue'
import { MODULE_TITLES } from '../wikita-lite/routes'

definePage({
  meta: {
    title: 'Wikita-lite — Trending',
    description: 'Trending articles in Wikita-lite.',
  },
})

const { listsVersion } = provideWikitaLiteSaveFeedback()

const { trendingItems, trendingLoading, trendingTabError, retryTrendingFeed } = useWikitaLiteHome()
</script>

<template>
  <WikitaLiteShell :title="null">
    <MobileSubpageHeader :title="MODULE_TITLES.trending" />
    <TrendingModule
      standalone
      :items="trendingItems"
      :loading="trendingLoading"
      :error="trendingTabError"
      :lists-version="listsVersion"
      @retry="retryTrendingFeed"
    />
  </WikitaLiteShell>
</template>

<style scoped>
:deep(.wikita-lite-shell[data-skin='mobile']) {
  padding-top: var(--spacing-100, 16px);
}
</style>
