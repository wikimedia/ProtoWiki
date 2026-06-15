<script setup lang="ts">
import { computed } from 'vue'
import { CdxButton, CdxIcon, CdxSelect } from '@wikimedia/codex'
import {
  cdxIconArrowNext,
  cdxIconChart,
  cdxIconEdit,
  cdxIconFunnel,
  cdxIconImage,
  cdxIconInfo,
  cdxIconRobot,
} from '@wikimedia/codex-icons'

import difficultyEasyIcon from './suggested-edits/data/assets/difficulty-easy.svg'
import difficultyHardIcon from './suggested-edits/data/assets/difficulty-hard.svg'
import difficultyMediumIcon from './suggested-edits/data/assets/difficulty-medium.svg'
import { CHANGE_SIZE_COLORS, type SuggestionDescriptionPart } from './suggested-edits/data/veSuggestions'

const difficultyIcons = {
  easy: difficultyEasyIcon,
  medium: difficultyMediumIcon,
  hard: difficultyHardIcon,
} as const

interface Props {
  showFilterBar?: boolean
  topicFilter?: string
  difficultyFilter?: string
  currentIndex?: number
  totalCount?: number
  articleTitle?: string
  articleShortDescription?: string
  thumbnailSrc?: string
  pageviewsLabel?: string
  taskHeading?: string
  taskTypeLabel?: string
  taskTimeEstimate?: string
  taskDescription?: string
  taskDescriptionParts?: SuggestionDescriptionPart[]
  showSnippet?: boolean
  snippetHtml?: string
  loadPending?: boolean
  showRefresh?: boolean
  refreshing?: boolean
  refreshError?: string | null
  emptyMessage?: string | null
  canGoPrev?: boolean
  canGoNext?: boolean
  taskDifficulty?: 'easy' | 'medium' | 'hard'
  editHref?: string
}

const props = withDefaults(defineProps<Props>(), {
  showFilterBar: false,
  topicFilter: 'Interests',
  difficultyFilter: 'Easy, Medium',
  currentIndex: 0,
  totalCount: 1,
  articleTitle: undefined,
  articleShortDescription: undefined,
  thumbnailSrc: undefined,
  pageviewsLabel: undefined,
  taskHeading: undefined,
  taskTypeLabel: undefined,
  taskTimeEstimate: undefined,
  taskDescription: undefined,
  taskDescriptionParts: undefined,
  showSnippet: false,
  snippetHtml: undefined,
  loadPending: false,
  showRefresh: false,
  refreshing: false,
  refreshError: undefined,
  emptyMessage: undefined,
  canGoPrev: false,
  canGoNext: false,
  taskDifficulty: undefined,
  editHref: undefined,
})

const emit = defineEmits<{
  load: []
  refresh: []
  navigate: [delta: number]
  'open-interests': []
}>()

const difficultyMenuItems = computed(() => [{ value: 'mixed', label: props.difficultyFilter }])

const displayIndex = computed(() => (props.currentIndex ?? 0) + 1)

const totalCountLabel = computed(() => {
  const total = props.totalCount ?? 1
  const suffix = props.refreshing ? '+' : ''
  return `${total.toLocaleString()}${suffix}`
})

const taskTitle = computed(() => props.taskHeading ?? props.taskTypeLabel)

const hasPreview = computed(
  () => !!props.articleTitle && (!!taskTitle.value || !!props.emptyMessage),
)

const showLoadPrompt = computed(() => props.loadPending && !hasPreview.value)

const taskTypeColor = computed(() =>
  props.taskDifficulty ? CHANGE_SIZE_COLORS[props.taskDifficulty] : '#14866d',
)

const hasTaskDescription = computed(
  () => (props.taskDescriptionParts?.length ?? 0) > 0 || !!props.taskDescription?.trim(),
)

function onLoadClick(): void {
  emit('load')
}

function onRefreshClick(): void {
  emit('refresh')
}

function onNavigate(delta: number): void {
  emit('navigate', delta)
}

function onOpenInterests(): void {
  emit('open-interests')
}
</script>

