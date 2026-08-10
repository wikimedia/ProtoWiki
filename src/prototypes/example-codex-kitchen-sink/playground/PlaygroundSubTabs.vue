<script setup lang="ts">
import { computed } from 'vue'
import { CdxTab, CdxTabs } from '@wikimedia/codex'

import type { MainTabId } from '../lib/playground-tabs'
import { usePlaygroundLeafTabContext } from '../lib/use-playground-leaf-tab'

export interface PlaygroundSubTabItem {
  id: string
  label: string
}

const props = defineProps<{
  items: PlaygroundSubTabItem[]
  mainTabId: MainTabId
  defaultActive: string
  ariaLabel: string
}>()

const playgroundTab = usePlaygroundLeafTabContext()

const active = computed({
  get: () => playgroundTab?.subTabFor(props.mainTabId) ?? props.defaultActive,
  set: (value: string) => playgroundTab?.setSubTab(props.mainTabId, value),
})
</script>

<template>
  <CdxTabs v-model:active="active" class="playground-sub-tabs" :aria-label="ariaLabel" framed>
    <CdxTab v-for="item in items" :key="item.id" :name="item.id" :label="item.label">
      <div class="playground-sub-tabs__panel">
        <slot :id="item.id" :label="item.label" :item="item" />
      </div>
    </CdxTab>
  </CdxTabs>
</template>

<style scoped>
.playground-sub-tabs :deep(> .cdx-tabs__header) {
  position: sticky;
  top: 35px;
  z-index: 2;
}

.playground-sub-tabs__panel {
  padding: 0 var(--spacing-100);
}
</style>
