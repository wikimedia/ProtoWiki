<script setup lang="ts">
import { CdxSelect } from '@wikimedia/codex'

import {
  EDIT_SUGGESTION_SOURCE_MENU_ITEMS,
  useDashpageSettings,
} from './useDashpageSettings'

const { editSuggestionSource } = useDashpageSettings()
</script>

<template>
  <div class="dashpage-main-menu-panel">
    <label class="dashpage-main-menu-panel__field">
      <span class="dashpage-main-menu-panel__label">Edit suggestion source</span>
      <CdxSelect
        v-model:selected="editSuggestionSource"
        :menu-items="EDIT_SUGGESTION_SOURCE_MENU_ITEMS"
        default-label="Structured tasks"
      />
    </label>
  </div>
</template>

<style scoped>
.dashpage-main-menu-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  min-width: 22rem;
}

.dashpage-main-menu-panel__field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
}

.dashpage-main-menu-panel__label {
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  color: var(--color-subtle);
}
</style>
