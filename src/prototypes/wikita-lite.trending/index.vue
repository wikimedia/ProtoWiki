<script setup lang="ts">
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import MobileWrapper from '@/components/MobileWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import { provideWikitaSaveFeedback } from '../musical-group/composables/useWikitaSaveFeedback'
import { useMusicalGroupHome } from '../musical-group/useMusicalGroupHome'
import MobileSubpageHeader from '../wikita-lite/components/MobileSubpageHeader.vue'
import TrendingModule from '../wikita-lite/modules/TrendingModule.vue'
import { MODULE_TITLES, WIKITA_LITE_HOME } from '../wikita-lite/routes'
import '../wikita-lite/wikita-lite-shell.css'

definePage({
  meta: {
    title: 'Wikita-lite — Trending',
    description: 'Trending articles in Wikita-lite.',
  },
})

const { listsVersion } = provideWikitaSaveFeedback()

const { trendingItems, trendingLoading, trendingTabError, retryTrendingFeed } = useMusicalGroupHome()
</script>

<template>
  <MobileWrapper>
    <ChromeWrapper skin="mobile" :last-edited-notice="false">
      <SpecialPageWrapper :title="null" class="wikita-lite-shell">
        <MobileSubpageHeader
          :title="MODULE_TITLES.trending"
          :back-to="WIKITA_LITE_HOME"
          back-label="Back to Wikita-lite"
        />
        <TrendingModule
          standalone
          :items="trendingItems"
          :loading="trendingLoading"
          :error="trendingTabError"
          :lists-version="listsVersion"
          @retry="retryTrendingFeed"
        />
      </SpecialPageWrapper>
    </ChromeWrapper>
  </MobileWrapper>
</template>

<style scoped>
:deep(.wikita-lite-shell[data-skin='mobile']) {
  padding-top: var(--spacing-100, 16px);
}
</style>
