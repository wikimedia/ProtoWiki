<script setup lang="ts">
import { computed } from 'vue'

import {
  WIKITAB_QUOTE_CARD_LEADING_ICON,
  WIKITAB_WORD_CARD_LEADING_ICON,
  type WikitabCardData,
  type WikitabCardLoading,
} from './sections'
import { cdxIconLanguage } from '@wikimedia/codex-icons'

import { WIKITAB_LANGUAGE, wikitabSavedFromWikiName } from './data/wikitabLanguage'
import { wikitabCardBindProps } from './data/wikitabCardPresentation'
import { wikitabSavedItemPrimitive } from './data/wikitabSavedItems'
import WikitabCard from './WikitabCard.vue'
import {
  savedDiscussionToWikitabCard,
  savedImageToWikitabCard,
  savedItemToActivityItem,
  savedItemToWikitabCard,
  savedQuoteToWikitabCard,
  savedSnippetToWikitabCard,
  savedSuggestionToWikitabCard,
  savedWordToWikitabCard,
} from './data/savedCardHelpers'
import { wikitabCardPropsForSearchActivityItem } from './data/wikitabSearchActivityWikitabCard'
import {
  wikitabCardFeedMenuItems,
  wikitabPrimitiveShowsSaveArticleMenu,
} from './data/wikitabCardMenuItems'
import {
  wikitabCardSaveArticleMenuOption,
  type WikitabSaveArticleMenuLookup,
} from './data/savedCardHelpers'
import { savedItemSeedArticle, savedItemSourceUrl } from './data/wikitabSavedItems'
import type { WikitabSavedItem } from './data/wikitabConfig'

const props = defineProps<{
  saved: WikitabSavedItem
  loading?: WikitabCardLoading
  showArticleMenu?: boolean
  isSaved?: boolean
  isCardSaved?: (id: string) => boolean
  saveArticleMenuLookup?: WikitabSaveArticleMenuLookup
}>()

const emit = defineEmits<{
  'toggle-save': []
  'toggle-save-article': []
}>()

/**
 * Set when the item was saved on another wiki than this page load's. Commons
 * images are the same on every wiki, so they never get one.
 */
const savedFromLabel = computed(() =>
  props.saved.lang === WIKITAB_LANGUAGE || props.saved.type === 'image'
    ? null
    : wikitabSavedFromWikiName(props.saved.lang, savedItemSourceUrl(props.saved)),
)

/**
 * Put "French Wikipedia" at the end of the card's supporting row, after the
 * language icon (`supportingEndIcon`). The start of the row keeps its own icon
 * and text (editor, comment count, suggestion task).
 */
function withSavedFromLabel(data: WikitabCardData): WikitabCardData {
  const label = savedFromLabel.value
  if (!label) return data
  return {
    ...data,
    supportingTextEnd: data.supportingTextEnd ? `${label} · ${data.supportingTextEnd}` : label,
  }
}

/** Language icon for the supporting row's end, when the "French Wikipedia" label is shown. */
const savedFromIcon = computed(() =>
  savedFromLabel.value ? { supportingEndIcon: cdxIconLanguage } : {},
)

const card = computed(() => {
  const data = savedItemCard()
  return data ? withSavedFromLabel(data) : null
})

function savedItemCard(): WikitabCardData | null {
  switch (props.saved.type) {
    case 'article':
      return savedItemToWikitabCard(props.saved)
    case 'snippet':
      return savedSnippetToWikitabCard(props.saved)
    case 'word':
      return savedWordToWikitabCard(props.saved)
    case 'quote':
      return savedQuoteToWikitabCard(props.saved)
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
}

const primitive = computed(() => wikitabSavedItemPrimitive(props.saved))

/**
 * "Save article" saves the seed as an article on this page's wiki — only offered
 * for items from this wiki, since another wiki's seed title would point elsewhere.
 */
const showSaveArticleOption = computed(
  () =>
    props.saved.type !== 'article' &&
    props.saved.lang === WIKITAB_LANGUAGE &&
    wikitabPrimitiveShowsSaveArticleMenu(primitive.value),
)

const activityItem = computed(() =>
  props.saved.type === 'change' ? savedItemToActivityItem(props.saved) : null,
)

const activityBindProps = computed(() => {
  if (!activityItem.value) return null
  const seed = savedItemSeedArticle(props.saved)
  const bound = wikitabCardPropsForSearchActivityItem(activityItem.value, {
    loading: props.loading,
    includeSave: props.showArticleMenu,
    isSaved: props.isSaved,
    saveArticle:
      showSaveArticleOption.value &&
      props.saveArticleMenuLookup
        ? wikitabCardSaveArticleMenuOption(seed, props.saveArticleMenuLookup)
        : false,
    revisionActionsMenu: false,
    showThumbnail: false,
  })
  return {
    ...bound,
    card: withSavedFromLabel(bound.card as WikitabCardData),
    ...savedFromIcon.value,
    contentLang: props.saved.lang,
  }
})

const bindProps = computed(() => {
  const data = card.value
  if (!data) return {}

  const seed = savedItemSeedArticle(props.saved)
  const extra: Record<string, unknown> = {
    card: data,
    ...savedFromIcon.value,
    contentLang: props.saved.lang,
    loading: props.loading,
    menu: props.showArticleMenu
      ? wikitabCardFeedMenuItems({
          save: { isSaved: props.isSaved, primitiveId: primitive.value },
          saveArticle:
            showSaveArticleOption.value &&
            props.saveArticleMenuLookup
              ? wikitabCardSaveArticleMenuOption(seed, props.saveArticleMenuLookup)
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

</script>

<template>
  <WikitabCard
    v-if="activityItem && activityBindProps"
    v-bind="activityBindProps"
    @toggle-save="emit('toggle-save')"
    @toggle-save-article="emit('toggle-save-article')"
  />
  <WikitabCard
    v-else-if="card"
    v-bind="bindProps"
    @toggle-save="emit('toggle-save')"
    @toggle-save-article="emit('toggle-save-article')"
  />
</template>
