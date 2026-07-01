<script setup lang="ts">
import { computed, ref } from 'vue'

import { cdxIconQuotes } from '@wikimedia/codex-icons'

import WikitaCardItem from './components/WikitaCardItem.vue'
import { isBookmarked, toggleBookmark } from './data/bookmarks'
import type { MusicalGroupOverviewSnippet } from './data/types'
import { useMusicalGroupRoute } from './useMusicalGroupRoute'

interface Props {
  snippet: MusicalGroupOverviewSnippet
}

const props = defineProps<Props>()
const { itemRoute } = useMusicalGroupRoute()

const cardHref = computed(() => (props.snippet.id ? itemRoute(props.snippet.id) : undefined))

/** Local save-button state; saved-library feeds refresh on tab/page navigation only. */
const bookmarkState = ref<Record<string, boolean>>({})

function snippetSaved(itemId: string): boolean {
  if (Object.prototype.hasOwnProperty.call(bookmarkState.value, itemId)) {
    return bookmarkState.value[itemId]
  }
  return isBookmarked(itemId)
}

function onSave(itemId: string) {
  const saved = toggleBookmark(itemId)
  bookmarkState.value = {
    ...bookmarkState.value,
    [itemId]: saved,
  }
}
</script>

<template>
  <WikitaCardItem
    :href="cardHref"
    :external-href="snippet.id ? undefined : snippet.articleUrl"
    :show-info="false"
    :show-action="Boolean(snippet.id)"
    :action-active="snippet.id ? snippetSaved(snippet.id) : false"
    :action-label="snippet.id && snippetSaved(snippet.id) ? 'Saved' : 'Save'"
    :title-bold="true"
    type="Mentioned"
    :type-icon="cdxIconQuotes"
    :title="snippet.title"
    :body="snippet.description"
    :show-title="true"
    :snippet-html="snippet.snippetHtml"
    :thumbnail-url="snippet.thumbnailUrl"
    :show-thumbnail="Boolean(snippet.thumbnailUrl)"
    @action-click="snippet.id && onSave(snippet.id)"
  />
</template>
