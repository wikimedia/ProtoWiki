<script setup lang="ts">
import { CdxRadio } from '@wikimedia/codex'

import { useConfig } from '@/composables/useConfig'
import { CONFIG_THEME_MENU_ITEMS } from '@/config'

import './settingsPanel.css'

const { theme } = useConfig()
</script>

<template>
  <div class="settings-panel appearance-settings-panel">
    <div class="settings-panel__field appearance-settings-panel__color">
      <span id="protowiki-color-label" class="settings-panel__label">Color</span>
      <div
        class="appearance-settings-panel__options"
        role="radiogroup"
        aria-labelledby="protowiki-color-label"
      >
        <CdxRadio
          v-for="item in CONFIG_THEME_MENU_ITEMS"
          :key="item.value"
          v-model="theme"
          name="protowiki-theme"
          :input-value="item.value"
        >
          {{ item.label }}
        </CdxRadio>
      </div>
    </div>
  </div>
</template>

<style scoped>
.appearance-settings-panel {
  display: inline-flex;
  align-items: stretch;
  width: auto;
  min-width: var(--size-1600);
}

.appearance-settings-panel__color {
  gap: var(--spacing-75);
}

.appearance-settings-panel__options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}
</style>
