<script setup lang="ts">
import MobileWrapper from '@/components/MobileWrapper.vue'
import { t } from '@/i18n'

import WikitaLiteFullscreenDialogShell from '../wikita-lite/components/WikitaLiteFullscreenDialogShell.vue'
import WikitaLiteHomeLayoutConfigureList from '../wikita-lite/components/WikitaLiteHomeLayoutConfigureList.vue'
import { useWikitaLiteHomeLayout } from '../wikita-lite/composables/useWikitaLiteHomeLayout'
import { useWikitaLiteRoute } from '../wikita-lite/composables/useWikitaLiteRoute'
import { initWikitaLiteUrlState } from '../wikita-lite/composables/useWikitaLiteUrlState'
import type { ConfigurableHomeModuleId } from '../wikita-lite/data/homeLayout'
import { WIKITA_LITE_HOME } from '../wikita-lite/routes'

definePage({
  meta: {
    title: 'Wikita-lite — Home layout',
    description: 'Configure which modules appear on the Wikita-lite Home feed.',
  },
})

initWikitaLiteUrlState()

const { replaceRoute } = useWikitaLiteRoute()
const { configureOrder, isModuleEnabledInConfigure, setModuleEnabled, setConfigureOrder } =
  useWikitaLiteHomeLayout()

function closeConfigure(): void {
  // Keep layout params from this page — router.back() would restore pre-configure query.
  void replaceRoute(WIKITA_LITE_HOME)
}

async function onToggleEnabled(id: ConfigurableHomeModuleId, enabled: boolean): Promise<void> {
  await setModuleEnabled(id, enabled)
}

async function onReorder(order: ConfigurableHomeModuleId[]): Promise<void> {
  await setConfigureOrder(order)
}
</script>

<template>
  <MobileWrapper fluid>
    <WikitaLiteFullscreenDialogShell
      :title="t('pages.homeLayoutTitle')"
      :subtitle="t('pages.homeLayoutSubtitle')"
      @close="closeConfigure"
    >
      <div class="wikita-lite-configure-home-layout">
        <WikitaLiteHomeLayoutConfigureList
          :order="configureOrder"
          :is-enabled="isModuleEnabledInConfigure"
          @update:enabled="onToggleEnabled"
          @reorder="onReorder"
        />
      </div>
    </WikitaLiteFullscreenDialogShell>
  </MobileWrapper>
</template>

<style scoped>
.wikita-lite-configure-home-layout {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
  padding-bottom: var(--spacing-150, 24px);
}
</style>
