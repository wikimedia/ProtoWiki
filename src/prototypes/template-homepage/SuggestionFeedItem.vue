<script setup lang="ts">
import { computed } from 'vue'

import { CHANGE_SIZE_COLORS } from '@/lib/ve-suggestions'

import type { SuggestionFeedItem } from './useDashpageSuggestionModule'

const props = defineProps<{
  item: SuggestionFeedItem
  preview?: boolean
}>()

const taskTypeColor = computed(() => CHANGE_SIZE_COLORS[props.item.taskDifficulty])

const showSnippet = computed(
  () => !props.preview && props.item.showSnippet && !!props.item.snippetHtml,
)

const hasInstruction = computed(
  () => (props.item.taskDescriptionParts?.length ?? 0) > 0 || !!props.item.taskDescription?.trim(),
)

const showInstruction = computed(() => {
  if (!hasInstruction.value) return false
  if (props.preview) return !showSnippet.value
  return true
})

function onPreviewActivate(event: Event): void {
  if (!props.preview) return
  event.preventDefault()
  event.stopPropagation()
  window.open(props.item.editHref, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <li class="review-changes__item">
    <component
      :is="preview ? 'div' : 'a'"
      class="review-changes__item-link review-changes__item-link--unviewed"
      :href="preview ? undefined : item.editHref"
      :target="preview ? undefined : '_blank'"
      :rel="preview ? undefined : 'noopener noreferrer'"
      :role="preview ? 'link' : undefined"
      :tabindex="preview ? 0 : undefined"
      :aria-label="`Edit ${item.pageTitle}: ${item.taskHeading}`"
      @click="onPreviewActivate"
      @keydown.enter="onPreviewActivate"
      @keydown.space.prevent="onPreviewActivate"
    >
      <div class="review-changes__item-header">
        <span class="review-changes__page-cell">
          <div v-if="item.thumbnailSrc" class="suggestion-feed__thumb-row">
            <div class="suggestion-feed__page-thumb">
              <img
                class="suggestion-feed__page-thumb-image"
                :src="item.thumbnailSrc"
                alt=""
                width="70"
                height="70"
                loading="lazy"
              />
            </div>
            <div class="suggestion-feed__thumb-row-content">
              <p
                v-if="item.taskHeading"
                class="suggestion-feed__task-heading"
                :style="{ color: taskTypeColor }"
              >
                {{ item.taskHeading }}
              </p>

              <span
                class="review-changes__page-cell-heading review-changes__page-cell-heading--separate suggestion-feed__page-heading"
              >
                <span class="review-changes__page suggestion-feed__page">{{ item.pageTitle }}</span>
                <span
                  v-if="item.articleShortDescription"
                  class="review-changes__short-desc review-changes__short-desc--no-separator"
                >
                  {{ item.articleShortDescription }}
                </span>
              </span>

              <p v-if="showInstruction" class="suggestion-feed__instruction">
                <template v-if="item.taskDescriptionParts?.length">
                  <template v-for="(part, index) in item.taskDescriptionParts" :key="index">
                    <strong v-if="part.kind === 'link'">{{ part.label }}</strong>
                    <template v-else>{{ part.text }}</template>
                  </template>
                </template>
                <template v-else>{{ item.taskDescription }}</template>
              </p>
            </div>
          </div>

          <template v-else>
            <p
              v-if="item.taskHeading"
              class="suggestion-feed__task-heading"
              :style="{ color: taskTypeColor }"
            >
              {{ item.taskHeading }}
            </p>

            <span
              class="review-changes__page-cell-heading review-changes__page-cell-heading--separate suggestion-feed__page-heading"
            >
              <span class="review-changes__page suggestion-feed__page">{{ item.pageTitle }}</span>
              <span
                v-if="item.articleShortDescription"
                class="review-changes__short-desc review-changes__short-desc--no-separator"
              >
                {{ item.articleShortDescription }}
              </span>
            </span>

            <p v-if="showInstruction" class="suggestion-feed__instruction">
              <template v-if="item.taskDescriptionParts?.length">
                <template v-for="(part, index) in item.taskDescriptionParts" :key="index">
                  <strong v-if="part.kind === 'link'">{{ part.label }}</strong>
                  <template v-else>{{ part.text }}</template>
                </template>
              </template>
              <template v-else>{{ item.taskDescription }}</template>
            </p>
          </template>

          <div v-if="showSnippet" class="suggestion-feed__snippet" v-html="item.snippetHtml" />
        </span>
      </div>
    </component>
  </li>
</template>

<style scoped>
.suggestion-feed__snippet {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  margin-top: var(--spacing-50, 8px);
  padding: 8px 8px;
  font-size: var(--font-size-small, 0.875rem);
  line-height: var(--line-height-small);
  color: var(--color-subtle, #54595d);
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.suggestion-feed__snippet :deep(> *:first-child) {
  margin-top: 0;
}

.suggestion-feed__snippet :deep(> *:last-child) {
  margin-bottom: 0;
}

.suggestion-feed__snippet :deep(p),
.suggestion-feed__snippet :deep(ul),
.suggestion-feed__snippet :deep(ol),
.suggestion-feed__snippet :deep(li),
.suggestion-feed__snippet :deep(div),
.suggestion-feed__snippet :deep(section) {
  margin: 0;
  padding: 0;
  font-size: inherit;
  line-height: inherit;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.suggestion-feed__snippet :deep(b),
.suggestion-feed__snippet :deep(strong) {
  font-weight: var(--font-weight-bold);
}

.suggestion-feed__snippet :deep(ul),
.suggestion-feed__snippet :deep(ol) {
  padding-inline-start: 1.25em;
  list-style-position: outside;
}

.suggestion-feed__snippet :deep(ul) {
  list-style-type: disc;
}

.suggestion-feed__snippet :deep(ol) {
  list-style-type: decimal;
}

.suggestion-feed__snippet :deep(li) {
  display: list-item;
}

.suggestion-feed__snippet :deep(p + p),
.suggestion-feed__snippet :deep(p + ul),
.suggestion-feed__snippet :deep(p + ol),
.suggestion-feed__snippet :deep(ul + p),
.suggestion-feed__snippet :deep(ol + p),
.suggestion-feed__snippet :deep(ul + ul),
.suggestion-feed__snippet :deep(ol + ol) {
  margin-top: var(--spacing-25, 4px);
}
</style>
