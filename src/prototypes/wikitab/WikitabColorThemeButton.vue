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
  --wikitab-color-controls-inset: var(--spacing-100);

  position: fixed;
  z-index: 5;
  right: var(--wikitab-color-controls-inset);
  bottom: var(--wikitab-color-controls-inset);
  box-sizing: border-box;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  height: 2.75rem;
  border-radius: 2px;
  overflow: hidden;
  background-color: var(--wikitab-theme-bg, var(--background-color-base));
}

/*
 * Below Codex desktop minimum (1120px — `--min-width-breakpoint-desktop`): subtle border.
 * Media queries cannot use `var()`; literal matches VectorChromeHeader / token value.
 */
@media (max-width: 1120px) {
  .wikitab-color-theme-controls {
    border: var(--border-width-base, 1px) solid
      var(--wikitab-theme-border, var(--border-color-subtle));
  }
}

/* Mobile + compact desktop (≤767px): tighter corner inset. */
@media (max-width: 767px) {
  .wikitab-color-theme-controls {
    --wikitab-color-controls-inset: var(--spacing-50);
  }
}

.wikitab-color-theme-button {
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
}
</style>
