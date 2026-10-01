<script setup lang="ts">
import { computed, watch } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconReload } from '@wikimedia/codex-icons'

import { t } from '@/i18n'

import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import { useConfig } from '@/composables/useConfig'
import { useRealUserImpact } from './data/useRealUserImpact'
import ImpactModule from '../ImpactModule.vue'
import MobileSubpageHeader from '../MobileSubpageHeader.vue'
import { HOMEPAGE, IMPACT_DESKTOP } from '../dashpage-fixtures'

const { user, realUsername, realLang, setCurrentUserPageList } = useConfig()
const realImpact = useRealUserImpact(realUsername, realLang)

function shouldShowLoadPrompt(hasStarted: boolean, hasRenderableData: boolean): boolean {
  return !hasStarted && !hasRenderableData
}

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
    if (shouldShowLoadPrompt(realImpact.hasStarted.value, realImpact.hasRenderableData.value)) {
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
    !shouldShowLoadPrompt(realImpact.hasStarted.value, realImpact.hasRenderableData.value),
)

function onRefreshClick(): void {
  void realImpact.refresh()
}

definePage({
  meta: {
    title: 'Template: Homepage — Impact',
    description: 'Full-page mobile drill-down for the Your impact homepage module.',
  },
})
</script>

<template>
  <ChromeWrapper :last-edited-notice="false">
    <SpecialPageWrapper :title="null" class="impact-page">
      <MobileSubpageHeader
        :title="t('impact.yourImpact')"
        :back-to="HOMEPAGE"
        :back-label="t('impact.backToHomepage')"
      >
        <template v-if="showRealRefresh" #actions>
          <CdxButton
            weight="quiet"
            :icon-only="true"
            :aria-label="t('impact.refresh')"
            :disabled="realImpact.loading.value"
            @click="onRefreshClick"
          >
            <CdxIcon :icon="cdxIconReload" />
          </CdxButton>
        </template>
      </MobileSubpageHeader>
      <ImpactModule standalone v-bind="impactProps" @refresh="onRefreshClick" />
    </SpecialPageWrapper>
  </ChromeWrapper>
</template>

<style scoped>
/* Match bleed inset — header negative margins cancel this top/inline padding. */
.impact-page :deep(.special-page-wrapper[data-skin='mobile']) {
  padding-top: var(--spacing-100, 16px);
}
</style>
