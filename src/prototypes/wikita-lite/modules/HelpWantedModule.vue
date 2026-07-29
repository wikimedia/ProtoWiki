<script setup lang="ts">
import { computed } from 'vue'

import { CdxCard, CdxProgressBar } from '@wikimedia/codex'

import { resolveEditOpportunityIcon } from '../../musical-group/data/editOpportunityIcons'
import type { HomeHelpWanted } from '../../musical-group/data/types'
import { helpWantedHref } from '../composables/useWikitaLiteCardActions'
import WikitaLiteSupportingRow from '../components/WikitaLiteSupportingRow.vue'

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

function cardThumbnail(url?: string) {
  return url?.trim() ? { url: url.trim() } : null
}
</script>

<template>
  <div class="help-wanted-module">
    <CdxProgressBar v-if="loading" inline aria-label="Loading edit suggestions" />

    <template v-else>
      <CdxCard
        v-for="suggestion in displayItems"
        :key="suggestion.itemId"
        :url="helpWantedHref(suggestion)"
        :thumbnail="cardThumbnail(suggestion.thumbnailUrl)"
        :force-thumbnail="true"
      >
        <template #title>
          {{ suggestion.title }}
        </template>
        <template v-if="suggestion.description" #description>
          {{ suggestion.description }}
        </template>
        <template #supporting-text>
          <WikitaLiteSupportingRow :icon="resolveEditOpportunityIcon(suggestion.need)">
            {{ suggestion.suggestionLabel }}
          </WikitaLiteSupportingRow>
        </template>
      </CdxCard>

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
