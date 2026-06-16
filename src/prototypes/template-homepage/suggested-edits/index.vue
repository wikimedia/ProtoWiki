<script setup lang="ts">
import { computed, ref } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconReload } from '@wikimedia/codex-icons'

import InterestsSettingsPage from '../InterestsSettingsPage.vue'
import TaskFullscreenShell from '../TaskFullscreenShell.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import MobileWrapper from '@/components/MobileWrapper.vue'
import MobileSubpageHeader from '../MobileSubpageHeader.vue'
import SuggestedEditsView from '../SuggestedEditsView.vue'
import { useConfig } from '@/composables/useConfig'
import { wikiEditUrlFromLang } from '@/config'
import { useSuggestedEdits } from './data/useSuggestedEdits'
import { HOMEPAGE } from '../dashpage-fixtures'

const showInterests = ref(false)
const { lang } = useConfig()

const {
  currentIndex,
  totalCount,
  topicFilter,
  currentSuggestion,
  loadPending,
  showRefresh,
  loading,
  error,
  emptyMessage,
  onLoad,
  onRefresh,
  onNavigate,
} = useSuggestedEdits()

const viewProps = computed(() => {
  const suggestion = currentSuggestion.value

  return {
    showFilterBar: true,
    topicFilter: topicFilter.value,
    difficultyFilter: 'Easy, Medium',
    currentIndex: currentIndex.value,
    totalCount: totalCount.value || 1,
    articleTitle: suggestion?.articleTitle,
    articleShortDescription: suggestion?.articleShortDescription,
    thumbnailSrc: suggestion?.thumbnailSrc,
    pageviewsLabel: suggestion?.pageviewsLabel,
    taskHeading: suggestion?.taskHeading,
    taskDifficulty: suggestion?.taskDifficulty,
    taskTimeEstimate: suggestion?.taskTimeEstimate,
    taskDescriptionParts: suggestion?.taskDescriptionParts,
    showSnippet: false,
    editHref: suggestion?.articleTitle
      ? wikiEditUrlFromLang(lang.value, suggestion.articleTitle)
      : undefined,
    loadPending: loadPending.value,
    showRefresh: showRefresh.value,
    refreshing: loading.value,
    refreshError: error.value,
    emptyMessage: emptyMessage.value,
    canGoPrev: currentIndex.value > 0,
    canGoNext: currentIndex.value < totalCount.value - 1,
  }
})

function onOpenInterests(): void {
  showInterests.value = true
}

function onCloseInterests(): void {
  showInterests.value = false
}

function onRefreshClick(): void {
  if (loadPending.value) {
    onLoad()
  } else {
    onRefresh()
  }
}

definePage({
  meta: {
    title: 'Template: Homepage — Suggested edits',
    description: 'Full-page mobile drill-down for the Suggested edits homepage module.',
  },
})
</script>

<template>
  <MobileWrapper>
    <TaskFullscreenShell skin="mobile">
      <div class="suggested-edits-layout">
        <div class="suggested-edits-layout__header">
          <MobileSubpageHeader
            title="Suggested edits"
            :back-to="HOMEPAGE"
            back-label="Back to homepage"
            :bleed="false"
          >
            <template #actions>
              <CdxButton
                weight="quiet"
                :icon-only="true"
                aria-label="Refresh suggestions"
                :disabled="loading"
                @click="onRefreshClick"
              >
                <CdxIcon :icon="cdxIconReload" />
              </CdxButton>
            </template>
          </MobileSubpageHeader>
        </div>

        <SpecialPageWrapper :title="null" class="suggested-edits-page">
          <SuggestedEditsView
            v-bind="viewProps"
            @load="onLoad"
            @refresh="onRefresh"
            @navigate="onNavigate"
            @open-interests="onOpenInterests"
          />
        </SpecialPageWrapper>

        <InterestsSettingsPage v-if="showInterests" @close="onCloseInterests" />
      </div>
    </TaskFullscreenShell>
  </MobileWrapper>
</template>

<style scoped>
.suggested-edits-layout {
  position: relative;
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
  padding: 0;
  background-color: var(--background-color-neutral-subtle, #f8f9fa);
}

.suggested-edits-layout :deep(.suggested-edits-page .special-page-wrapper__body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
</style>
