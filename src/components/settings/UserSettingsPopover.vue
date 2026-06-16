<script setup lang="ts">
import { ref } from 'vue'

import { CdxPopover } from '@wikimedia/codex'

import UserSettingsPanel from './UserSettingsPanel.vue'

const open = ref(false)
const anchor = ref<HTMLElement | null>(null)

function toggle(): void {
  open.value = !open.value
}
</script>

<template>
  <div class="user-settings-popover">
    <span ref="anchor" class="user-settings-popover__trigger">
      <slot :open="open" :toggle="toggle" />
    </span>
    <CdxPopover
      v-model:open="open"
      :anchor="anchor"
      placement="bottom-end"
      class="user-settings-popover__overlay"
    >
      <UserSettingsPanel @click.stop />
    </CdxPopover>
  </div>
</template>

<style scoped>
.user-settings-popover {
  display: inline-flex;
  flex-shrink: 0;
}

.user-settings-popover__trigger {
  display: inline-flex;
}
</style>

<!-- Teleported popover: allow the select menu to extend past the scrollable body. -->
<style>
.user-settings-popover__overlay .cdx-popover__body {
  overflow: visible;
}
</style>
