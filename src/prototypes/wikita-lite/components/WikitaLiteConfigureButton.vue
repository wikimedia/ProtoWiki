<script setup lang="ts">
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconConfigure } from '@wikimedia/codex-icons'

import { t } from '@/i18n'

import { useWikitaLiteRoute } from '../composables/useWikitaLiteRoute'
import type { WikitaLiteUrlStatePatch } from '../data/urlStateSchema'
import {
  CONFIGURE_HOME_PAGE,
  isPersonalizationReturnPath,
  PERSONALIZATION_PAGE,
} from '../routes'

interface Props {
  label?: string
  to?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: () => t('components.homeLayout'),
  to: CONFIGURE_HOME_PAGE,
})

const { pushRoute, route } = useWikitaLiteRoute()

function openConfigure() {
  let patch: WikitaLiteUrlStatePatch | undefined
  if (props.to === PERSONALIZATION_PAGE && isPersonalizationReturnPath(route.path)) {
    patch = { personalizationReturn: route.path }
  }
  void pushRoute(props.to, patch)
}
</script>

<template>
  <CdxButton
    class="wikita-lite-configure-button"
    weight="quiet"
    :icon-only="true"
    :aria-label="label"
    @click="openConfigure"
  >
    <CdxIcon :icon="cdxIconConfigure" />
  </CdxButton>
</template>

<style scoped>
.wikita-lite-configure-button {
  flex-shrink: 0;
}
</style>
