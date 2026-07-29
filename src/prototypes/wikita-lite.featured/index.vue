<script setup lang="ts">
import { provideWikitaSaveFeedback } from '../musical-group/composables/useWikitaSaveFeedback'
import { useWikitaLiteHome } from '../wikita-lite/composables/useWikitaLiteHome'
import MobileSubpageHeader from '../wikita-lite/components/MobileSubpageHeader.vue'
import WikitaLiteModule from '../wikita-lite/components/WikitaLiteModule.vue'
import WikitaLiteShell from '../wikita-lite/components/WikitaLiteShell.vue'
import BornOnThisDayModule from '../wikita-lite/modules/BornOnThisDayModule.vue'
import DidYouKnowModule from '../wikita-lite/modules/DidYouKnowModule.vue'
import FeaturedModule from '../wikita-lite/modules/FeaturedModule.vue'
import {
  BORN_ON_THIS_DAY_PAGE,
  DID_YOU_KNOW_PAGE,
  MODULE_TITLES,
} from '../wikita-lite/routes'

definePage({
  meta: {
    title: 'Wikita-lite — Featured',
    description: 'Featured articles and daily hooks in Wikita-lite.',
  },
})

const FEATURED_PREVIEW_LIMIT = 3

const { listsVersion } = provideWikitaSaveFeedback()

const {
  featuredArticle,
  didYouKnow,
  bornOnThisDay,
  featuredTabLoading,
  featuredTabError,
  retryFeaturedFeed,
} = useWikitaLiteHome()
</script>

<template>
  <WikitaLiteShell :title="null">
    <MobileSubpageHeader :title="MODULE_TITLES.featured" />
    <div class="wikita-lite-featured-page">
      <FeaturedModule
        standalone
        :featured-article="featuredArticle"
        :loading="featuredTabLoading"
        :error="featuredTabError"
        :lists-version="listsVersion"
        @retry="retryFeaturedFeed"
      />

      <template v-if="!featuredTabLoading && !featuredTabError">
        <WikitaLiteModule
          v-if="didYouKnow.length"
          :title="MODULE_TITLES.didYouKnow"
          :to="DID_YOU_KNOW_PAGE"
        >
          <DidYouKnowModule
            :items="didYouKnow"
            :preview-limit="FEATURED_PREVIEW_LIMIT"
            :lists-version="listsVersion"
          />
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="bornOnThisDay.length"
          :title="MODULE_TITLES.bornOnThisDay"
          :to="BORN_ON_THIS_DAY_PAGE"
        >
          <BornOnThisDayModule
            :items="bornOnThisDay"
            :preview-limit="FEATURED_PREVIEW_LIMIT"
            :lists-version="listsVersion"
          />
        </WikitaLiteModule>
      </template>
    </div>
  </WikitaLiteShell>
</template>

<style scoped>
:deep(.wikita-lite-shell[data-skin='mobile']) {
  padding-top: var(--spacing-100, 16px);
}

.wikita-lite-featured-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
  width: 100%;
  min-width: 0;
}
</style>
