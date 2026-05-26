<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconImage, cdxIconReload, cdxIconRobot } from '@wikimedia/codex-icons'

import DashboardModule from '@/components/DashboardModule.vue'
import difficultyEasyIcon from '@/lib/ve-suggestions/assets/difficulty-easy.svg'
import difficultyHardIcon from '@/lib/ve-suggestions/assets/difficulty-hard.svg'
import difficultyMediumIcon from '@/lib/ve-suggestions/assets/difficulty-medium.svg'
import { CHANGE_SIZE_COLORS } from '@/lib/ve-suggestions'

interface Props {
  to?: RouteLocationRaw
  articleTitle?: string
  articleShortDescription?: string
  thumbnailSrc?: string
  taskTypeLabel?: string
  snippetHtml?: string
  loadPending?: boolean
  showRefresh?: boolean
  refreshing?: boolean
  refreshError?: string | null
  emptyMessage?: string | null
  totalSuggestionCount?: number
  taskDifficulty?: 'easy' | 'medium' | 'hard'
  editHref?: string
}

const difficultyIcons = {
  easy: difficultyEasyIcon,
  medium: difficultyMediumIcon,
  hard: difficultyHardIcon,
} as const

const props = withDefaults(defineProps<Props>(), {
  to: undefined,
  articleTitle: undefined,
  articleShortDescription: undefined,
  thumbnailSrc: undefined,
  taskTypeLabel: undefined,
  snippetHtml: undefined,
  loadPending: false,
  showRefresh: false,
  refreshing: false,
  refreshError: undefined,
  emptyMessage: undefined,
  totalSuggestionCount: undefined,
  taskDifficulty: undefined,
  editHref: undefined,
})

const emit = defineEmits<{
  load: []
  refresh: []
  'open-fullscreen': []
}>()

const hasPreview = computed(
  () => !!props.articleTitle && (!!props.taskTypeLabel || !!props.emptyMessage),
)

const showLoadPrompt = computed(() => props.loadPending && !hasPreview.value)

const isLinkCard = computed(() => props.to != null)

/** Link card only when preview is shown — load/empty states need interactive controls. */
const useLinkCard = computed(() => isLinkCard.value && hasPreview.value)

const showRefreshInTitle = computed(
  () => props.showRefresh && !showLoadPrompt.value && !useLinkCard.value,
)

const showSuggestionCounter = computed(
  () => hasPreview.value && props.totalSuggestionCount != null && props.totalSuggestionCount > 1,
)

const taskTypeColor = computed(() =>
  props.taskDifficulty ? CHANGE_SIZE_COLORS[props.taskDifficulty] : '#14866d',
)

function onRefreshClick(event: Event): void {
  event.preventDefault()
  event.stopPropagation()
  emit('refresh')
}

function onLoadClick(): void {
  emit('load')
}

function onOpenFullscreen(): void {
  if (!useLinkCard.value) return
  emit('open-fullscreen')
}
</script>

