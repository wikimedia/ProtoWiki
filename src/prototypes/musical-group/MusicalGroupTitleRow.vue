<script setup lang="ts">
import { ref } from 'vue'

import WikitaTitle from './components/WikitaTitle.vue'
import { isBookmarked, toggleBookmark } from './data/bookmarks'
import type { MusicalGroupData } from './data/types'
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
</script>

<template>
  <WikitaTitle
    :title="data.label"
    :bookmarked="bookmarked"
    :show-history-dot="data.editIndicator === 'history'"
    :show-talk-dot="data.editIndicator === 'talk'"
    @bookmark-click="onBookmarkClick"
    @history-click="onHistoryClick"
    @talk-click="onTalkClick"
    @edit-click="onEditClick"
  />
</template>
