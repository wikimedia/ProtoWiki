<script setup lang="ts">
import { computed } from 'vue'

import { CdxIcon } from '@wikimedia/codex'
import type { Icon } from '@wikimedia/codex-icons'

export type WikitaLiteButtonVariant = 'outlined' | 'subtle' | 'black' | 'blue'

interface Props {
  variant?: WikitaLiteButtonVariant
  icon?: Icon
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'outlined',
  icon: undefined,
  disabled: false,
})

defineEmits<{
  click: [event: MouseEvent]
}>()

defineOptions({
  inheritAttrs: false,
})

const hasIcon = computed(() => Boolean(props.icon))
</script>

<template>
  <button
    type="button"
    class="wikita-lite-button"
    :class="[
      `wikita-lite-button--${variant}`,
      { 'wikita-lite-button--has-icon': hasIcon, 'wikita-lite-button--no-icon': !hasIcon },
    ]"
    :disabled="disabled"
    v-bind="$attrs"
    @click="$emit('click', $event)"
  >
    <CdxIcon v-if="icon" :icon="icon" class="wikita-lite-button__icon" />
    <span class="wikita-lite-button__label"><slot /></span>
  </button>
</template>

<style scoped>
.wikita-lite-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-25, 4px);
  box-sizing: border-box;
  max-width: 28rem;
  min-width: 2rem;
  margin: 0;
  padding: var(--spacing-50, 8px) var(--spacing-75, 12px);
  border: 1px solid transparent;
  border-radius: 4px;
  background: var(--background-color-base, #fff);
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 1rem);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-base, #202122);
  cursor: pointer;
  overflow: hidden;
}

.wikita-lite-button--no-icon {
  padding-inline: var(--spacing-100, 16px);
}

.wikita-lite-button--outlined {
  border-color: var(--color-base, #202122);
}

.wikita-lite-button--subtle {
  border-color: var(--border-color-subtle, #c8ccd1);
}

.wikita-lite-button--black {
  border-color: var(--color-base, #202122);
  background: var(--color-base, #202122);
  color: var(--color-inverted, #fff);
}

.wikita-lite-button--blue {
  border-color: var(--border-color-progressive, #36c);
  background: var(--background-color-progressive, #36c);
  color: var(--color-inverted, #fff);
}

.wikita-lite-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wikita-lite-button__icon {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
}

.wikita-lite-button__label {
  white-space: nowrap;
}
</style>
