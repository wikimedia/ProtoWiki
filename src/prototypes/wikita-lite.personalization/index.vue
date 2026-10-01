<script setup lang="ts">
import MobileWrapper from '@/components/MobileWrapper.vue'
import { t } from '@/i18n'

import WikitaLiteFullscreenDialogShell from '../wikita-lite/components/WikitaLiteFullscreenDialogShell.vue'
import WikitaLitePersonalizationPanel from '../wikita-lite/components/WikitaLitePersonalizationPanel.vue'
import { useWikitaLiteRoute } from '../wikita-lite/composables/useWikitaLiteRoute'
import {
  initWikitaLiteUrlState,
  useWikitaLiteUrlState,
} from '../wikita-lite/composables/useWikitaLiteUrlState'
import { WIKITA_LITE_HOME } from '../wikita-lite/routes'

definePage({
  meta: {
    title: 'Wikita-lite — Personalization',
    description: 'Configure global interests and personalization sources for Wikita-lite.',
  },
})

initWikitaLiteUrlState()

const { replaceRoute } = useWikitaLiteRoute()
const { state } = useWikitaLiteUrlState()

function closePersonalization(): void {
  // Keep suggestion params from this page — router.back() would restore pre-personalization query.
  const returnPath = state.value.personalizationReturn || WIKITA_LITE_HOME
  void replaceRoute(returnPath, { personalizationReturn: null })
}
</script>

<template>
  <MobileWrapper fluid>
    <WikitaLiteFullscreenDialogShell
      :title="t('personalization.title')"
      :subtitle="t('personalization.subtitle')"
      @close="closePersonalization"
    >
      <WikitaLitePersonalizationPanel />
    </WikitaLiteFullscreenDialogShell>
  </MobileWrapper>
</template>
