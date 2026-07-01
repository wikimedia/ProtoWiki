<script setup lang="ts">
import { computed, ref } from 'vue'

import { cdxIconLink } from '@wikimedia/codex-icons'

import WikitaCardItem from './components/WikitaCardItem.vue'
import { isBookmarked, toggleBookmark } from './data/bookmarks'
import type { MusicalGroupOverviewRelated } from './data/types'
import { useMusicalGroupRoute } from './useMusicalGroupRoute'

interface Props {
  related: MusicalGroupOverviewRelated
  /** When set, this related article also mentions the item — show the mention snippet. */
  snippetHtml?: string
}

const props = withDefaults(defineProps<Props>(), {
  snippetHtml: undefined,
})
const { itemRoute } = useMusicalGroupRoute()

const cardHref = computed(() => (props.related.id ? itemRoute(props.related.id) : undefined))

/** Local save-button state; saved-library feeds refresh on tab/page navigation only. */
const bookmarkState = ref<Record<string, boolean>>({})

function relatedSaved(itemId: string): boolean {
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
    :show-snippet="Boolean(snippetHtml)"
    :snippet-html="snippetHtml"
    :show-info="false"
    :show-action="Boolean(related.id)"
    :action-active="related.id ? relatedSaved(related.id) : false"
    :action-label="related.id && relatedSaved(related.id) ? 'Saved' : 'Save'"
    :title-bold="true"
    type="Related"
    :type-icon="cdxIconLink"
    :title="related.title"
    :body="related.description"
    :thumbnail-url="related.thumbnailUrl"
    :show-thumbnail="Boolean(related.thumbnailUrl)"
    @action-click="related.id && onSave(related.id)"
  />
</template>
