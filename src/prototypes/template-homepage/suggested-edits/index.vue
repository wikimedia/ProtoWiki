<script setup lang="ts">
import { computed } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconReload } from '@wikimedia/codex-icons'

import TaskFullscreenShell from '../TaskFullscreenShell.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import MobileSubpageHeader from '../MobileSubpageHeader.vue'
import SuggestedEditsView from '../SuggestedEditsView.vue'
import { HOMEPAGE, STRUCTURED_TASKS_FULL } from '../dashpage-fixtures'
import { useDashpageSettings } from '../useDashpageSettings'
import { useDashpageSuggestionModule } from '../useDashpageSuggestionModule'

const { editSuggestionSource } = useDashpageSettings()
const { fullscreenProps, onSuggestionLoad, onSuggestionRefresh, onSuggestionNavigate } =
  useDashpageSuggestionModule()

const showStructuredTasks = computed(() => editSuggestionSource.value === 'structured-tasks')

const structuredProps = computed(() => ({
  showFilterBar: true,
  topicFilter: STRUCTURED_TASKS_FULL.topicFilter,
  difficultyFilter: STRUCTURED_TASKS_FULL.difficultyFilter,
  currentIndex: STRUCTURED_TASKS_FULL.currentIndex - 1,
  totalCount: STRUCTURED_TASKS_FULL.totalCount,
  articleTitle: STRUCTURED_TASKS_FULL.articleTitle,
  articleShortDescription: STRUCTURED_TASKS_FULL.articleDescription,
  thumbnailSrc: STRUCTURED_TASKS_FULL.thumbnailSrc,
  pageviewsLabel: STRUCTURED_TASKS_FULL.pageviewsLabel,
  taskHeading: STRUCTURED_TASKS_FULL.taskHeading,
  taskDifficulty: STRUCTURED_TASKS_FULL.taskDifficulty,
  taskTimeEstimate: STRUCTURED_TASKS_FULL.taskTimeEstimate,
  taskDescription: STRUCTURED_TASKS_FULL.taskDescription,
  showSnippet: false,
  editHref: STRUCTURED_TASKS_FULL.editHref,
  canGoPrev: false,
  canGoNext: false,
}))

const suggestionProps = computed(() => ({
  showFilterBar: false,
  ...fullscreenProps.value,
  currentIndex: fullscreenProps.value.currentIndex ?? 0,
  totalCount: fullscreenProps.value.queueLength ?? fullscreenProps.value.totalSuggestionCount ?? 1,
  taskHeading: fullscreenProps.value.taskHeading ?? fullscreenProps.value.taskTypeLabel,
  showSnippet: fullscreenProps.value.showSnippet,
}))

const viewProps = computed(() =>
  showStructuredTasks.value ? structuredProps.value : suggestionProps.value,
)

const showHeaderRefresh = computed(
  () => !showStructuredTasks.value && viewProps.value.showRefresh && !viewProps.value.loadPending,
)

definePage({
  meta: {
    title: 'Dashpage — Suggested edits',
    description: 'Full-page mobile drill-down for the Suggested edits homepage module.',
  },
})
</script>

<template>
  <TaskFullscreenShell skin="mobile">
    <div class="suggested-edits-layout">
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
              :disabled="viewProps.refreshing"
              @click="onSuggestionRefresh"
            >
              <CdxIcon :icon="cdxIconReload" />
            </CdxButton>
          </template>
        </MobileSubpageHeader>
      </div>

      <SpecialPageWrapper :title="null" class="suggested-edits-page">
        <SuggestedEditsView
          v-bind="viewProps"
          @load="onSuggestionLoad"
          @refresh="onSuggestionRefresh"
          @navigate="onSuggestionNavigate"
        />
      </SpecialPageWrapper>
    </div>
  </TaskFullscreenShell>
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
  padding: 0 4px;
  /* padding: var(--spacing-100, 16px) var(--spacing-100, 16px) var(--spacing-50, 8px); */
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

.suggested-edits-page {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  overflow: hidden;
  background-color: var(--background-color-neutral-subtle, #f8f9fa);
}

.suggested-edits-page :deep(.special-page-wrapper) {
  display: flex;
  flex: 1;
  flex-direction: column;
  max-width: none;
  margin: 0;
  background-color: transparent;
}

.suggested-edits-page :deep(.special-page-wrapper[data-skin='mobile']) {
  padding: 0 var(--spacing-100, 16px);
}

.suggested-edits-page :deep(.special-page-wrapper__body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}
</style>
