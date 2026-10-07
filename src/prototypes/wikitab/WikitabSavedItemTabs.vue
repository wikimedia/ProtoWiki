<script setup lang="ts">
import { CdxToggleButton } from '@wikimedia/codex'

import type { WikitabSavedItemTab } from './data/wikitabSavedItemTabs'

defineProps<{
  tabs: { name: WikitabSavedItemTab; label: string }[]
}>()

const activeTab = defineModel<WikitabSavedItemTab>('active', { required: true })

function onTabUpdate(name: WikitabSavedItemTab, selected: boolean): void {
  if (selected) {
    activeTab.value = name
  }
}
</script>

<template>
  <div
    class="wikitab-saved-item-tabs"
    role="tablist"
  >
    <CdxToggleButton
      v-for="tab in tabs"
      :key="tab.name"
      role="tab"
      size="small"
      :model-value="activeTab === tab.name"
      :aria-selected="activeTab === tab.name"
      @update:model-value="(selected) => onTabUpdate(tab.name, selected)"
    >
      {{ tab.label }}
    </CdxToggleButton>
  </div>
</template>

<style scoped>
.wikitab-saved-item-tabs {
  display: flex;
  flex-wrap: nowrap;
  gap: var(--spacing-25);
  width: 100%;
  margin-bottom: var(--spacing-50);
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  /*
   * Room for the 1px hover/focus outline — overflow clips box-shadow at the
   * scrollport edge without this padding.
   */
  padding-block: var(--border-width-base);
  padding-inline: var(--border-width-base);
  scroll-padding-inline: var(--border-width-base);
}

.wikitab-saved-item-tabs::-webkit-scrollbar {
  display: none;
}

/* Framed small toggle buttons ship bold; Wikitab tabs stay regular weight. */
.wikitab-saved-item-tabs :deep(.cdx-toggle-button) {
  flex: 0 0 auto;
  font-weight: var(--font-weight-normal);
}

/*
 * Stock Codex shrinks small toggle height but keeps medium type; patched Codex
 * adds --font-size-small here — mirror that so tabs read compact on stock too.
 */
.wikitab-saved-item-tabs :deep(.cdx-toggle-button--size-small) {
  font-size: var(--font-size-small, 0.875rem);
}

/*
 * Codex framed toggled-on uses progressive (blue); Saved tabs use inverted black.
 * Unselected state stays stock Codex — only remap the on state and its interactions.
 */
.wikitab-saved-item-tabs
  :deep(.cdx-toggle-button--framed.cdx-toggle-button--toggled-on:enabled) {
  background-color: var(--background-color-inverted);
  color: var(--color-inverted);
  border-color: var(--border-color-transparent);
  box-shadow: none;
}

.wikitab-saved-item-tabs
  :deep(.cdx-toggle-button--framed.cdx-toggle-button--toggled-on:enabled:hover) {
  background-color: var(--background-color-inverted);
  color: var(--color-inverted);
  border-color: var(--border-color-transparent);
}

.wikitab-saved-item-tabs
  :deep(.cdx-toggle-button--framed.cdx-toggle-button--toggled-on:enabled:focus-visible) {
  background-color: var(--background-color-inverted);
  color: var(--color-inverted);
  border-color: var(--border-color-transparent);
  box-shadow:
    0 0 0 1px var(--box-shadow-color-emphasized),
    inset 0 0 0 1px var(--box-shadow-color-inverted);
}

.wikitab-saved-item-tabs
  :deep(
    .cdx-toggle-button--framed.cdx-toggle-button--toggled-on:enabled:active
  ),
.wikitab-saved-item-tabs
  :deep(
    .cdx-toggle-button--framed.cdx-toggle-button--toggled-on:enabled.cdx-toggle-button--is-active
  ) {
  background-color: var(--background-color-inverted);
  color: var(--color-inverted);
  border-color: var(--border-color-transparent);
  box-shadow: inset 0 0 0 1px var(--box-shadow-color-emphasized);
}
</style>