<template>
  <div class="suggested-edits-view">
    <div class="suggested-edits-view__scroll">
      <div
        v-if="showFilterBar"
        class="suggested-edits-view__filters"
        aria-label="Suggestion filters"
      >
        <div class="suggested-edits-view__filter">
          <CdxIcon :icon="cdxIconFunnel" size="small" class="suggested-edits-view__filter-icon" />
          <button
            type="button"
            class="suggested-edits-view__filter-trigger"
            :aria-label="`Topic filter: ${topicFilter}. Open interests settings.`"
            @click="onOpenInterests"
          >
            <span class="suggested-edits-view__filter-trigger-label">{{ topicFilter }}</span>
            <span class="suggested-edits-view__filter-trigger-indicator" aria-hidden="true" />
          </button>
        </div>
        <div class="suggested-edits-view__filter">
          <CdxIcon :icon="cdxIconChart" size="small" class="suggested-edits-view__filter-icon" />
          <CdxSelect
            :selected="'mixed'"
            :menu-items="difficultyMenuItems"
            :default-label="difficultyFilter"
            disabled
          />
        </div>
      </div>

      <p v-if="refreshError" class="suggested-edits-view__error" role="alert">
        {{ refreshError }}
      </p>

      <div v-if="showLoadPrompt" class="suggested-edits-view__load-prompt">
        <CdxButton
          action="progressive"
          weight="primary"
          :disabled="refreshing"
          @click="onLoadClick"
        >
          {{ refreshing ? 'Loading…' : 'Load' }}
        </CdxButton>
      </div>

      <div v-else-if="emptyMessage" class="suggested-edits-view__empty-state">
        <p class="suggested-edits-view__empty">{{ emptyMessage }}</p>
        <CdxButton v-if="showRefresh" weight="quiet" :disabled="refreshing" @click="onRefreshClick">
          {{ refreshing ? 'Loading…' : 'Refresh' }}
        </CdxButton>
      </div>

      <template v-else-if="hasPreview">
        <p class="suggested-edits-view__counter">
          <span class="suggested-edits-view__counter-number">{{ displayIndex }}</span>
          of
          <span class="suggested-edits-view__counter-number">{{ totalCountLabel }}</span>
          suggestions
        </p>

        <component
          :is="editHref ? 'a' : 'article'"
          class="suggested-edits-view__card"
          :class="{ 'suggested-edits-view__card--link': !!editHref }"
          v-bind="
            editHref
              ? {
                  href: editHref,
                  target: '_blank',
                  rel: 'noreferrer noopener',
                  'aria-label': `Edit ${articleTitle}`,
                  'aria-disabled': refreshing ? 'true' : undefined,
                  tabindex: refreshing ? -1 : undefined,
                }
              : {}
          "
          @click="editHref && refreshing ? $event.preventDefault() : undefined"
        >
          <div v-if="thumbnailSrc" class="suggested-edits-view__card-image-wrap">
            <img class="suggested-edits-view__card-image" :src="thumbnailSrc" alt="" />
          </div>
          <div
            v-else
            class="suggested-edits-view__card-image-wrap suggested-edits-view__card-image-wrap--placeholder"
            aria-hidden="true"
          >
            <CdxIcon :icon="cdxIconImage" size="medium" />
          </div>

          <div class="suggested-edits-view__card-body">
            <p class="suggested-edits-view__article-title">{{ articleTitle }}</p>
            <p v-if="articleShortDescription" class="suggested-edits-view__article-description">
              {{ articleShortDescription }}
            </p>
            <p v-if="pageviewsLabel" class="suggested-edits-view__pageviews">
              <CdxIcon :icon="cdxIconChart" size="small" />
              {{ pageviewsLabel }}
            </p>
          </div>
        </component>

        <section v-if="taskTitle" class="suggested-edits-view__task">
          <p class="suggested-edits-view__task-heading">
            {{ taskTitle }}
            <CdxIcon :icon="cdxIconInfo" size="small" class="suggested-edits-view__task-info" />
          </p>

          <div class="suggested-edits-view__task-meta" :style="{ color: taskTypeColor }">
            <CdxIcon
              :icon="cdxIconRobot"
              size="small"
              class="suggested-edits-view__task-meta-icon"
            />
            <img
              v-if="taskDifficulty"
              class="suggested-edits-view__task-meta-icon suggested-edits-view__task-meta-icon--difficulty"
              :src="difficultyIcons[taskDifficulty]"
              :alt="`${taskDifficulty} difficulty`"
              width="18"
              height="18"
            />
            <span v-if="taskTimeEstimate" class="suggested-edits-view__task-time">
              {{ taskTimeEstimate }}
            </span>
          </div>

          <p v-if="hasTaskDescription" class="suggested-edits-view__task-description">
            <template v-if="taskDescriptionParts?.length">
              <template v-for="(part, index) in taskDescriptionParts" :key="index">
                <a
                  v-if="part.kind === 'link'"
                  class="suggested-edits-view__task-description-link"
                  :href="part.href"
                  target="_blank"
                  rel="noreferrer noopener"
                  >{{ part.label }}</a
                >
                <template v-else>{{ part.text }}</template>
              </template>
            </template>
            <template v-else>{{ taskDescription }}</template>
          </p>

          <div
            v-if="showSnippet && snippetHtml"
            class="suggested-edits-view__snippet mw-parser-output"
            v-html="snippetHtml"
          />
        </section>
      </template>
    </div>

    <footer v-if="hasPreview && editHref" class="suggested-edits-view__footer">
      <CdxButton
        weight="quiet"
        :icon-only="true"
        aria-label="Previous suggestion"
        :disabled="!canGoPrev || refreshing"
        @click="onNavigate(-1)"
      >
        <CdxIcon :icon="cdxIconArrowNext" dir="rtl" />
      </CdxButton>

      <a
        v-if="editHref"
        class="suggested-edits-view__edit-link"
        :href="editHref"
        target="_blank"
        rel="noreferrer noopener"
        :aria-disabled="refreshing ? 'true' : undefined"
        :tabindex="refreshing ? -1 : undefined"
        @click="refreshing ? $event.preventDefault() : undefined"
      >
        <CdxButton
          action="progressive"
          weight="primary"
          class="suggested-edits-view__edit-button"
          :disabled="refreshing"
          tabindex="-1"
        >
          <CdxIcon :icon="cdxIconEdit" />
          Edit
        </CdxButton>
      </a>

      <CdxButton
        weight="quiet"
        :icon-only="true"
        aria-label="Next suggestion"
        :disabled="!canGoNext || refreshing"
        @click="onNavigate(1)"
      >
        <CdxIcon :icon="cdxIconArrowNext" />
      </CdxButton>
    </footer>
  </div>
