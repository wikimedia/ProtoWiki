<script setup lang="ts">
import { CdxIcon } from '@wikimedia/codex'
import type { Icon } from '@wikimedia/codex-icons'

defineProps<{
  icon?: Icon
}>()
</script>

<template>
  <div class="wikita-lite-supporting-row">
    <CdxIcon v-if="icon" :icon="icon" size="small" />
    <span class="wikita-lite-supporting-row__text">
      <slot />
    </span>
  </div>
</template>
