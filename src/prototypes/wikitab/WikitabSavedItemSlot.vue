<script setup lang="ts">
import { computed } from 'vue'

import {
  WIKITAB_QUOTE_CARD_LEADING_ICON,
  WIKITAB_WORD_CARD_LEADING_ICON,
  type WikitabCardLoading,
} from './sections'
import { wikitabCardBindProps } from './data/wikitabCardPresentation'
import { wikitabSavedItemPrimitive } from './data/wikitabSavedItems'
import WikitabCard from './WikitabCard.vue'
import {
  savedDiscussionToWikitabCard,
  savedImageToWikitabCard,
  savedItemToActivityItem,
  savedItemToWikitabCard,
  savedListToWikitabCard,
  savedQuoteToWikitabCard,
  savedSnippetToWikitabCard,
  savedSuggestionToWikitabCard,
  savedWordToWikitabCard,
} from './data/savedCardHelpers'
import { wikitabCardPropsForSearchActivityItem } from './data/wikitabSearchActivityWikitabCard'
import { wikitabCardSaveMenuItem } from './data/wikitabCardMenuItems'
import type { WikitabSavedItem } from './data/wikitabConfig'

const props = defineProps<{
  saved: WikitabSavedItem
  loading?: WikitabCardLoading
  showArticleMenu?: boolean
  isSaved?: boolean
}>()

const emit = defineEmits<{
  'toggle-save': []
}>()

const card = computed(() => {
  switch (props.saved.type) {
    case 'article':
      return savedItemToWikitabCard(props.saved)
    case 'snippet':
      return savedSnippetToWikitabCard(props.saved)
    case 'word':
      return savedWordToWikitabCard(props.saved)
    case 'quote':
      return savedQuoteToWikitabCard(props.saved)
    case 'list':
      return savedListToWikitabCard(props.saved)
    case 'suggestion':
      return savedSuggestionToWikitabCard(props.saved)
    case 'change':
      return null
    case 'discussion':
      return savedDiscussionToWikitabCard(props.saved)
    case 'image':
      return savedImageToWikitabCard(props.saved)
    default:
      return null
  }
})

const primitive = computed(() => wikitabSavedItemPrimitive(props.saved))

const activityItem = computed(() =>
  props.saved.type === 'change' ? savedItemToActivityItem(props.saved) : null,
)

const activityBindProps = computed(() => {
  if (!activityItem.value) return null
  return wikitabCardPropsForSearchActivityItem(activityItem.value, {
    loading: props.loading,
    includeSave: props.showArticleMenu,
    isSaved: props.isSaved,
    revisionActionsMenu: false,
    showThumbnail: false,
  })
})

const bindProps = computed(() => {
  const data = card.value
  if (!data) return {}

  const extra: Record<string, unknown> = {
    card: data,
    loading: props.loading,
    menu: props.showArticleMenu
      ? [wikitabCardSaveMenuItem({ isSaved: props.isSaved })]
      : undefined,
  }

  if (props.saved.type === 'word') {
    extra.icon = WIKITAB_WORD_CARD_LEADING_ICON
  }
  if (props.saved.type === 'quote') {
    extra.icon = WIKITAB_QUOTE_CARD_LEADING_ICON
  }

  return wikitabCardBindProps(primitive.value, extra)
})

function onActivityMenuSelect(value: string) {
  if (value === 'save') emit('toggle-save')
}
</script>

<template>
  <WikitabCard
    v-if="activityItem && activityBindProps"
    v-bind="activityBindProps"
    @menu-select="onActivityMenuSelect"
  />
  <WikitabCard v-else-if="card" v-bind="bindProps" @toggle-save="emit('toggle-save')" />
</template>
