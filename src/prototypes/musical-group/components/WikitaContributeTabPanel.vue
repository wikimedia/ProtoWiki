<script setup lang="ts">
import { computed, ref, toRef } from 'vue'

import { CdxProgressBar } from '@wikimedia/codex'

import WikitaCardItem from './WikitaCardItem.vue'
import WikitaHomeSection from './WikitaHomeSection.vue'
import { resolveEditOpportunityIcon } from '../data/editOpportunityIcons'
import { formatEditSuggestionRelatedToLabel } from '../data/relatedToLabel'
import type { HomeHelpWanted, HomeSavedItem } from '../data/types'
import { enwikiVisualEditorUrl } from '../data/wikidataApi'
import { useCommonsPhotosInfiniteScroll } from '../useCommonsPhotosFeed'
import { useContributeSuggestionsFeed } from '../useContributeSuggestionsFeed'

interface Props {
  items: HomeSavedItem[]
  active: boolean
  scope?: 'home' | 'item'
}

const props = withDefaults(defineProps<Props>(), {
  scope: 'home',
})

const itemsRef = toRef(props, 'items')
const activeRef = toRef(props, 'active')

const itemsWithEnwiki = computed(() =>
  props.items.filter((item) => item.enwikiTitle),
)
const hasItems = computed(() => props.items.length > 0)

const contributeSentinel = ref<HTMLElement | null>(null)

const {
  savedSuggestions: contributeSavedSuggestions,
  savedLoading: contributeSavedLoading,
  relatedSuggestions: contributeRelatedSuggestions,
  relatedLoading: contributeRelatedLoading,
  relatedHasMore: contributeRelatedHasMore,
  loadMoreRelated: loadMoreContributeRelated,
} = useContributeSuggestionsFeed(itemsRef, activeRef)

useCommonsPhotosInfiniteScroll({
  sentinel: contributeSentinel,
  active: activeRef,
  hasMore: contributeRelatedHasMore,
  loading: contributeRelatedLoading,
  loadMore: loadMoreContributeRelated,
})

function editSuggestionRelatedToLabel(suggestion: HomeHelpWanted): string {
  return formatEditSuggestionRelatedToLabel(suggestion, props.items)
}

function contributeSuggestionHref(enwikiTitle?: string): string | undefined {
  return enwikiTitle ? enwikiVisualEditorUrl(enwikiTitle) : undefined
}
</script>

