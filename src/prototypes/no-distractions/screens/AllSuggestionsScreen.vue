<script setup lang="ts">
import { nextTick } from 'vue'
import { CdxIcon, CdxMessage, CdxProgressBar } from '@wikimedia/codex'
import { cdxIconConfigure, cdxIconHelp, cdxIconHome } from '@wikimedia/codex-icons'

import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'

import SuggestionCard from '../components/SuggestionCard.vue'
import { useSuggestions } from '../data/useSuggestions'
import type { FlowState } from '../data/useFlowState'

const props = defineProps<{ flow: FlowState }>()

const { suggestions, loading, error } = useSuggestions()

async function goHome() {
  await props.flow.goTo('home')
  await nextTick()
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
}

function goToInterests() {
  void props.flow.goTo('interests', { returnTo: 'all' })
}
</script>

<template>
  <ChromeWrapper skin="mobile" :last-edited-notice="false" :show-footer="false">
    <div class="all">
      <header class="all__head">
        <h1 class="all__title">Suggested edits</h1>
        <button
          class="all__icon-btn"
          type="button"
          aria-label="Configure interests"
          @click="goToInterests"
        >
          <CdxIcon :icon="cdxIconConfigure" />
        </button>
      </header>

      <CdxProgressBar v-if="loading && !suggestions.length" inline aria-label="Loading suggestions" />

      <CdxMessage v-else-if="error" type="error" :allow-user-dismiss="false">
        {{ error }}
      </CdxMessage>

      <p v-else-if="!suggestions.length" class="all__empty">
        No suggestions yet — add an interest to get started.
      </p>

      <div v-else class="all__list">
        <SuggestionCard
          v-for="suggestion in suggestions"
          :key="suggestion.title"
          :task-heading="suggestion.taskHeading"
          :task-color="suggestion.taskColor"
          :article-title="suggestion.title"
          :article-description="suggestion.description"
          :task-description="suggestion.taskDescription"
          :thumbnail-src="suggestion.thumbnailSrc"
        />
      </div>

      <div class="all__fab">
        <button class="all__fab-btn" type="button" aria-label="Home" @click="goHome">
          <CdxIcon :icon="cdxIconHome" />
        </button>
        <button class="all__fab-btn" type="button" aria-label="Help">
          <CdxIcon :icon="cdxIconHelp" />
        </button>
      </div>
    </div>
  </ChromeWrapper>
</template>

<style scoped>
.all {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
  padding: var(--spacing-100, 16px);
  padding-bottom: calc(var(--spacing-100, 16px) + 3.75rem);
}

.all__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 2rem;
}

.all__title {
  margin: 0;
  font-family:
    var(--font-family-system-sans, system-ui, sans-serif), var(--font-family-base, sans-serif);
  font-size: var(--font-size-large, 1.125rem);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large, 1.56);
  color: var(--color-base);
}

.all__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: var(--spacing-25, 4px);
  border: none;
  border-radius: var(--border-radius-base, 2px);
  background: transparent;
  color: var(--color-base);
  cursor: pointer;
}

.all__icon-btn :deep(.cdx-icon) {
  width: 1.25rem;
  height: 1.25rem;
}

.all__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
}

.all__empty {
  margin: 0;
  color: var(--color-subtle);
}

.all__fab {
  position: fixed;
  right: var(--spacing-50, 8px);
  bottom: 12px;
  z-index: 10;
  display: inline-flex;
  gap: 0;
  padding: var(--spacing-25, 4px);
  border-radius: var(--border-radius-pill, 9999px);
  background-color: var(--background-color-interactive, #eaecf0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

@media (min-width: 480px) {
  .all__fab {
    right: calc((100vw - min(100vw, 412px)) / 2 + var(--spacing-50, 8px));
  }
}

.all__fab-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border: none;
  border-radius: var(--border-radius-circle, 50%);
  background: transparent;
  color: var(--color-base);
  cursor: pointer;
}

.all__fab-btn :deep(.cdx-icon) {
  width: 1.25rem;
  height: 1.25rem;
}
</style>
