<script setup lang="ts">
import { ref } from 'vue'

import { CdxPopover } from '@wikimedia/codex'

import PrototypeChromeMenuPanel from './PrototypeChromeMenuPanel.vue'

const open = ref(false)
const anchor = ref<HTMLElement | null>(null)

function toggle(): void {
  open.value = !open.value
}
</script>

<template>
  <div class="prototype-chrome-menu-popover">
    <span ref="anchor" class="prototype-chrome-menu-popover__trigger">
      <slot :open="open" :toggle="toggle" />
    </span>
    <CdxPopover
      v-model:open="open"
      :anchor="anchor"
      placement="bottom-start"
      class="prototype-chrome-menu-popover__overlay"
    >
      <PrototypeChromeMenuPanel @click.stop />
    </CdxPopover>
  </div>
</template>

<style scoped>
.prototype-chrome-menu-popover {
  display: inline-flex;
  flex-shrink: 0;
}

.prototype-chrome-menu-popover__trigger {
  display: inline-flex;
}
</style>
