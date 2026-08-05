<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'

import { CdxCard, CdxProgressBar } from '@wikimedia/codex'
import { cdxIconLightbulb } from '@wikimedia/codex-icons'

import type { HomeHelpWanted } from '../../musical-group/data/types'
import { resolveEditOpportunityIcon } from '../../musical-group/data/editOpportunityIcons'
import { helpWantedHref } from '../composables/useWikitaLiteCardActions'
import { useWikitaLiteCardListClasses } from '../composables/useWikitaLiteCardListClasses'
import WikitaLiteSupportingRow from '../components/WikitaLiteSupportingRow.vue'

interface Props {
  standalone?: boolean
  items?: HomeHelpWanted[]
  loading?: boolean
  loadingMore?: boolean
  previewLimit?: number
  moreTo?: RouteLocationRaw
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  items: () => [],
  loading: false,
  loadingMore: false,
  previewLimit: 3,
  moreTo: undefined,
})

const displayItems = computed(() =>
  props.standalone ? props.items : props.items.slice(0, props.previewLimit),
)

const showMoreLink = computed(
  () => !props.standalone && Boolean(props.moreTo) && displayItems.value.length > 0,
)

function cardThumbnail(url?: string) {
  return url?.trim() ? { url: url.trim() } : null
}

const { groupClass, cardClass } = useWikitaLiteCardListClasses({ standalone: () => props.standalone })

function suggestionIcon(suggestion: HomeHelpWanted) {
  return props.standalone
    ? resolveEditOpportunityIcon(suggestion.need)
    : cdxIconLightbulb
}
</script>

<template>
  <div class="help-wanted-module">
    <div :class="['help-wanted-module__cards', groupClass]">
      <CdxCard
        v-for="suggestion in displayItems"
        :key="suggestion.itemId"
        :class="cardClass"
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
        <WikitaLiteSupportingRow :icon="suggestionIcon(suggestion)">
          {{ suggestion.suggestionLabel }}
        </WikitaLiteSupportingRow>
      </template>
      </CdxCard>
    </div>

    <RouterLink
      v-if="showMoreLink && moreTo"
      :to="moreTo"
      class="cdx-button cdx-button--fake-button cdx-button--fake-button--enabled wikita-lite-button-link"
    >
      Show more suggestions
    </RouterLink>

    <CdxProgressBar
      v-if="standalone && (loading || loadingMore)"
      inline
      aria-label="Loading edit suggestions"
    />

    <p
      v-if="standalone && !displayItems.length && !loading && !loadingMore"
      class="help-wanted-module__empty"
    >
      No edit suggestions right now.
    </p>
  </div>
</template>

<style scoped>
.help-wanted-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.help-wanted-module__cards {
  display: flex;
  flex-direction: column;
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
