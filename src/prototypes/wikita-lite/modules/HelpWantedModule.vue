<script setup lang="ts">
import { computed } from 'vue'

import { CdxProgressBar } from '@wikimedia/codex'

import { resolveEditOpportunityIcon } from '../../musical-group/data/editOpportunityIcons'
import {
  formatEditSuggestionRelatedToLabel,
  getCachedSavedPagesForLabels,
} from '../../musical-group/data/relatedToLabel'
import type { HomeHelpWanted } from '../../musical-group/data/types'
import { helpWantedHref } from '../composables/useWikitaLiteCardActions'
import WikitaLiteCard from '../components/WikitaLiteCard.vue'

interface Props {
  standalone?: boolean
  items?: HomeHelpWanted[]
  loading?: boolean
  previewLimit?: number
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  items: () => [],
  loading: false,
  previewLimit: 3,
})

const displayItems = computed(() =>
  props.standalone ? props.items : props.items.slice(0, props.previewLimit),
)

function editSuggestionRelatedToLabel(suggestion: HomeHelpWanted): string {
  return formatEditSuggestionRelatedToLabel(suggestion, getCachedSavedPagesForLabels())
}
</script>

<template>
  <div class="help-wanted-module">
    <CdxProgressBar v-if="loading" inline aria-label="Loading edit suggestions" />

    <template v-else>
      <WikitaLiteCard
        v-for="suggestion in displayItems"
        :key="suggestion.itemId"
        show-flag
        :flag="suggestion.suggestionLabel"
        :flag-icon="resolveEditOpportunityIcon(suggestion.need)"
        flag-color="progressive"
        :title="suggestion.title"
        :subtitle="suggestion.body"
        show-info
        :info-left="editSuggestionRelatedToLabel(suggestion)"
        :show-thumbnail="Boolean(suggestion.thumbnailUrl)"
        :thumbnail-url="suggestion.thumbnailUrl"
        :thumbnail-alt="suggestion.title"
        :external-href="helpWantedHref(suggestion)"
      />

      <p v-if="standalone && !displayItems.length && !loading" class="help-wanted-module__empty">
        No edit suggestions right now.
      </p>
    </template>
  </div>
</template>

<style scoped>
.help-wanted-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.help-wanted-module__empty {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}
</style>
