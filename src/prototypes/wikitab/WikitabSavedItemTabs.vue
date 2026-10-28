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

.wikitab-saved-item-tabs :deep(.cdx-toggle-button) {
  flex: 0 0 auto;
}
</style>
