<script setup lang="ts">
import { computed, watch } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconReload } from '@wikimedia/codex-icons'

import DashpageChromeWrapper from '../DashpageChromeWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import { useConfig } from '@/composables/useConfig'
import { useRealUserImpact } from '@/composables/useRealUserImpact'
import { shouldShowDashpageLoadPrompt } from '@/lib/dashpageLoadState'
import ImpactModule from '../ImpactModule.vue'
import MobileSubpageHeader from '../MobileSubpageHeader.vue'
import { HOMEPAGE, IMPACT_DESKTOP } from '../dashpage-fixtures'

const { user, realUsername, realLang, setCurrentUserPageList } = useConfig()
const realImpact = useRealUserImpact(realUsername, realLang)

watch(
  [() => user.value, realImpact.editedPageTitles],
  ([activeUser, titles]) => {
    if (activeUser === 'real' && titles.length > 0) {
      setCurrentUserPageList('editedPages', [...titles])
    }
  },
  { immediate: true },
)

const impactProps = computed(() => {
  if (user.value === 'experienced') {
    return { ...IMPACT_DESKTOP }
  }
  if (user.value === 'real') {
    if (
      shouldShowDashpageLoadPrompt(
        realImpact.hasStarted.value,
        realImpact.hasRenderableData.value,
      )
    ) {
      return {
        loadPending: true,
        refreshing: realImpact.loading.value,
        refreshError: realImpact.error.value,
      }
    }
    return {
      ...realImpact.impactProps.value,
      showRefresh: true,
      refreshing: realImpact.loading.value,
      refreshError: realImpact.error.value,
    }
  }
  return { thanksReceived: 0 }
})

const showRealRefresh = computed(
  () =>
    user.value === 'real' &&
    realImpact.hasRenderableData.value &&
    !shouldShowDashpageLoadPrompt(
      realImpact.hasStarted.value,
      realImpact.hasRenderableData.value,
    ),
)

function onRefreshClick(): void {
  void realImpact.refresh()
}

definePage({
  meta: {
    title: 'Dashpage — Impact',
    description: 'Full-page mobile drill-down for the Your impact homepage module.',
  },
})
</script>

<template>
  <DashpageChromeWrapper :last-edited-notice="false">
    <SpecialPageWrapper :title="null" class="impact-page">
      <MobileSubpageHeader title="Your impact" :back-to="HOMEPAGE" back-label="Back to homepage">
        <template v-if="showRealRefresh" #actions>
          <CdxButton
            weight="quiet"
            :icon-only="true"
            aria-label="Refresh impact data"
            :disabled="realImpact.loading.value"
            @click="onRefreshClick"
          >
            <CdxIcon :icon="cdxIconReload" />
          </CdxButton>
        </template>
      </MobileSubpageHeader>
      <ImpactModule standalone v-bind="impactProps" @refresh="onRefreshClick" />
    </SpecialPageWrapper>
  </DashpageChromeWrapper>
</template>

<style scoped>
/* Match bleed inset — header negative margins cancel this top/inline padding. */
.impact-page :deep(.special-page-wrapper[data-skin='mobile']) {
  padding-top: var(--spacing-100, 16px);
}
</style>
