<script setup lang="ts">
import { ref } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import {
  cdxIconArrowNext,
  cdxIconArrowPrevious,
  cdxIconPalette,
} from '@wikimedia/codex-icons'

defineProps<{
  ariaExpanded?: boolean
}>()

const emit = defineEmits<{
  open: []
  prev: []
  next: []
}>()

const paletteButton = ref<InstanceType<typeof CdxButton> | null>(null)

defineExpose({
  focusPalette(): void {
    const el = paletteButton.value?.$el as HTMLElement | undefined
    el?.querySelector('button')?.focus()
  },
})
</script>

<template>
  <div class="wikitab-color-theme-controls">
    <CdxButton
      class="wikitab-color-theme-button"
      weight="quiet"
      :icon-only="true"
      aria-label="Previous color theme"
      @click="emit('prev')"
    >
      <CdxIcon :icon="cdxIconArrowPrevious" />
    </CdxButton>
    <CdxButton
      ref="paletteButton"
      class="wikitab-color-theme-button wikitab-color-theme-button--palette"
      weight="quiet"
      :icon-only="true"
      aria-label="Color theme"
      :aria-expanded="ariaExpanded"
      @click="emit('open')"
    >
      <CdxIcon :icon="cdxIconPalette" />
    </CdxButton>
    <CdxButton
      class="wikitab-color-theme-button"
      weight="quiet"
      :icon-only="true"
      aria-label="Next color theme"
      @click="emit('next')"
    >
      <CdxIcon :icon="cdxIconArrowNext" />
    </CdxButton>
  </div>
</template>

<style scoped>
.wikitab-color-theme-controls {
  position: fixed;
  z-index: 5;
  right: var(--spacing-100);
  bottom: var(--spacing-100);
  display: flex;
  flex-shrink: 0;
}

.wikitab-color-theme-button {
  flex-shrink: 0;
  width: 2.75rem;
}
</style>
