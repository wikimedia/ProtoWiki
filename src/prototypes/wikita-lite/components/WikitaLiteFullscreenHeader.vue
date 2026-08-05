<script setup lang="ts">
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconClose } from '@wikimedia/codex-icons'

interface Props {
  title: string
  closeLabel?: string
}

withDefaults(defineProps<Props>(), {
  closeLabel: 'Close',
})

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <header class="wikita-lite-fullscreen-header">
    <h1 class="wikita-lite-fullscreen-header__title">{{ title }}</h1>
    <CdxButton
      class="wikita-lite-fullscreen-header__close"
      weight="quiet"
      :icon-only="true"
      :aria-label="closeLabel"
      @click="emit('close')"
    >
      <CdxIcon :icon="cdxIconClose" />
    </CdxButton>
  </header>
</template>

<style scoped>
.wikita-lite-fullscreen-header {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  gap: var(--spacing-50, 8px);
  box-sizing: border-box;
  padding: var(--spacing-100, 16px) var(--spacing-100, 16px) var(--spacing-50, 8px);
}

.wikita-lite-fullscreen-header__title {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-family: var(--font-family-system-sans, system-ui, sans-serif);
  font-size: var(--font-size-xx-large);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-xx-large);
  color: var(--color-base, #202122);
}

.wikita-lite-fullscreen-header__close {
  flex-shrink: 0;
  width: 2.75rem;
  margin-top: var(--spacing-25, 4px);
}
</style>
