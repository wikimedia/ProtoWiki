<script setup lang="ts">
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconUndo } from '@wikimedia/codex-icons'

defineProps<{
  title: string
}>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <button type="button" class="return-to-article" @click="emit('click')">
    <CdxIcon class="return-to-article__icon" :icon="cdxIconUndo" />
    <span class="return-to-article__label">
      Return to <span class="return-to-article__link">{{ title }}</span>
    </span>
  </button>
</template>

<style scoped>
.return-to-article {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-base, #202122);
  cursor: pointer;
  text-align: start;
}

.return-to-article__icon :deep(.cdx-icon) {
  width: 1.125rem;
  height: 1.125rem;
  color: var(--color-base, #202122);
}

.return-to-article__link {
  color: var(--color-progressive, #36c);
}
</style>