<template>
  <div class="suggestion-mode-module">
    <DashboardModule
      class="suggestion-mode-module__variant suggestion-mode-module__variant--mobile"
      title="Suggested edits"
      :to="useLinkCard ? to : undefined"
      :cta="useLinkCard ? 'See all suggestions' : null"
      :mobile-card="!useLinkCard"
      subtle
      @click="onOpenFullscreen"
    >
      <template v-if="showRefreshInTitle" #header-actions>
        <CdxButton
          weight="quiet"
          :icon-only="true"
          aria-label="Refresh suggestions"
          :disabled="refreshing"
          @click="onRefreshClick"
        >
          <CdxIcon :icon="cdxIconReload" />
        </CdxButton>
      </template>

      <p v-if="refreshError" class="suggestion-mode-module__error" role="alert">
        {{ refreshError }}
      </p>

      <div v-if="showLoadPrompt" class="suggestion-mode-module__load-prompt">
        <CdxButton
          action="progressive"
          weight="primary"
          :disabled="refreshing"
          @click.stop="onLoadClick"
        >
          {{ refreshing ? 'Loading…' : 'Load' }}
        </CdxButton>
        <RouterLink
          v-if="isLinkCard"
          :to="to!"
          class="suggestion-mode-module__see-all"
          @click.stop="onOpenFullscreen"
        >
          See all suggestions
        </RouterLink>
      </div>

      <template v-else-if="emptyMessage">
        <p class="suggestion-mode-module__empty">{{ emptyMessage }}</p>
        <CdxButton
          v-if="showRefresh"
          weight="quiet"
          :disabled="refreshing"
          @click.stop="onRefreshClick"
        >
          {{ refreshing ? 'Loading…' : '' }}
        </CdxButton>
      </template>

      <template v-else-if="hasPreview">
        <p v-if="showSuggestionCounter" class="suggestion-mode-module__counter">
          1 of {{ props.totalSuggestionCount }}
        </p>

        <component
          :is="props.editHref ? 'a' : 'div'"
          class="suggestion-mode-module__preview"
          :class="{ 'suggestion-mode-module__preview--link': !!props.editHref }"
          :href="props.editHref"
          :target="props.editHref ? '_blank' : undefined"
          :rel="props.editHref ? 'noreferrer noopener' : undefined"
          :aria-label="props.editHref ? `Edit ${props.articleTitle}` : undefined"
        >
          <div class="suggestion-mode-module__preview-body">
            <div v-if="props.thumbnailSrc" class="suggestion-mode-module__thumb-wrap">
              <img
                class="suggestion-mode-module__thumb"
                :src="props.thumbnailSrc"
                alt=""
                width="72"
                height="72"
              />
            </div>
            <div
              v-else
              class="suggestion-mode-module__thumb-wrap suggestion-mode-module__thumb-wrap--placeholder"
              aria-hidden="true"
            >
              <CdxIcon :icon="cdxIconImage" size="medium" />
            </div>

            <div class="suggestion-mode-module__preview-text">
              <p class="suggestion-mode-module__article-title">{{ props.articleTitle }}</p>
              <p
                v-if="props.articleShortDescription"
                class="suggestion-mode-module__article-description"
              >
                {{ props.articleShortDescription }}
              </p>

              <div
                v-if="props.taskTypeLabel"
                class="suggestion-mode-module__task-footer"
                :style="{ color: taskTypeColor }"
              >
                <CdxIcon
                  :icon="cdxIconRobot"
                  size="small"
                  class="suggestion-mode-module__task-footer-icon"
                />
                <img
                  v-if="props.taskDifficulty"
                  class="suggestion-mode-module__task-footer-icon suggestion-mode-module__task-footer-icon--difficulty"
                  :src="difficultyIcons[props.taskDifficulty]"
                  :alt="`${props.taskDifficulty} difficulty`"
                  width="18"
                  height="18"
                />
                <span class="suggestion-mode-module__task-type">{{ props.taskTypeLabel }}</span>
              </div>
            </div>
          </div>

          <div
            v-if="props.snippetHtml"
            class="suggestion-mode-module__snippet mw-parser-output"
            v-html="props.snippetHtml"
          />
        </component>
      </template>
    </DashboardModule>

    <DashboardModule
      class="suggestion-mode-module__variant suggestion-mode-module__variant--desktop"
      title="Suggested edits"
    >
      <p class="suggestion-mode-module__desktop-stub">desktop component not supported</p>
    </DashboardModule>
  </div>
</template>

<style scoped>
.suggestion-mode-module__variant--mobile {
  display: none;
}

.suggestion-mode-module__variant--desktop {
  display: block;
}

[data-skin='mobile'] .suggestion-mode-module__variant--mobile {
  display: block;
}

[data-skin='mobile'] .suggestion-mode-module__variant--desktop {
  display: none;
}

.suggestion-mode-module__load-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-75, 12px);
  min-height: 8rem;
  padding: var(--spacing-100, 16px) 0;
}

