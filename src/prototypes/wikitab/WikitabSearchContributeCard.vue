<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { CdxIcon, CdxMenuButton, CdxThumbnail } from '@wikimedia/codex'
import {
  cdxIconBookmark,
  cdxIconBookmarkOutline,
  cdxIconEllipsis,
} from '@wikimedia/codex-icons'

import { resolveEditOpportunityIcon } from './data/editOpportunityIcons'
import type { WikitabSearchContributeItem } from './data/fetchWikitabSearchContribute'
import { useThumbnailSlotReady } from './useThumbnailSlotReady'

const props = withDefaults(
  defineProps<{
    item: WikitabSearchContributeItem
    showSaveMenu?: boolean
    isSaved?: boolean
  }>(),
  {
    showSaveMenu: false,
    isSaved: false,
  },
)

const emit = defineEmits<{
  'toggle-save': []
}>()

const selection = ref<string | number | null>(null)

const menuItems = computed(() => [
  {
    value: 'save',
    label: props.isSaved ? 'Unsave' : 'Save',
    icon: props.isSaved ? cdxIconBookmark : cdxIconBookmarkOutline,
  },
])

watch(selection, (value) => {
  if (value === 'save') emit('toggle-save')
  if (value !== null) selection.value = null
})

const thumbnailUrl = toRef(() => props.item.thumbnailUrl)
const { showThumbnailPending } = useThumbnailSlotReady(thumbnailUrl)

const thumbnail = computed(() =>
  props.item.thumbnailUrl ? { url: props.item.thumbnailUrl } : null,
)

const taskIcon = computed(() => resolveEditOpportunityIcon(props.item.need))
</script>

<template>
  <div class="wikitab-search-contribute-card">
    <div v-if="showSaveMenu" class="wikitab-search-contribute-card__menu">
      <CdxMenuButton
        v-model:selected="selection"
        class="wikitab-search-contribute-card__menu-button"
        weight="quiet"
        :menu-items="menuItems"
        :menu-config="{ renderInPlace: true }"
        :aria-label="`${item.title} options`"
        @click.stop
      >
        <CdxIcon :icon="cdxIconEllipsis" />
      </CdxMenuButton>
    </div>

    <a
      class="wikitab-search-contribute-card__link"
      :href="item.editHref"
      :aria-label="`Edit ${item.title}: ${item.suggestionLabel}`"
      target="_blank"
      rel="noreferrer"
    />

    <div class="wikitab-search-contribute-card__body">
      <CdxThumbnail
        class="wikitab-search-contribute-card__thumbnail"
        :class="{ 'wikitab-search-contribute-card__thumbnail--pending': showThumbnailPending }"
        :thumbnail="thumbnail"
      />

      <div class="wikitab-search-contribute-card__content">
        <p class="wikitab-search-contribute-card__title">{{ item.title }}</p>
        <p v-if="item.body" class="wikitab-search-contribute-card__body-text">
          {{ item.body }}
        </p>
        <p class="wikitab-search-contribute-card__supporting">
          <span class="wikitab-search-contribute-card__supporting-start">
            <CdxIcon
              :icon="taskIcon"
              size="x-small"
              class="wikitab-search-contribute-card__supporting-icon"
            />
            <span class="wikitab-search-contribute-card__supporting-type">{{
              item.suggestionLabel
            }}</span>
          </span>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wikitab-search-contribute-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  box-sizing: border-box;
  min-width: 0;
  padding-block: var(--spacing-75);
  padding-inline: var(--spacing-75);
  border: var(--border-width-base) solid var(--border-color-subtle);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-base);
  transition-property: background-color, color, border-color, box-shadow;
  transition-duration: 0.1s;
}

.wikitab-search-contribute-card:hover {
  border-color: var(--border-color-interactive--hover, #27292d);
}

.wikitab-search-contribute-card:active {
  border-color: var(--border-color-interactive--active, #202122);
}

.wikitab-search-contribute-card__menu {
  position: absolute;
  top: var(--spacing-50);
  right: var(--spacing-50);
  z-index: 3;
}

.wikitab-search-contribute-card__link {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.wikitab-search-contribute-card__link:focus-visible {
  outline: var(--border-width-thick) var(--border-style-base)
    var(--outline-color-progressive--focus);
  outline-offset: calc(var(--border-width-thick) * -1);
}

.wikitab-search-contribute-card__body {
  display: flex;
  flex: 1 1 auto;
  align-items: stretch;
  gap: var(--spacing-75);
  min-width: 0;
  min-height: 96px;
}

.wikitab-search-contribute-card__thumbnail {
  flex-shrink: 0;
  width: 96px;
  height: 96px;
}

.wikitab-search-contribute-card__thumbnail :deep(.cdx-thumbnail__image),
.wikitab-search-contribute-card__thumbnail :deep(.cdx-thumbnail__placeholder) {
  width: 96px;
  height: 96px;
}

.wikitab-search-contribute-card__thumbnail :deep(.cdx-thumbnail__placeholder) {
  background-color: var(--background-color-neutral-subtle);
}

.wikitab-search-contribute-card__thumbnail--pending :deep(.cdx-thumbnail),
.wikitab-search-contribute-card__thumbnail--pending :deep(.cdx-thumbnail__placeholder) {
  border: 0;
  background-color: var(--background-color-neutral-subtle);
}

.wikitab-search-contribute-card__thumbnail--pending :deep(.cdx-icon) {
  display: none;
}

.wikitab-search-contribute-card__thumbnail--pending :deep(.cdx-thumbnail__image) {
  opacity: 0;
}

.wikitab-search-contribute-card__content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-self: stretch;
  box-sizing: border-box;
  min-width: 0;
  min-height: 96px;
  /* Reserve the corner ⋯ menu (32×32 + inset). */
  padding-inline-end: calc(2rem + var(--spacing-75));
}

.wikitab-search-contribute-card__content::after {
  content: '';
  display: block;
  flex: 1 1 auto;
  min-height: 0;
  order: 10;
}

.wikitab-search-contribute-card__title {
  margin: 0;
  overflow: hidden;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
  color: var(--color-base);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.wikitab-search-contribute-card__body-text {
  margin: var(--spacing-25) 0 0;
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.wikitab-search-contribute-card__supporting {
  display: flex;
  align-items: first baseline;
  gap: var(--spacing-25);
  order: 11;
  box-sizing: border-box;
  width: 100%;
  margin: var(--spacing-50) 0 0;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.wikitab-search-contribute-card__supporting-start {
  display: inline-flex;
  align-items: first baseline;
  gap: var(--spacing-25);
  min-width: 0;
}

.wikitab-search-contribute-card__supporting-icon {
  flex-shrink: 0;
  color: var(--color-progressive);
}

.wikitab-search-contribute-card__supporting-type {
  font-weight: var(--font-weight-bold);
  color: var(--color-progressive);
}
</style>
