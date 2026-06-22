<script setup lang="ts">
import { ref } from 'vue'
import { CdxTab, CdxTabs } from '@wikimedia/codex'

export interface PlaygroundSubTabItem {
  id: string
  label: string
}

const props = defineProps<{
  items: PlaygroundSubTabItem[]
  defaultActive: string
  ariaLabel: string
}>()

const active = ref(props.defaultActive)
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
  z-index: 1;
}

.playground-sub-tabs__panel {
  padding: 0 var(--spacing-100);
}
</style>