.suggestion-mode-module__see-all {
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  color: var(--color-progressive, #36c);
  text-decoration: none;
}

.suggestion-mode-module__see-all:hover {
  text-decoration: underline;
}

.suggestion-mode-module__counter {
  margin: 0 0 var(--spacing-75, 12px);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base--subtle, #54595d);
}

.suggestion-mode-module__error {
  margin: 0 0 var(--spacing-50, 8px);
  font-size: var(--font-size-small);
  color: var(--color-error, #bf3c2c);
}

.suggestion-mode-module__empty {
  margin: 0 0 var(--spacing-75, 12px);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base--subtle, #54595d);
}

.suggestion-mode-module__preview {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  padding: var(--spacing-75, 12px);
  background-color: var(--background-color-base, #fff);
  border: 1px solid var(--border-color-subtle, #a2a9b1);
  border-radius: 2px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.suggestion-mode-module__preview-body {
  --suggestion-preview-thumb-size: 72px;
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-75, 12px);
  min-width: 0;
  max-width: 100%;
}

.suggestion-mode-module__preview--link {
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.suggestion-mode-module__preview--link:hover,
.suggestion-mode-module__preview--link:focus,
.suggestion-mode-module__preview--link:active {
  outline: none;
}

@media (hover: hover) and (pointer: fine) {
  .suggestion-mode-module__preview--link:hover {
    background-color: var(--background-color-interactive, #eaecf0);
  }
}

.suggestion-mode-module__preview--link:focus-visible {
  outline: 2px solid var(--color-progressive, #36c);
  outline-offset: 2px;
}

.suggestion-mode-module__thumb-wrap {
  flex-shrink: 0;
  width: var(--suggestion-preview-thumb-size, 72px);
  height: var(--suggestion-preview-thumb-size, 72px);
  border-radius: 2px;
  overflow: hidden;
}

.suggestion-mode-module__thumb-wrap--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--background-color-neutral-subtle, #f8f1e1);
  color: var(--color-base--subtle, #72777d);
}

.suggestion-mode-module__thumb {
  display: block;
  width: var(--suggestion-preview-thumb-size, 72px);
  height: var(--suggestion-preview-thumb-size, 72px);
  object-fit: cover;
  object-position: top;
}

.suggestion-mode-module__preview-text {
  flex: 1;
  min-width: 0;
  height: var(--suggestion-preview-thumb-size, 72px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}

.suggestion-mode-module__article-title {
  margin: 0;
  flex-shrink: 0;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-medium);
  line-height: 1.125;
  color: var(--color-base, #202122);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-mode-module__article-description {
  margin: 0;
  flex-shrink: 1;
  min-height: 0;
  font-size: var(--font-size-x-small);
  line-height: 1.2;
  color: var(--color-base--subtle, #54595d);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.suggestion-mode-module__task-footer {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25, 4px);
  align-self: flex-end;
  flex-shrink: 0;
  max-width: 100%;
  font-size: var(--font-size-x-small);
  line-height: 1;
}

.suggestion-mode-module__task-footer-icon {
  flex-shrink: 0;
  color: inherit;
}

.suggestion-mode-module__task-footer-icon--difficulty {
  width: 18px;
  height: 18px;
}

.suggestion-mode-module__task-type {
  min-width: 0;
  font-weight: var(--font-weight-normal);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-mode-module__snippet {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  font-size: var(--font-size-small, 0.875rem);
  line-height: var(--line-height-content, 1.57);
  color: var(--color-subtle, #54595d);
  padding: var(--spacing-50, 8px);
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.suggestion-mode-module__snippet :deep(> *:first-child) {
  margin-top: 0;
}

.suggestion-mode-module__snippet :deep(> *:last-child) {
  margin-bottom: 0;
}

.suggestion-mode-module__snippet :deep(p),
.suggestion-mode-module__snippet :deep(ul),
.suggestion-mode-module__snippet :deep(ol) {
  margin: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.suggestion-mode-module__snippet :deep(b),
.suggestion-mode-module__snippet :deep(strong) {
  font-weight: var(--font-weight-bold);
}

.suggestion-mode-module__snippet.mw-parser-output :deep(ul),
.suggestion-mode-module__snippet.mw-parser-output :deep(ol) {
  padding-inline-start: 1.25em;
}

.suggestion-mode-module__snippet :deep(p + p),
.suggestion-mode-module__snippet :deep(p + ul),
.suggestion-mode-module__snippet :deep(p + ol),
.suggestion-mode-module__snippet :deep(ul + p),
.suggestion-mode-module__snippet :deep(ol + p),
.suggestion-mode-module__snippet :deep(ul + ul),
.suggestion-mode-module__snippet :deep(ol + ol) {
  margin-top: var(--spacing-50, 8px);
}

.suggestion-mode-module__desktop-stub {
  margin: 0;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base--subtle, #54595d);
}
</style>
