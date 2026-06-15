<script setup lang="ts">
import { CdxIcon, CdxToggleButton } from '@wikimedia/codex'
import { cdxIconCheck } from '@wikimedia/codex-icons'

interface Props {
  label: string
}

defineProps<Props>()

const model = defineModel<boolean>({ default: false })
</script>

<template>
  <CdxToggleButton v-model="model" class="interests-toggle-chip">
    <span class="interests-toggle-chip__label">{{ label }}</span>
    <CdxIcon
      v-if="model"
      :icon="cdxIconCheck"
      size="small"
      class="interests-toggle-chip__check"
      aria-hidden="true"
    />
  </CdxToggleButton>
</template>

<style scoped>
.interests-toggle-chip {
  min-height: 2.5rem;
  max-width: none;
  padding: var(--spacing-25, 4px) 18px;
  border-radius: 9999px;
  font-weight: var(--font-weight-normal, 400);
  gap: var(--spacing-25, 4px);
}

.interests-toggle-chip__label {
  white-space: nowrap;
}

.interests-toggle-chip__check {
  flex-shrink: 0;
  color: var(--color-base, #202122);
  margin-right: -12px;
}

.interests-toggle-chip.cdx-toggle-button--toggled-on .interests-toggle-chip__label {
  margin-left: -8px;
}

/* Unselected — all states */
.interests-toggle-chip.cdx-toggle-button--toggled-off,
.interests-toggle-chip.cdx-toggle-button--toggled-off:hover,
.interests-toggle-chip.cdx-toggle-button--toggled-off:active,
.interests-toggle-chip.cdx-toggle-button--toggled-off.cdx-toggle-button--is-active {
  background-color: var(--background-color-base, #fff);
  border-color: var(--border-color-base, #a2a9b1);
  color: var(--color-base, #202122);
  box-shadow: none;
}

/* Selected — all states */
.interests-toggle-chip.cdx-toggle-button--toggled-on,
.interests-toggle-chip.cdx-toggle-button--toggled-on:hover,
.interests-toggle-chip.cdx-toggle-button--toggled-on:focus,
.interests-toggle-chip.cdx-toggle-button--toggled-on:active,
.interests-toggle-chip.cdx-toggle-button--toggled-on.cdx-toggle-button--is-active {
  background-color: var(--background-color-progressive-subtle, #eaf3ff);
  border-color: var(--border-color-progressive, #36c);
  color: var(--color-base, #202122);
  box-shadow: none;
}
</style>
