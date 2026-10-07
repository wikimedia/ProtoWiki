<script setup lang="ts">
import { computed } from 'vue'

import WikitabCard from './WikitabCard.vue'
import WikitabSearchActivityCard from './WikitabSearchActivityCard.vue'
import {
  savedDiscussionToWikitabCard,
  savedImageToWikitabCard,
  savedItemToActivityItem,
  savedItemToWikitabCard,
  savedSnippetToWikitabCard,
  savedSuggestionToWikitabCard,
} from './data/savedCardHelpers'
import type { WikitabSavedItem } from './data/wikitabConfig'
import { WIKITAB_SAVED_MODULE_SPEC, WIKITAB_SUGGESTED_EDITS_MODULE_SPEC } from './sections'
import { cdxIconQuotes } from '@wikimedia/codex-icons'
import { resolveSavedIcon } from './data/wikitabSavedIcons'

const props = defineProps<{
  saved: WikitabSavedItem
  loading?: boolean
  showArticleMenu?: boolean
  isSaved?: boolean
}>()

const emit = defineEmits<{
  'toggle-save': []
}>()

const articleSpec = WIKITAB_SAVED_MODULE_SPEC
const suggestionSpec = WIKITAB_SUGGESTED_EDITS_MODULE_SPEC

const articleCard = computed(() =>
  props.saved.type === 'article' ? savedItemToWikitabCard(props.saved) : null,
)

const snippetCard = computed(() =>
  props.saved.type === 'snippet' ? savedSnippetToWikitabCard(props.saved) : null,
)

const snippetPresentation = computed(() =>
  props.saved.type === 'snippet' ? props.saved.presentation : null,
)

const discussionCard = computed(() =>
  props.saved.type === 'discussion' ? savedDiscussionToWikitabCard(props.saved) : null,
)

const suggestionCard = computed(() =>
  props.saved.type === 'suggestion' ? savedSuggestionToWikitabCard(props.saved) : null,
)

const activityItem = computed(() =>
  props.saved.type === 'change' ? savedItemToActivityItem(props.saved) : null,
)

const imageCard = computed(() =>
  props.saved.type === 'image' ? savedImageToWikitabCard(props.saved) : null,
)
</script>

<template>
  <WikitabCard
    v-if="saved.type === 'article' && articleCard"
    :variant="articleSpec.variant"
    :height="articleSpec.cardHeight"
    :thumbnail-size="articleSpec.thumbnailSize"
    :card="articleCard"
    :loading="loading"
    :show-article-menu="showArticleMenu"
    :is-saved="isSaved"
    @toggle-save="emit('toggle-save')"
  />

  <WikitabCard
    v-else-if="saved.type === 'snippet' && snippetCard && snippetPresentation"
    :variant="snippetPresentation.variant"
    :height="snippetPresentation.cardHeight"
    :thumbnail-size="snippetPresentation.thumbnailSize"
    :card="snippetCard"
    :supporting-icon="resolveSavedIcon(snippetPresentation.supportingIcon)"
    :hook-leading-icon="cdxIconQuotes"
    :full-hook="snippetPresentation.fullHook"
    :loading="loading"
    :show-article-menu="showArticleMenu"
    :is-saved="isSaved"
    @toggle-save="emit('toggle-save')"
  />

  <WikitabCard
    v-else-if="saved.type === 'suggestion' && suggestionCard"
    :variant="suggestionSpec.variant"
    :height="suggestionSpec.cardHeight"
    :thumbnail-size="suggestionSpec.thumbnailSize"
    :card="suggestionCard"
    supporting-progressive
    :loading="loading"
    :show-article-menu="showArticleMenu"
    :is-saved="isSaved"
    @toggle-save="emit('toggle-save')"
  />

  <WikitabSearchActivityCard
    v-else-if="saved.type === 'change' && activityItem"
    :item="activityItem"
    :show-thumbnail="false"
    :is-saved="isSaved"
    show-save-menu
    @toggle-save="emit('toggle-save')"
  />

  <WikitabCard
    v-else-if="saved.type === 'discussion' && discussionCard"
    variant="text"
    :height="98"
    :thumbnail-size="96"
    :card="discussionCard"
    :loading="loading"
    :show-article-menu="showArticleMenu"
    :is-saved="isSaved"
    @toggle-save="emit('toggle-save')"
  />

  <WikitabCard
    v-else-if="saved.type === 'image' && imageCard"
    :variant="articleSpec.variant"
    :height="articleSpec.cardHeight"
    :thumbnail-size="articleSpec.thumbnailSize"
    :card="imageCard"
    :loading="loading"
    :show-article-menu="showArticleMenu"
    :is-saved="isSaved"
    @toggle-save="emit('toggle-save')"
  />
</template>
