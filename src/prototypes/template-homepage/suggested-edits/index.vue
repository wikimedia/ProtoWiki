<script setup lang="ts">
import { computed } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconReload } from '@wikimedia/codex-icons'

import TaskFullscreenShell from '../TaskFullscreenShell.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import MobileWrapper from '@/components/MobileWrapper.vue'
import MobileSubpageHeader from '../MobileSubpageHeader.vue'
import SuggestedEditsView from '../SuggestedEditsView.vue'
import SuggestionFeedView from '../SuggestionFeedView.vue'
import { HOMEPAGE } from '../dashpage-fixtures'
import { useDashpageSettings } from '../useDashpageSettings'
import { useDashpageStructuredTasksModule } from '../useDashpageStructuredTasksModule'
import { useDashpageSuggestionModule } from '../useDashpageSuggestionModule'

import '../recent-changes-feed.css'
import '../suggestion-feed.css'

const { editSuggestionSource } = useDashpageSettings()
const { fullscreenProps: structuredFullscreenProps } = useDashpageStructuredTasksModule()
const {
  fullscreenProps,
  feedFullscreenProps,
  onSuggestionLoad,
  onSuggestionRefresh,
  onSuggestionNavigate,
} = useDashpageSuggestionModule()

const showStructuredTasks = computed(() => editSuggestionSource.value === 'structured-tasks')
const showSuggestionFeed = computed(() => editSuggestionSource.value === 'suggestion-feed')

const suggestionProps = computed(() => ({
  showFilterBar: false,
  ...fullscreenProps.value,
  currentIndex: fullscreenProps.value.currentIndex ?? 0,
  totalCount: fullscreenProps.value.queueLength ?? fullscreenProps.value.totalSuggestionCount ?? 1,
  taskHeading: fullscreenProps.value.taskHeading ?? fullscreenProps.value.taskTypeLabel,
  showSnippet: fullscreenProps.value.showSnippet,
}))

const carouselViewProps = computed(() =>
  showStructuredTasks.value ? structuredFullscreenProps.value : suggestionProps.value,
)

const showHeaderRefresh = computed(() => {
  if (showStructuredTasks.value) return false
  if (showSuggestionFeed.value) return feedFullscreenProps.value.showRefresh === true
  return suggestionProps.value.showRefresh === true
})

const headerRefreshDisabled = computed(() => {
  if (showSuggestionFeed.value) return feedFullscreenProps.value.refreshing === true
  return suggestionProps.value.refreshing === true
})

definePage({
  meta: {
    title: 'Dashpage — Suggested edits',
    description: 'Full-page mobile drill-down for the Suggested edits homepage module.',
  },
})
</script>

<template>
  <MobileWrapper>
    <TaskFullscreenShell skin="mobile">
    <div
      class="suggested-edits-layout"
      :class="{ 'suggested-edits-layout--feed': showSuggestionFeed }"
    >
      <div class="suggested-edits-layout__header">
        <MobileSubpageHeader
          title="Suggested edits"
          :back-to="HOMEPAGE"
          back-label="Back to homepage"
          :bleed="false"
        >
          <template v-if="showHeaderRefresh" #actions>
            <CdxButton
              weight="quiet"
              :icon-only="true"
              aria-label="Refresh suggestions"
              :disabled="headerRefreshDisabled"
              @click="onSuggestionRefresh"
            >
              <CdxIcon :icon="cdxIconReload" />
            </CdxButton>
          </template>
        </MobileSubpageHeader>
      </div>

      <SpecialPageWrapper
        :title="null"
        :skin="showSuggestionFeed ? 'mobile' : undefined"
        class="suggested-edits-page"
        :class="{ 'suggested-edits-page--feed': showSuggestionFeed }"
      >
        <SuggestionFeedView
          v-if="showSuggestionFeed"
          v-bind="feedFullscreenProps"
          @load="onSuggestionLoad"
          @refresh="onSuggestionRefresh"
        />
        <SuggestedEditsView
          v-else
          v-bind="carouselViewProps"
          @load="onSuggestionLoad"
          @refresh="onSuggestionRefresh"
          @navigate="onSuggestionNavigate"
        />
      </SpecialPageWrapper>
    </div>
    </TaskFullscreenShell>
  </MobileWrapper>
</template>

<style scoped>
.suggested-edits-layout {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  overflow: hidden;
}

.suggested-edits-layout__header {
  flex-shrink: 0;
  box-sizing: border-box;
  width: 100%;
  padding: env(safe-area-inset-top, 0px) 4px 0;
  background-color: var(--background-color-base, #fff);
  border-bottom: 1px solid var(--border-color-base, #a2a9b1);
}

.suggested-edits-layout__header :deep(.mobile-subpage-header) {
  margin: 0;
  padding: 0;
  border-bottom: none;
}

.suggested-edits-layout__header :deep(.mobile-subpage-header__title) {
  margin-block: 0;
  font-family: var(--font-family-system-sans, system-ui, sans-serif);
  border: none !important;
}

.suggested-edits-layout :deep(.suggested-edits-page) {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  overflow: hidden;
  max-width: none;
  margin: 0;
  padding: 0 var(--spacing-25, 4px);
  background-color: var(--background-color-neutral-subtle, #f8f9fa);
}

.suggested-edits-layout :deep(.suggested-edits-page--feed) {
  background-color: var(--background-color-neutral, #eaecf0);
}

.suggested-edits-layout :deep(.suggested-edits-page .special-page-wrapper__body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
</style>
