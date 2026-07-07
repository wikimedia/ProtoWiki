<script setup lang="ts">
import { computed } from 'vue'

import { cdxIconEdit, cdxIconHistory, cdxIconSpeechBubble } from '@wikimedia/codex-icons'

import BookmarkIcon from '../BookmarkIcon.vue'
import WikitaIcon from './WikitaIcon.vue'

interface Props {
  title: string
  bookmarked?: boolean
  inList?: boolean
  showBookmark?: boolean
  showHistory?: boolean
  showTalk?: boolean
  showEdit?: boolean
  showHistoryDot?: boolean
  showTalkDot?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  bookmarked: false,
  inList: false,
  showBookmark: true,
  showHistory: true,
  showTalk: true,
  showEdit: true,
  showHistoryDot: false,
  showTalkDot: false,
})

const emit = defineEmits<{
  'bookmark-click': []
  'history-click': []
  'talk-click': []
  'edit-click': []
}>()

const hasActions = computed(
  () => props.showHistory || props.showTalk || props.showEdit,
)
</script>

<template>
  <div class="wikita-title">
    <div class="wikita-title__header">
      <div class="wikita-title__lead">
        <button
          v-if="showBookmark"
          type="button"
          class="wikita-title__icon-btn"
          :aria-label="inList ? 'In list' : bookmarked ? 'Saved' : 'Bookmark'"
          @click="emit('bookmark-click')"
        >
          <BookmarkIcon :filled="bookmarked && !inList" :in-list="inList" />
        </button>

        <h1 class="wikita-title__title">{{ title }}</h1>
      </div>

      <div v-if="hasActions" class="wikita-title__actions">
        <button
          v-if="showHistory"
          type="button"
          class="wikita-title__icon-btn"
          aria-label="History"
          @click="emit('history-click')"
        >
          <WikitaIcon :icon="cdxIconHistory" frame="history" />
          <span v-if="showHistoryDot" class="wikita-title__dot" aria-hidden="true" />
        </button>

        <button
          v-if="showTalk"
          type="button"
          class="wikita-title__icon-btn"
          aria-label="Talk"
          @click="emit('talk-click')"
        >
          <WikitaIcon :icon="cdxIconSpeechBubble" frame="talk" />
          <span v-if="showTalkDot" class="wikita-title__dot" aria-hidden="true" />
        </button>

        <button
          v-if="showEdit"
          type="button"
          class="wikita-title__icon-btn"
          aria-label="Edit"
          @click="emit('edit-click')"
        >
          <WikitaIcon :icon="cdxIconEdit" frame="edit" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wikita-title {
  padding-inline: var(--spacing-50);
  background-color: var(--background-color-base);
}

.wikita-title__header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--spacing-50);
}

.wikita-title__header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background-color: var(--color-base);
  transition:
    left 25ms linear,
    right 25ms linear;
}

.wikita-title__lead {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
}

.wikita-title__lead .wikita-title__icon-btn {
  /* Optically center 20px bookmark with the first line’s line box (xxx-large / xx-large). */
  margin-top: calc((var(--line-height-xx-large) - 20px) / 2);
}

.wikita-title__title {
  margin: 0;
  font-family: var(--font-family-serif);
  font-size: var(--font-size-xxx-large);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-xx-large);
  color: var(--color-base);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.wikita-title__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
}

.wikita-title__icon-btn {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.wikita-title__dot {
  position: absolute;
  top: 0;
  right: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--background-color-error);
}

@media (prefers-reduced-motion: reduce) {
  .wikita-title__header::after {
    transition: none;
  }
}
</style>
