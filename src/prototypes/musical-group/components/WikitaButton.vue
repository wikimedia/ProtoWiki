<script setup lang="ts">
import { computed } from 'vue'

import { CdxButton, CdxIcon } from '@wikimedia/codex'
import type { Icon } from '@wikimedia/codex-icons'

import { useWikitaUiSkin, type WikitaUiSkin } from '../composables/useWikitaUiSkin'

export type WikitaButtonVariant = 'subtle' | 'outlined' | 'filled'

interface Props {
  variant?: WikitaButtonVariant
  icon?: Icon
  ariaPressed?: boolean
  disabled?: boolean
  compact?: boolean
  skin?: WikitaUiSkin
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'outlined',
  icon: undefined,
  ariaPressed: undefined,
  disabled: false,
  compact: false,
  skin: undefined,
})

defineEmits<{
  click: [event: MouseEvent]
}>()

defineOptions({
  inheritAttrs: false,
})

const effectiveSkin = useWikitaUiSkin(() => props.skin)

const cdxWeight = computed(() => (props.variant === 'subtle' ? 'quiet' : 'normal'))

const cdxAction = computed(() => (props.variant === 'filled' ? 'progressive' : 'default'))
</script>

<template>
  <CdxButton
    v-if="effectiveSkin === 'wikipedia'"
    type="button"
    :weight="cdxWeight"
    :action="cdxAction"
    :aria-pressed="ariaPressed"
    :disabled="disabled"
    :class="{ 'wikita-button--compact': compact, 'wikita-button--has-icon': icon }"
    v-bind="$attrs"
    @click="$emit('click', $event)"
  >
    <CdxIcon v-if="icon" :icon="icon" />
    <slot />
  </CdxButton>

  <button
    v-else
    type="button"
    class="wikita-button"
    :class="[
      `wikita-button--${variant}`,
      { 'wikita-button--has-icon': icon, 'wikita-button--compact': compact },
    ]"
    :aria-pressed="ariaPressed"
    :disabled="disabled"
    v-bind="$attrs"
    @click="$emit('click', $event)"
  >
    <CdxIcon v-if="icon" :icon="icon" class="wikita-button__icon" />
    <span class="wikita-button__label"><slot /></span>
  </button>
</template>

<style scoped>
.wikita-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  box-sizing: border-box;
  height: 38px;
  padding: 1px var(--spacing-100);
  border: 1px solid var(--color-base);
  border-bottom-width: 2px;
  border-right-width: 2px;
  border-radius: 4px;
  background-color: var(--background-color-base);
  color: var(--color-base);
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
  white-space: nowrap;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.wikita-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.wikita-button--has-icon {
  gap: var(--spacing-25);
  padding-inline: var(--spacing-75) var(--spacing-100);
}

.wikita-button__icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  color: inherit;
}

.wikita-button__label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.wikita-button--subtle {
  border-color: var(--border-color-muted);
}

.wikita-button--subtle:not(:disabled):hover,
.wikita-button--subtle:not(:disabled):focus-visible {
  background-color: var(--background-color-interactive-subtle);
}

.wikita-button--outlined:not(:disabled):hover,
.wikita-button--outlined:not(:disabled):focus-visible {
  background-color: var(--background-color-interactive-subtle);
}

.wikita-button--filled {
  border-color: var(--background-color-inverted);
  background-color: var(--background-color-inverted);
  color: var(--color-inverted);
}

.wikita-button--compact {
  height: 32px;
  max-height: 32px;
  min-height: 32px;
  padding-block: var(--spacing-25);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-small);
}

.wikita-button--compact.wikita-button--has-icon {
  padding-inline: var(--spacing-75);
}
</style>
