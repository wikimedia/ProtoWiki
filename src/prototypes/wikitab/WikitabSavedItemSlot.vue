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
import { wikitabCardFeedMenuItems } from './data/wikitabCardMenuItems'
import { wikitabCardSaveArticleMenuOption } from './data/savedCardHelpers'
import { savedItemSeedArticle } from './data/wikitabSavedItems'
import type { WikitabSavedItem } from './data/wikitabConfig'

const props = defineProps<{
  saved: WikitabSavedItem
  loading?: WikitabCardLoading
  showArticleMenu?: boolean
  isSaved?: boolean
  isCardSaved?: (id: string) => boolean
}>()

const emit = defineEmits<{
  'toggle-save': []
  'toggle-save-article': []
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
  const seed = savedItemSeedArticle(props.saved)
  return wikitabCardPropsForSearchActivityItem(activityItem.value, {
    loading: props.loading,
    includeSave: props.showArticleMenu,
    isSaved: props.isSaved,
    saveArticle:
      props.saved.type !== 'article' && props.isCardSaved
        ? wikitabCardSaveArticleMenuOption(seed, props.isCardSaved)
        : false,
    revisionActionsMenu: false,
    showThumbnail: false,
  })
})

const bindProps = computed(() => {
  const data = card.value
  if (!data) return {}

  const seed = savedItemSeedArticle(props.saved)
  const extra: Record<string, unknown> = {
    card: data,
    loading: props.loading,
    menu: props.showArticleMenu
      ? wikitabCardFeedMenuItems({
          save: { isSaved: props.isSaved },
          saveArticle:
            props.saved.type !== 'article' && props.isCardSaved
              ? wikitabCardSaveArticleMenuOption(seed, props.isCardSaved)
              : false,
        })
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
  if (value === 'save-article') emit('toggle-save-article')
}
</script>

<template>
  <WikitabCard
    v-if="activityItem && activityBindProps"
    v-bind="activityBindProps"
    @menu-select="onActivityMenuSelect"
    @toggle-save-article="emit('toggle-save-article')"
  />
  <WikitabCard
    v-else-if="card"
    v-bind="bindProps"
    @toggle-save="emit('toggle-save')"
    @toggle-save-article="emit('toggle-save-article')"
  />
</template>
