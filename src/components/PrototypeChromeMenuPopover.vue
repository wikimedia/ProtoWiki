<script setup lang="ts">
import { ref } from 'vue'

import { CdxPopover } from '@wikimedia/codex'

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
      <div @click.stop>
        <slot name="panel" />
      </div>
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

<!-- Teleported popover: allow the select menu to extend past the scrollable body. -->
<style>
.prototype-chrome-menu-popover__overlay .cdx-popover__body {
  overflow: visible;
}
</style>