</template>

<style scoped>
.suggested-edits-view {
  display: flex;
  flex: 1;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.suggested-edits-view__scroll {
  --suggested-edits-card-width: 17.5rem;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 0;
  padding: 0 0 var(--spacing-100, 16px);
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.suggested-edits-view__filters {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0;
  width: 100%;
  min-width: 0;
  margin-bottom: var(--spacing-100, 16px);
  background-color: var(--background-color-neutral-subtle, #f8f9fa);
  border-bottom: 1px solid var(--border-color-base, #a2a9b1);
}

.suggested-edits-view__filter {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  min-width: 0;
  min-height: 3rem;
  padding-inline: var(--spacing-75, 12px);
}

.suggested-edits-view__filter + .suggested-edits-view__filter {
  border-inline-start: 1px solid var(--border-color-base, #a2a9b1);
}

.suggested-edits-view__filter-icon {
  flex-shrink: 0;
  color: var(--color-subtle, #72777d);
}

.suggested-edits-view__filter-trigger {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  width: 100%;
  min-width: 0;
  height: 3rem;
  padding: 0 var(--spacing-150, 24px) 0 0;
  border: 0;
  border-radius: 0;
  background-color: transparent;
  box-shadow: none;
  color: var(--color-base--subtle, #54595d);
  font-family: inherit;
  font-size: var(--font-size-medium, 1rem);
  font-weight: var(--font-weight-normal, 400);
  text-align: start;
  cursor: pointer;
}

.suggested-edits-view__filter-trigger-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.suggested-edits-view__filter-trigger-indicator {
  position: absolute;
  right: 0;
  width: 0;
  height: 0;
  border-top: 5px solid var(--color-subtle, #72777d);
  border-right: 5px solid transparent;
  border-left: 5px solid transparent;
}

.suggested-edits-view__filter :deep(.cdx-select-vue) {
  flex: 1;
  width: 100%;
  min-width: 0;
}

.suggested-edits-view__filter :deep(.cdx-select-vue__handle) {
  height: 3rem;
  padding: 0 var(--spacing-150, 24px) 0 0;
  border: 0;
  border-radius: 0;
  background-color: transparent;
  box-shadow: none;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-base--subtle, #54595d);
  font-size: var(--font-size-medium, 1rem);
  font-weight: var(--font-weight-normal, 400);
}

.suggested-edits-view__filter :deep(.cdx-select-vue__indicator) {
  right: 0;
}

.suggested-edits-view__filter :deep(.cdx-select-vue--disabled) {
  opacity: 1;
}

.suggested-edits-view__filter :deep(.cdx-select-vue--disabled .cdx-select-vue__handle) {
  color: var(--color-base--subtle, #54595d);
  opacity: 1;
}

.suggested-edits-view__filter :deep(.cdx-select-vue--disabled .cdx-select-vue__indicator) {
  color: var(--color-subtle, #72777d);
  opacity: 1;
}

.suggested-edits-view__filter :deep(.cdx-select-vue__handle[aria-expanded='true']) {
  border: 0;
  box-shadow: none;
}

.suggested-edits-view__load-prompt {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
}

.suggested-edits-view__empty-state {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-100, 16px);
  min-height: 40vh;
  padding: var(--spacing-200, 32px) var(--spacing-150, 24px);
  box-sizing: border-box;
  text-align: center;
}

.suggested-edits-view__error {
  margin: 0;
  font-size: var(--font-size-small);
  color: var(--color-error, #bf3c2c);
}

.suggested-edits-view__empty {
  margin: 0;
  max-width: 20rem;
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-medium, 1.375);
  color: var(--color-base--subtle, #54595d);
}

.suggested-edits-view__counter {
  margin: 0 0 var(--spacing-150, 24px);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base, #202122);
  text-align: center;
  font-weight: var(--font-weight-normal, 400);
}

.suggested-edits-view__counter-number {
  font-weight: var(--font-weight-bold, 700);
}

.suggested-edits-view__card {
  box-sizing: border-box;
  display: block;
  width: 100%;
  max-width: var(--suggested-edits-card-width, 17.5rem);
  margin-inline: auto;
  background-color: var(--background-color-base, #fff);
  border: 1px solid var(--border-color-subtle, #a2a9b1);
  border-radius: var(--border-radius-base, 2px);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.suggested-edits-view__card--link {
  color: inherit;
  text-decoration: none;
}

.suggested-edits-view__card--link:focus-visible {
  outline: 2px solid var(--border-color-progressive--focus, #36c);
  outline-offset: 2px;
}

.suggested-edits-view__card-image-wrap {
  width: 100%;
  aspect-ratio: 5 / 4;
  overflow: hidden;
  background-color: var(--background-color-neutral-subtle, #f8f9fa);
}

.suggested-edits-view__card-image-wrap--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-base--subtle, #72777d);
}

.suggested-edits-view__card-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}

.suggested-edits-view__card-body {
  padding: var(--spacing-75, 12px);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25, 4px);
}

.suggested-edits-view__article-title {
  margin: 0;
  font-family: var(--font-family-system-sans, system-ui, sans-serif);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
  color: var(--color-base, #202122);
}

.suggested-edits-view__article-description {
  margin: 0;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base--subtle, #54595d);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.suggested-edits-view__pageviews {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25, 4px);
  margin: 0;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base--subtle, #54595d);
}

.suggested-edits-view__task {
  box-sizing: border-box;
  width: 100%;
  max-width: var(--suggested-edits-card-width, 17.5rem);
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
}

.suggested-edits-view__task-heading {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25, 4px);
  margin: var(--spacing-100, 16px) 0 0;
  font-family: var(--font-family-system-sans, system-ui, sans-serif);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
  color: var(--color-base, #202122);
}

.suggested-edits-view__task-info {
  color: var(--color-base--subtle, #54595d);
}

.suggested-edits-view__task-meta {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25, 4px);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
}

.suggested-edits-view__task-meta-icon {
  flex-shrink: 0;
  color: inherit;
}

.suggested-edits-view__task-meta-icon--difficulty {
  width: 18px;
  height: 18px;
}

.suggested-edits-view__task-time {
  font-weight: var(--font-weight-normal);
}

.suggested-edits-view__task-description {
  margin: 0;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base, #202122);
}

.suggested-edits-view__task-description-link {
  color: var(--color-progressive, #36c);
}

.suggested-edits-view__snippet {
  font-size: var(--font-size-small);
  line-height: var(--line-height-content);
  color: var(--color-subtle, #54595d);
  padding: 0 var(--spacing-50, 8px);
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
}

.suggested-edits-view__footer {
  --suggested-edits-footer-bleed-inline: var(--spacing-100, 16px);
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-125, 20px);
  box-sizing: border-box;
  width: calc(100% + 2 * var(--suggested-edits-footer-bleed-inline));
  margin-inline: calc(-1 * var(--suggested-edits-footer-bleed-inline));
  padding: var(--spacing-75, 12px) var(--suggested-edits-footer-bleed-inline);
  padding-bottom: calc(var(--spacing-75, 12px) + env(safe-area-inset-bottom, 0px));
  background-color: var(--background-color-base, #fff);
  border-top: 1px solid var(--border-color-base, #a2a9b1);
}

.suggested-edits-view__edit-link {
  flex: 0 0 auto;
  text-decoration: none;
}

.suggested-edits-view__edit-button {
  width: auto;
}
</style>
