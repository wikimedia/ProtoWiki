<script setup lang="ts">
import { computed } from 'vue'

import { CdxChipInput, type ChipInputItem } from '@wikimedia/codex'

const props = defineProps<{
  interests: string[]
}>()

const emit = defineEmits<{
  remove: [title: string]
}>()

const chipItems = computed<ChipInputItem[]>(() =>
  props.interests.map((value) => ({ value })),
)

function onChipsUpdate(next: ChipInputItem[]) {
  const nextKeys = new Set(next.map((chip) => String(chip.value).toLowerCase()))
  for (const title of props.interests) {
    if (!nextKeys.has(title.toLowerCase())) {
      emit('remove', title)
    }
  }
}
</script>

<template>
  <CdxChipInput
    v-if="interests.length"
    class="wikita-lite-interest-chips"
    :input-chips="chipItems"
    :chip-validator="() => false"
    @update:input-chips="onChipsUpdate"
  />
</template>

<style scoped>
.wikita-lite-interest-chips :deep(.cdx-chip-input) {
  min-height: 0;
}

.wikita-lite-interest-chips :deep(.cdx-chip-input__chips) {
  min-width: 0;
  min-height: 0;
  padding: 0;
  border: none;
  background-color: transparent;
}

.wikita-lite-interest-chips :deep(.cdx-chip-input__input) {
  display: none;
}
</style>
