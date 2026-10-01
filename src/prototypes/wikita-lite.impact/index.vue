<script setup lang="ts">
import { CdxButton, CdxIcon, CdxProgressBar } from '@wikimedia/codex'
import { cdxIconReload } from '@wikimedia/codex-icons'

import { t } from '@/i18n'

import ImpactModule from '../wikita-lite/modules/ImpactModule.vue'
import { useWikitaLiteImpact } from '../wikita-lite/composables/useWikitaLiteImpact'
import MobileSubpageHeader from '../wikita-lite/components/MobileSubpageHeader.vue'
import WikitaLiteShell from '../wikita-lite/components/WikitaLiteShell.vue'
import { MODULE_TITLES } from '../wikita-lite/routes'

definePage({
  meta: {
    title: 'Wikita-lite — Your impact',
    description: 'Full-page drill-down for contributor impact stats in Wikita-lite.',
  },
})

const {
  impactPageProps,
  showRealRefresh,
  impactLoading,
  impactHasContent,
  onImpactRefresh,
} = useWikitaLiteImpact()
</script>

<template>
  <WikitaLiteShell :title="null">
    <MobileSubpageHeader :title="MODULE_TITLES.impact">
      <template v-if="showRealRefresh" #actions>
        <CdxButton
          weight="quiet"
          :icon-only="true"
          :aria-label="t('impact.refresh')"
          @click="onImpactRefresh"
        >
          <CdxIcon :icon="cdxIconReload" />
        </CdxButton>
      </template>
    </MobileSubpageHeader>
    <div
      v-if="impactLoading && !impactHasContent"
      class="wikita-lite-impact-page__loading"
    >
      <CdxProgressBar inline :aria-label="t('impact.loadingYourImpact')" />
    </div>
    <ImpactModule v-if="impactHasContent" standalone v-bind="impactPageProps" />
  </WikitaLiteShell>
</template>

<style scoped>
.wikita-lite-impact-page__loading {
  padding-block: var(--spacing-50, 8px);
}
</style>
