<script setup lang="ts">
import { ref } from 'vue'

import { CdxIcon } from '@wikimedia/codex'
import { cdxIconEdit, cdxIconHistory, cdxIconSpeechBubble } from '@wikimedia/codex-icons'

import BookmarkIcon from './BookmarkIcon.vue'
import MusicalGroupTitleBar from './MusicalGroupTitleBar.vue'
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
  <MusicalGroupTitleBar :title="data.label">
    <template #lead>
      <button
        type="button"
        class="musical-group-title-row__icon-btn"
        aria-label="Bookmark"
        @click="onBookmarkClick"
      >
        <BookmarkIcon :filled="bookmarked" />
      </button>
    </template>

    <template #actions>
      <button
        type="button"
        class="musical-group-title-row__icon-btn"
        aria-label="History"
        @click="onHistoryClick"
      >
        <CdxIcon :icon="cdxIconHistory" />
        <span v-if="showDot('history')" class="musical-group-title-row__dot" aria-hidden="true" />
      </button>

      <button
        type="button"
        class="musical-group-title-row__icon-btn"
        aria-label="Talk"
        @click="onTalkClick"
      >
        <CdxIcon :icon="cdxIconSpeechBubble" />
        <span v-if="showDot('talk')" class="musical-group-title-row__dot" aria-hidden="true" />
      </button>

      <button
        type="button"
        class="musical-group-title-row__icon-btn"
        aria-label="Edit"
        @click="onEditClick"
      >
        <CdxIcon :icon="cdxIconEdit" />
      </button>
    </template>
  </MusicalGroupTitleBar>
</template>

<style scoped>
.musical-group-title-row__icon-btn {
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

.musical-group-title-row__dot {
  position: absolute;
  top: 0;
  right: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--background-color-error);
}
</style>
