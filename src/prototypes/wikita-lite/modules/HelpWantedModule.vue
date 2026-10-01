<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import { CdxCard, CdxProgressBar } from '@wikimedia/codex'
import { cdxIconLightbulb } from '@wikimedia/codex-icons'

import type { HomeHelpWanted } from '../../musical-group/data/types'
import { helpWantedHref } from '../composables/useWikitaLiteCardActions'
import { useWikitaLiteCardListClasses } from '../composables/useWikitaLiteCardListClasses'
import WikitaLiteCardSkeletons from '../components/WikitaLiteCardSkeletons.vue'
import WikitaLiteShowMore from '../components/WikitaLiteShowMore.vue'
import WikitaLiteSupportingRow from '../components/WikitaLiteSupportingRow.vue'
import { MESSAGES, t } from '../i18n'

interface Props {
  standalone?: boolean
  items?: HomeHelpWanted[]
  loading?: boolean
  loadingMore?: boolean
  previewLimit?: number
  /** Empty card slots held at the end of the grid while the feed loads. */
  skeletons?: number
  /**
   * Reveal the next cards in place instead of navigating to the module's own
   * page. The owner grows `previewLimit` in response to `expand`.
   */
  expandable?: boolean
  moreTo?: RouteLocationRaw
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  items: () => [],
  loading: false,
  loadingMore: false,
  previewLimit: 3,
  skeletons: 0,
  expandable: false,
  moreTo: undefined,
})

defineEmits<{
  /** Desktop "Show more": reveal the next cards rather than navigate. */
  expand: []
}>()

const displayItems = computed(() =>
  props.standalone ? props.items : props.items.slice(0, props.previewLimit),
)

const showMoreLink = computed(
  () => !props.standalone && Boolean(props.moreTo) && displayItems.value.length > 0,
)

/*
 * Navigating always has somewhere to go; revealing in place only makes sense
 * while the feed holds more than the preview is showing.
 */
const showMoreControl = computed(
  () => showMoreLink.value && (!props.expandable || props.items.length > props.previewLimit),
)

function cardThumbnail(url?: string) {
  return url?.trim() ? { url: url.trim() } : null
}

const { groupClass, cardClass } = useWikitaLiteCardListClasses({ standalone: () => props.standalone })
</script>

<template>
  <div class="help-wanted-module">
    <div
      :class="['help-wanted-module__cards', groupClass]"
      :aria-busy="skeletons > 0 || undefined"
    >
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
        <WikitaLiteSupportingRow :icon="cdxIconLightbulb">
          {{ suggestion.suggestionLabel }}
        </WikitaLiteSupportingRow>
      </template>
      </CdxCard>
      <WikitaLiteCardSkeletons :count="skeletons" />
    </div>

    <slot name="after-cards" />

    <WikitaLiteShowMore
      v-if="showMoreControl"
      :to="moreTo"
      :expandable="expandable"
      @expand="$emit('expand')"
    >
      {{ MESSAGES.showMoreSuggestions }}
    </WikitaLiteShowMore>

    <CdxProgressBar
      v-if="standalone && (loading || loadingMore)"
      inline
      :aria-label="t('home.loadingEditSuggestions')"
    />

    <p
      v-if="standalone && !displayItems.length && !loading && !loadingMore"
      class="help-wanted-module__empty"
    >
      {{ t('home.emptyEditSuggestions') }}
    </p>
  </div>
</template>

<style scoped>
.help-wanted-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
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
