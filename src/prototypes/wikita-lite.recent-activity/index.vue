<script setup lang="ts">
import { t } from '@/i18n'

import { provideWikitaLiteSaveFeedback } from '../wikita-lite/composables/useWikitaLiteSaveFeedback'
import { useWikitaLiteRecentActivityPage } from '../wikita-lite/composables/useWikitaLiteRecentActivityPage'
import WikitaLiteConfigureButton from '../wikita-lite/components/WikitaLiteConfigureButton.vue'
import MobileSubpageHeader from '../wikita-lite/components/MobileSubpageHeader.vue'
import WikitaLiteShell from '../wikita-lite/components/WikitaLiteShell.vue'
import RecentActivityModule from '../wikita-lite/modules/RecentActivityModule.vue'
import { MODULE_TITLES, PERSONALIZATION_PAGE } from '../wikita-lite/routes'

definePage({
  meta: {
    title: 'Wikita-lite — Review changes',
    description: 'Recent edits on pages from your Personalization settings in Wikita-lite.',
  },
})

provideWikitaLiteSaveFeedback()

const {
  mode,
  savedItems,
  savedItemsLoading,
  recentChanges,
  recentChangesLoading,
  recentChangesLoadingMore,
  loadSentinel,
} = useWikitaLiteRecentActivityPage()
</script>

<template>
  <WikitaLiteShell :title="null">
    <MobileSubpageHeader :title="MODULE_TITLES.reviewChanges">
      <template #actions>
        <WikitaLiteConfigureButton
          :to="PERSONALIZATION_PAGE"
          :label="t('personalization.openButton')"
        />
      </template>
    </MobileSubpageHeader>
    <RecentActivityModule
      v-if="mode === 'personalized'"
      standalone
      :saved-items="savedItems"
      :saved-items-loading="savedItemsLoading"
    />
    <template v-else>
      <RecentActivityModule
        standalone
        :items="recentChanges"
        :loading="recentChangesLoading"
        :loading-more="recentChangesLoadingMore"
      />
      <div
        ref="loadSentinel"
        class="wikita-lite-recent-activity__sentinel"
        aria-hidden="true"
      />
    </template>
  </WikitaLiteShell>
</template>

<style scoped>
.wikita-lite-recent-activity__sentinel {
  height: 1px;
  flex-shrink: 0;
}
</style>
