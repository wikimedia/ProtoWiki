<script setup lang="ts">
import { computed } from 'vue'

import ChromeWrapper from '@/components/ChromeWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import { useConfig } from '@/composables/useConfig'
import ImpactModule from '../ImpactModule.vue'
import MobileSubpageHeader from '../MobileSubpageHeader.vue'
import { HOMEPAGE, IMPACT_DESKTOP } from '../dashpage-fixtures'

const { user } = useConfig()

const impactProps = computed(() =>
  user.value === 'experienced' ? IMPACT_DESKTOP : { thanksReceived: 0 },
)

definePage({
  meta: {
    title: 'Dashpage — Impact',
    description: 'Full-page mobile drill-down for the Your impact homepage module.',
  },
})
</script>

<template>
  <ChromeWrapper :last-edited-notice="false">
    <SpecialPageWrapper :title="null" class="impact-page">
      <MobileSubpageHeader title="Your impact" :back-to="HOMEPAGE" back-label="Back to dashpage" />
      <ImpactModule standalone v-bind="impactProps" />
    </SpecialPageWrapper>
  </ChromeWrapper>
</template>

<style scoped>
/* Match bleed inset — header negative margins cancel this top/inline padding. */
.impact-page :deep(.special-page-wrapper[data-skin='mobile']) {
  padding-top: var(--spacing-100, 16px);
}
</style>
