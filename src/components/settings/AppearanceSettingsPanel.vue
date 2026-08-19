<script setup lang="ts">
import { CdxField, CdxRadio } from '@wikimedia/codex'

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
    <CdxField :is-fieldset="true">
      <template #label>Color</template>
      <CdxRadio
        v-for="item in CONFIG_THEME_MENU_ITEMS"
        :key="item.value"
        v-model="theme"
        name="protowiki-theme"
        :input-value="item.value"
      >
        {{ item.label }}
      </CdxRadio>
    </CdxField>

    <CdxField :is-fieldset="true">
      <template #label>Web skin</template>
      <CdxRadio
        v-for="item in CONFIG_WEB_SKIN_MENU_ITEMS"
        :key="item.value"
        v-model="webSkin"
        name="protowiki-web-skin"
        :input-value="item.value"
      >
        {{ item.label }}
      </CdxRadio>
    </CdxField>

    <CdxField :is-fieldset="true">
      <template #label>App OS</template>
      <CdxRadio
        v-for="item in CONFIG_APP_PLATFORM_MENU_ITEMS"
        :key="item.value"
        v-model="appPlatform"
        name="protowiki-app-platform"
        :input-value="item.value"
      >
        {{ item.label }}
      </CdxRadio>
    </CdxField>
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
</style>
