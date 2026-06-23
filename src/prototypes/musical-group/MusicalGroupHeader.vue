<script setup lang="ts">
import { ref } from 'vue'

import { CdxIcon } from '@wikimedia/codex'
import { cdxIconEdit, cdxIconHistory, cdxIconSpeechBubble } from '@wikimedia/codex-icons'

import BookmarkIcon from './BookmarkIcon.vue'
import { isBookmarked, toggleBookmark } from './data/bookmarks'
import type { EditIndicator, MusicalGroupData } from './data/types'
import {
  wikidataEditEntityUrl,
  wikidataHistoryUrl,
  wikidataTalkHistoryUrl,
} from './data/wikidataApi'

interface Props {
  data: MusicalGroupData
}

const props = defineProps<Props>()

const bookmarked = ref(isBookmarked(props.data.id))

function onBookmarkClick() {
  bookmarked.value = toggleBookmark(props.data.id)
}

function onHistoryClick() {
  window.open(wikidataHistoryUrl(props.data.id), '_blank', 'noopener,noreferrer')
}

function onTalkClick() {
  window.open(wikidataTalkHistoryUrl(props.data.id), '_blank', 'noopener,noreferrer')
}

function onEditClick() {
  window.open(wikidataEditEntityUrl(props.data.id), '_blank', 'noopener,noreferrer')
}

function showDot(target: EditIndicator): boolean {
  return props.data.editIndicator === target
}
</script>

<template>
  <header class="musical-group-header">
    <div class="musical-group-header__title-row">
      <div class="musical-group-header__lead">
        <button
          type="button"
          class="musical-group-header__icon-btn musical-group-header__icon-btn--bookmark"
          aria-label="Bookmark"
          @click="onBookmarkClick"
        >
          <BookmarkIcon :filled="bookmarked" />
        </button>
        <h1 class="musical-group-header__title">{{ data.label }}</h1>
      </div>

      <div class="musical-group-header__actions">
        <button
          type="button"
          class="musical-group-header__icon-btn"
          aria-label="History"
          @click="onHistoryClick"
        >
          <CdxIcon :icon="cdxIconHistory" />
          <span v-if="showDot('history')" class="musical-group-header__dot" aria-hidden="true" />
        </button>

        <button
          type="button"
          class="musical-group-header__icon-btn"
          aria-label="Talk"
          @click="onTalkClick"
        >
          <CdxIcon :icon="cdxIconSpeechBubble" />
          <span v-if="showDot('talk')" class="musical-group-header__dot" aria-hidden="true" />
        </button>

        <button
          type="button"
          class="musical-group-header__icon-btn"
          aria-label="Edit"
          @click="onEditClick"
        >
          <CdxIcon :icon="cdxIconEdit" />
        </button>
      </div>
    </div>

    <p v-if="data.description" class="musical-group-header__description">
      {{ data.description }}
    </p>
  </header>
</template>

<style scoped>
.musical-group-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}

.musical-group-header__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-base);
}

.musical-group-header__lead {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.musical-group-header__title {
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.musical-group-header__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
}

.musical-group-header__icon-btn {
  position: relative;
  display: flex;
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

.musical-group-header__dot {
  position: absolute;
  top: 0;
  right: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--background-color-error);
}

.musical-group-header__description {
  margin: 0;
  color: var(--color-emphasized);
}
</style>
