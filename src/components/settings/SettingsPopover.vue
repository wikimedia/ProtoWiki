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
  <div class="settings-popover">
    <span ref="anchor" class="settings-popover__trigger">
      <slot :open="open" :toggle="toggle" />
    </span>
    <CdxPopover
      v-model:open="open"
      :anchor="anchor"
      placement="bottom-end"
      :use-bottom-sheet="true"
      class="settings-popover__overlay"
    >
      <div @click.stop>
        <slot name="panel" />
      </div>
    </CdxPopover>
  </div>
</template>

<style scoped>
.settings-popover {
  display: inline-flex;
  flex-shrink: 0;
}

.settings-popover__trigger {
  display: inline-flex;
}
</style>

<!-- Teleported popover: allow the select menu to extend past the scrollable body. -->
<style>
.settings-popover__overlay .cdx-popover__body {
  overflow: visible;
}
</style>
