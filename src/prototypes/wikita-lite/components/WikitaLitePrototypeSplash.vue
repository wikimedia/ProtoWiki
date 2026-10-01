<script setup lang="ts">
import { t } from '@/i18n'

import { useWikitaLitePrototypeSplash } from '../composables/useWikitaLitePrototypeSplash'
import WikitaLiteFullscreenDialogShell from './WikitaLiteFullscreenDialogShell.vue'

const { dismissSplash } = useWikitaLitePrototypeSplash()
</script>

<template>
  <WikitaLiteFullscreenDialogShell
    :title="t('components.splashTitle')"
    :primary-action="{ label: t('components.splashBegin'), actionType: 'progressive' }"
    @primary="dismissSplash"
    @close="dismissSplash"
  >
    <p>{{ t('components.splashIntro') }}</p>
    <p>{{ t('components.splashHowTo') }}</p>
    <ol>
      <li>{{ t('components.splashStep1') }}</li>
      <li>{{ t('components.splashStep2') }}</li>
      <li>{{ t('components.splashStep3') }}</li>
    </ol>
    <p>{{ t('components.splashThanks') }}</p>
  </WikitaLiteFullscreenDialogShell>
</template>