<template>
  <div class="wikita-contribute-tab-panel">
    <template v-if="scope === 'home'">
      <p v-if="!hasItems" class="wikita-contribute-tab-panel__empty">
        Save pages to see edit suggestions.
      </p>
      <p v-else-if="!itemsWithEnwiki.length" class="wikita-contribute-tab-panel__empty">
        None of your saved pages have English Wikipedia articles.
      </p>

      <template v-else>
        <div v-if="contributeSavedLoading" class="wikita-contribute-tab-panel__loading">
          <CdxProgressBar inline aria-label="Loading edit suggestions" />
        </div>

        <WikitaHomeSection
          v-if="contributeSavedSuggestions.length || contributeRelatedSuggestions.length"
        >
          <WikitaCardItem
            v-for="suggestion in contributeSavedSuggestions"
            :key="`saved-${suggestion.itemId}`"
            :type="suggestion.suggestionLabel"
            :type-icon="resolveEditOpportunityIcon(suggestion.need)"
            type-color="progressive"
            :title="suggestion.title"
            :body="suggestion.body"
            :show-snippet="false"
            :show-info="false"
            :thumbnail-url="suggestion.thumbnailUrl"
            :thumbnail-alt="suggestion.title"
            :external-href="contributeSuggestionHref(suggestion.enwikiTitle)"
          />
          <WikitaCardItem
            v-for="suggestion in contributeRelatedSuggestions"
            :key="`related-${suggestion.itemId}`"
            :type="suggestion.suggestionLabel"
            :type-icon="resolveEditOpportunityIcon(suggestion.need)"
            type-color="progressive"
            :title="suggestion.title"
            :body="suggestion.body"
            :show-snippet="false"
            :show-info="Boolean(editSuggestionRelatedToLabel(suggestion))"
            :info-left="editSuggestionRelatedToLabel(suggestion)"
            :thumbnail-url="suggestion.thumbnailUrl"
            :thumbnail-alt="suggestion.title"
            :external-href="contributeSuggestionHref(suggestion.enwikiTitle)"
          />
        </WikitaHomeSection>

        <p
          v-if="
            !contributeSavedLoading &&
            !contributeRelatedLoading &&
            !contributeRelatedSuggestions.length &&
            !contributeRelatedHasMore
          "
          class="wikita-contribute-tab-panel__empty"
        >
          No edit suggestions for related pages right now.
        </p>

        <div v-if="contributeRelatedLoading" class="wikita-contribute-tab-panel__loading">
          <CdxProgressBar inline aria-label="Loading related edit suggestions" />
        </div>

        <div ref="contributeSentinel" class="wikita-contribute-tab-panel__sentinel" aria-hidden="true" />
      </template>
    </template>

    <template v-else>
      <div v-if="contributeSavedLoading" class="wikita-contribute-tab-panel__loading">
        <CdxProgressBar inline aria-label="Loading edit suggestions" />
      </div>

      <WikitaHomeSection
        v-if="contributeSavedSuggestions.length || contributeRelatedSuggestions.length"
      >
        <WikitaCardItem
          v-for="suggestion in contributeSavedSuggestions"
          :key="`saved-${suggestion.itemId}`"
          :type="suggestion.suggestionLabel"
          :type-icon="resolveEditOpportunityIcon(suggestion.need)"
          type-color="progressive"
          :title="suggestion.title"
          :body="suggestion.body"
          :show-snippet="false"
          :show-info="false"
          :thumbnail-url="suggestion.thumbnailUrl"
          :thumbnail-alt="suggestion.title"
          :external-href="contributeSuggestionHref(suggestion.enwikiTitle)"
        />
        <WikitaCardItem
          v-for="suggestion in contributeRelatedSuggestions"
          :key="`related-${suggestion.itemId}`"
          :type="suggestion.suggestionLabel"
          :type-icon="resolveEditOpportunityIcon(suggestion.need)"
          type-color="progressive"
          :title="suggestion.title"
          :body="suggestion.body"
          :show-snippet="false"
          :show-info="Boolean(editSuggestionRelatedToLabel(suggestion))"
          :info-left="editSuggestionRelatedToLabel(suggestion)"
          :thumbnail-url="suggestion.thumbnailUrl"
          :thumbnail-alt="suggestion.title"
          :external-href="contributeSuggestionHref(suggestion.enwikiTitle)"
        />
      </WikitaHomeSection>

      <p
        v-if="
          !contributeSavedLoading &&
          !contributeRelatedLoading &&
          !contributeRelatedSuggestions.length &&
          !contributeRelatedHasMore
        "
        class="wikita-contribute-tab-panel__empty"
      >
        No edit suggestions for related pages right now.
      </p>

      <div v-if="contributeRelatedLoading" class="wikita-contribute-tab-panel__loading">
        <CdxProgressBar inline aria-label="Loading related edit suggestions" />
      </div>

      <div ref="contributeSentinel" class="wikita-contribute-tab-panel__sentinel" aria-hidden="true" />
    </template>
  </div>
</template>

<style scoped>
.wikita-contribute-tab-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  min-height: var(--musical-group-tab-panel-min-height, 50vh);
}

.wikita-contribute-tab-panel__empty {
  margin: 0;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}

.wikita-contribute-tab-panel__sentinel {
  height: 1px;
  margin-top: auto;
  flex-shrink: 0;
}

.wikita-contribute-tab-panel__loading {
  display: flex;
  justify-content: center;
  padding-block: var(--spacing-50);
}
</style>
