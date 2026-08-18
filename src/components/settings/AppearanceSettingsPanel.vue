<script setup lang="ts">
import { CdxRadio } from '@wikimedia/codex'

import { useConfig } from '@/composables/useConfig'
import {
  CONFIG_APP_PLATFORM_MENU_ITEMS,
  CONFIG_THEME_MENU_ITEMS,
  CONFIG_WEB_SKIN_MENU_ITEMS,
} from '@/config'

import './settingsPanel.css'

const { theme, appPlatform, webSkin } = useConfig()
</script>

<template>
  <div class="settings-panel appearance-settings-panel">
    <div class="settings-panel__field appearance-settings-panel__group">
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

    <div class="settings-panel__field appearance-settings-panel__group">
      <span id="protowiki-web-skin-label" class="settings-panel__label">Web skin</span>
      <div
        class="appearance-settings-panel__options"
        role="radiogroup"
        aria-labelledby="protowiki-web-skin-label"
      >
        <CdxRadio
          v-for="item in CONFIG_WEB_SKIN_MENU_ITEMS"
          :key="item.value"
          v-model="webSkin"
          name="protowiki-web-skin"
          :input-value="item.value"
        >
          {{ item.label }}
        </CdxRadio>
      </div>
    </div>

    <div class="settings-panel__field appearance-settings-panel__group">
      <span id="protowiki-app-platform-label" class="settings-panel__label">App OS</span>
      <div
        class="appearance-settings-panel__options"
        role="radiogroup"
        aria-labelledby="protowiki-app-platform-label"
      >
        <CdxRadio
          v-for="item in CONFIG_APP_PLATFORM_MENU_ITEMS"
          :key="item.value"
          v-model="appPlatform"
          name="protowiki-app-platform"
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
  flex-wrap: wrap;
  align-items: stretch;
  width: auto;
  min-width: var(--size-1600);
  gap: var(--spacing-150);
}

.appearance-settings-panel__group {
  gap: var(--spacing-75);
}

.appearance-settings-panel__options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}
</style>
