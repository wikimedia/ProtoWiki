<script setup lang="ts">
import { CdxField } from '@wikimedia/codex'

defineProps<{
  label?: string
  doc?: string
}>()
</script>

<template>
  <CdxField :label="label">
    <template v-if="doc" #description>{{ doc }}</template>
    <slot />
  </CdxField>
</template>
