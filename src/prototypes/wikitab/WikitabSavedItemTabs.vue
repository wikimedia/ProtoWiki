<script setup lang="ts">
import { CdxTab, CdxTabs } from '@wikimedia/codex'

import type { WikitabSavedItemTab } from './data/wikitabSavedItemTabs'

defineProps<{
  tabs: { name: WikitabSavedItemTab; label: string }[]
}>()

const activeTab = defineModel<WikitabSavedItemTab>('active', { required: true })
</script>

<template>
  <CdxTabs v-model:active="activeTab" framed class="wikitab-saved-item-tabs">
    <CdxTab
      v-for="tab in tabs"
      :key="tab.name"
      :name="tab.name"
      :label="tab.label"
    />
  </CdxTabs>
</template>

<style scoped>
.wikitab-saved-item-tabs {
  width: 100%;
  margin-bottom: var(--spacing-50);
}

.wikitab-saved-item-tabs :deep(.cdx-tabs__content) {
  display: none;
}

/* Header + scroll fades — root IS .cdx-tabs--framed, so target children directly. */
.wikitab-saved-item-tabs :deep(.cdx-tabs__header) {
  background-color: transparent;
}

.wikitab-saved-item-tabs :deep(.cdx-tabs__prev-scroller),
.wikitab-saved-item-tabs :deep(.cdx-tabs__next-scroller) {
  background-color: transparent;
}

.wikitab-saved-item-tabs :deep(.cdx-tabs__prev-scroller::after) {
  background-image: linear-gradient(
    to right,
    var(--wikitab-theme-bg, var(--background-color-base)) 0,
    var(--background-color-transparent, transparent) 100%
  );
}

.wikitab-saved-item-tabs :deep(.cdx-tabs__next-scroller::before) {
  background-image: linear-gradient(
    to left,
    var(--wikitab-theme-bg, var(--background-color-base)) 0,
    var(--background-color-transparent, transparent) 100%
  );
}

.wikitab-saved-item-tabs :deep(.cdx-tabs__list) {
  gap: var(--spacing-25);
  padding-block: 1px;
}

/* Framed toggle-button at size="small" — beat framed-tab folder styling. */
.wikitab-saved-item-tabs :deep(.cdx-tabs__header .cdx-tabs__list__item) {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 28rem;
  margin: 0;
  padding-block: var(--spacing-12);
  padding-inline: var(--spacing-50);
  border-width: var(--border-width-base);
  border-style: solid;
  border-color: var(--border-color-interactive);
  border-radius: var(--border-radius-base);
  font-family: inherit;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: 1.125rem;
  text-transform: none;
  mix-blend-mode: normal;
}

.wikitab-saved-item-tabs :deep(.cdx-tabs__scroll-button.cdx-button) {
  padding-block: var(--spacing-12);
  padding-inline: var(--spacing-50);
  font-size: var(--font-size-small);
  line-height: 1.125rem;
}

.wikitab-saved-item-tabs
  :deep(
    .cdx-tabs__header
      .cdx-tabs__list__item:enabled:not([aria-selected='true']):not([aria-selected='true'])
  ) {
  background-color: var(--background-color-interactive-subtle);
  color: var(--color-base);
}

.wikitab-saved-item-tabs
  :deep(
    .cdx-tabs__header
      .cdx-tabs__list__item:enabled:not([aria-selected='true']):not([aria-selected='true']):hover
  ) {
  background-color: var(--background-color-interactive-subtle--hover);
  border-color: var(--border-color-interactive--hover);
  color: var(--color-base);
}

.wikitab-saved-item-tabs
  :deep(
    .cdx-tabs__header
      .cdx-tabs__list__item:enabled:not([aria-selected='true']):not([aria-selected='true']):active
  ) {
  background-color: var(--background-color-interactive-subtle--active);
  border-color: var(--border-color-interactive--active);
  color: var(--color-base);
}

.wikitab-saved-item-tabs
  :deep(.cdx-tabs__header .cdx-tabs__list__item[aria-selected='true'][aria-selected='true']) {
  background-color: var(--color-base);
  border-color: var(--border-color-transparent);
  color: var(--color-inverted);
}

.wikitab-saved-item-tabs
  :deep(
    .cdx-tabs__header .cdx-tabs__list__item[aria-selected='true'][aria-selected='true']:hover
  ) {
  background-color: var(--color-base--hover);
  border-color: var(--border-color-transparent);
  color: var(--color-inverted);
}

.wikitab-saved-item-tabs
  :deep(
    .cdx-tabs__header .cdx-tabs__list__item[aria-selected='true'][aria-selected='true']:active
  ) {
  background-color: var(--color-emphasized);
  border-color: var(--border-color-transparent);
  color: var(--color-inverted);
}
</style>
