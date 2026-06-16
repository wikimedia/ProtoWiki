<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { CdxIcon, CdxMessage, CdxProgressBar } from '@wikimedia/codex'
import { cdxIconArrowNext, cdxIconHelp, cdxIconHome } from '@wikimedia/codex-icons'

import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'

import ReturnToArticle from '../components/ReturnToArticle.vue'
import SuggestionCard from '../components/SuggestionCard.vue'
import { useSuggestions } from '../data/useSuggestions'
import type { FlowState } from '../data/useFlowState'

const props = defineProps<{ flow: FlowState }>()

const { suggestions, loading, error, count } = useSuggestions()

const topSuggestions = computed(() => suggestions.value.slice(0, 3))
const returnTitle = computed(() => props.flow.title.value || 'reading')
const viewAllLabel = computed(() =>
  count.value > 0 ? `View all ${count.value} suggestions` : 'View all suggestions',
)

const canOpenAll = computed(() => suggestions.value.length > 0)

function openAllSuggestions(): void {
  if (!canOpenAll.value) return
  void props.flow.goTo('all')
}

function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
}

onMounted(scrollToTop)
</script>

<template>
  <ChromeWrapper skin="mobile" :last-edited-notice="false" :show-footer="false">
    <div class="home">
      <ReturnToArticle :title="returnTitle" @click="props.flow.goTo('read')" />

      <section
        class="home__module home__module--suggestions"
        :class="{ 'home__module--interactive': canOpenAll }"
        :role="canOpenAll ? 'button' : undefined"
        :tabindex="canOpenAll ? 0 : undefined"
        :aria-label="canOpenAll ? viewAllLabel : undefined"
        @click="openAllSuggestions"
        @keydown.enter.prevent="openAllSuggestions"
        @keydown.space.prevent="openAllSuggestions"
      >
        <header class="home__module-head">
          <h2 class="home__module-title">Suggested edits</h2>
          <span v-if="canOpenAll" class="home__module-chevron" aria-hidden="true">
            <CdxIcon :icon="cdxIconArrowNext" />
          </span>
        </header>

        <CdxProgressBar v-if="loading && !suggestions.length" inline aria-label="Loading suggestions" />

        <CdxMessage v-else-if="error" type="error" :allow-user-dismiss="false">
          {{ error }}
        </CdxMessage>

        <p v-else-if="!suggestions.length" class="home__empty">
          No suggestions yet — add an interest to get started.
        </p>

        <div v-else class="home__cards">
          <SuggestionCard
            v-for="suggestion in topSuggestions"
            :key="suggestion.title"
            :task-heading="suggestion.taskHeading"
            :task-color="suggestion.taskColor"
            :article-title="suggestion.title"
            :article-description="suggestion.description"
            :task-description="suggestion.taskDescription"
            :thumbnail-src="suggestion.thumbnailSrc"
          />
        </div>

        <div v-if="suggestions.length" class="home__view-all" aria-hidden="true">
          {{ viewAllLabel }}
        </div>
      </section>

      <section class="home__module">
        <header class="home__module-head">
          <h2 class="home__module-title">Your impact</h2>
        </header>
        <p class="home__impact-text">
          Start with a few
          <a href="#" class="home__inline-link" @click.prevent="props.flow.goTo('all')">
            suggested edits</a>, then see how many people are viewing your contributions.
        </p>
      </section>

      <div class="home__fab">
        <button class="home__fab-btn home__fab-btn--active" type="button" aria-label="Home">
          <CdxIcon :icon="cdxIconHome" />
        </button>
        <button class="home__fab-btn" type="button" aria-label="Help">
          <CdxIcon :icon="cdxIconHelp" />
        </button>
      </div>
    </div>
  </ChromeWrapper>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
  padding: var(--spacing-100, 16px);
  padding-bottom: calc(var(--spacing-100, 16px) + 3.75rem);
}

.home__module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
  border: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
  padding: var(--spacing-100, 16px);
}

.home__module-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 2rem;
}

.home__module-title {
  margin: 0;
  font-family:
    var(--font-family-system-sans, system-ui, sans-serif), var(--font-family-base, sans-serif);
  font-size: var(--font-size-large, 1.125rem);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large, 1.56);
  color: var(--color-base);
}

.home__module--interactive {
  cursor: pointer;
}

.home__module--interactive:focus-visible {
  outline: 2px solid var(--color-progressive, #36c);
  outline-offset: 2px;
}

.home__module-chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: var(--color-base);
}

.home__module-chevron :deep(.cdx-icon) {
  width: 1.25rem;
  height: 1.25rem;
}

.home__cards {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
}

.home__view-all {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  min-height: 2.75rem;
  padding: var(--spacing-75, 12px) var(--spacing-100, 16px);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-progressive, #36c);
  font-size: var(--font-size-medium, 1rem);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-inverted, #fff);
  text-align: center;
}

.home__empty {
  margin: 0;
  color: var(--color-subtle);
}

.home__impact-text {
  margin: 0;
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-medium, 1.625);
  color: var(--color-subtle, #54595d);
}

.home__inline-link {
  color: var(--color-progressive, #36c);
}

.home__fab {
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
  .home__fab {
    right: calc((100vw - min(100vw, 412px)) / 2 + var(--spacing-50, 8px));
  }
}

.home__fab-btn {
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

.home__fab-btn--active {
  background-color: var(--background-color-interactive-subtle, #dadde3);
}

.home__fab-btn :deep(.cdx-icon) {
  width: 1.25rem;
  height: 1.25rem;
}
</style>
