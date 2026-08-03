<script setup lang="ts">
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconReload } from '@wikimedia/codex-icons'

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

const { impactPageProps, showRealRefresh, onImpactRefresh } = useWikitaLiteImpact()
</script>

<template>
  <WikitaLiteShell :title="null">
    <MobileSubpageHeader :title="MODULE_TITLES.impact">
      <template v-if="showRealRefresh" #actions>
        <CdxButton
          weight="quiet"
          :icon-only="true"
          aria-label="Refresh impact data"
          @click="onImpactRefresh"
        >
          <CdxIcon :icon="cdxIconReload" />
        </CdxButton>
      </template>
    </MobileSubpageHeader>
    <ImpactModule standalone v-bind="impactPageProps" @refresh="onImpactRefresh" />
  </WikitaLiteShell>
</template>

<style scoped>
:deep(.wikita-lite-shell[data-skin='mobile']) {
  padding-top: var(--spacing-100, 16px);
}
</style>
