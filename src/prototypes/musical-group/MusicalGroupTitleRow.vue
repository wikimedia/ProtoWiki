<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import WikitaTitle from './components/WikitaTitle.vue'
import { useWikitaSaveFeedback } from './composables/useWikitaSaveFeedback'
import { isBookmarked } from './data/bookmarks'
import { isPageInAnyList } from './data/lists'
import { entityDisplayLabel } from './data/formatLabel'
import type { MusicalGroupData } from './data/types'
import {
  commonsFileUrl,
  wikidataEditEntityUrl,
  wikidataHistoryUrl,
  wikidataTalkHistoryUrl,
} from './data/wikidataApi'

interface Props {
  data: MusicalGroupData
}

const props = defineProps<Props>()

/** Set to true to show history, talk, and edit buttons in the title row. */
const SHOW_WIKIDATA_TITLE_ACTIONS = false

const title = computed(() => entityDisplayLabel(props.data.label, props.data.enwikiTitle))
const thumbnailUrl = computed(
  () =>
    props.data.images[0]?.url ??
    (props.data.imageFilename ? commonsFileUrl(props.data.imageFilename, 256) : undefined),
)
const bookmarked = ref(isBookmarked(props.data.id))
const { savePage, listsVersion } = useWikitaSaveFeedback()

const inList = computed(() => {
  void listsVersion.value
  return isPageInAnyList(props.data.id)
})

watch(
  () => props.data.id,
  (id) => {
    bookmarked.value = isBookmarked(id)
  },
)

function onBookmarkClick() {
  bookmarked.value = savePage(props.data.id, title.value, thumbnailUrl.value)
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
    :title="title"
    :bookmarked="bookmarked"
    :in-list="inList"
    :show-history="SHOW_WIKIDATA_TITLE_ACTIONS"
    :show-talk="SHOW_WIKIDATA_TITLE_ACTIONS"
    :show-edit="SHOW_WIKIDATA_TITLE_ACTIONS"
    :show-history-dot="data.editIndicator === 'history'"
    :show-talk-dot="data.editIndicator === 'talk'"
    @bookmark-click="onBookmarkClick"
    @history-click="onHistoryClick"
    @talk-click="onTalkClick"
    @edit-click="onEditClick"
  />
</template>
