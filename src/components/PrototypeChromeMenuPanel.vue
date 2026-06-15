<script setup lang="ts">
import { CdxButton, CdxSelect } from '@wikimedia/codex'

import {
  MICROTASK_SOURCE_MENU_ITEMS,
  MORELIKE_STRATEGY_MENU_ITEMS,
  usePrototypeDevSettings,
} from '@/composables/usePrototypeDevSettings'
import {
  clearAllInterests,
  useInterestsSettings,
} from '@/prototypes/template-homepage/suggested-edits/data/useInterestsSettings'

const { morelikeStrategy, microtaskSource } = usePrototypeDevSettings()
const interestsSettings = useInterestsSettings()

function onClearInterests(): void {
  clearAllInterests(interestsSettings.value)
}
</script>

<template>
  <div class="prototype-chrome-menu-panel">
    <p class="prototype-chrome-menu-panel__title">Prototype settings</p>
    <p class="prototype-chrome-menu-panel__hint">
      Dev-only controls for suggested-edits morelike search and microtask assignment.
    </p>

    <label class="prototype-chrome-menu-panel__field">
      <span class="prototype-chrome-menu-panel__label">Morelike strategy</span>
      <CdxSelect
        v-model:selected="morelikeStrategy"
        :menu-items="MORELIKE_STRATEGY_MENU_ITEMS"
        default-label="Serial multi-call"
      />
    </label>

    <label class="prototype-chrome-menu-panel__field">
      <span class="prototype-chrome-menu-panel__label">Microtask source</span>
      <CdxSelect
        v-model:selected="microtaskSource"
        :menu-items="MICROTASK_SOURCE_MENU_ITEMS"
        default-label="Microtask Generator API"
      />
    </label>

    <div class="prototype-chrome-menu-panel__section">
      <CdxButton @click="onClearInterests">Clear interests</CdxButton>
    </div>
  </div>
</template>

<style scoped>
.prototype-chrome-menu-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
  min-width: 16rem;
  max-width: 20rem;
  padding: var(--spacing-100, 16px);
}

.prototype-chrome-menu-panel__title {
  margin: 0;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
}

.prototype-chrome-menu-panel__hint {
  margin: 0;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base--subtle, #54595d);
}

.prototype-chrome-menu-panel__field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
}

.prototype-chrome-menu-panel__label {
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
}

.prototype-chrome-menu-panel__section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-50, 8px);
}
</style>

<!-- Teleported popover: allow the select menu to extend past the scrollable body. -->
<style>
.prototype-chrome-menu-popover__overlay .cdx-popover__body {
  overflow: visible;
}
</style>
