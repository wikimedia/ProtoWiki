<script setup lang="ts">
import { ref } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconBookmarkList } from '@wikimedia/codex-icons'

defineProps<{
  ariaExpanded?: boolean
}>()

const emit = defineEmits<{
  open: []
}>()

const savedButton = ref<InstanceType<typeof CdxButton> | null>(null)

defineExpose({
  focusButton(): void {
    const el = savedButton.value?.$el as HTMLElement | undefined
    el?.querySelector('button')?.focus()
  },
})
</script>

<template>
  <CdxButton
    ref="savedButton"
    class="wikitab-saved-articles-button"
    weight="quiet"
    :icon-only="true"
    aria-label="Saved"
    :aria-expanded="ariaExpanded"
    @click="emit('open')"
  >
    <CdxIcon :icon="cdxIconBookmarkList" />
  </CdxButton>
</template>

<style scoped>
.wikitab-saved-articles-button {
  flex-shrink: 0;
  width: var(--min-size-interactive-touch);
  min-width: var(--min-size-interactive-touch);
  height: var(--min-size-interactive-touch);
  min-height: var(--min-size-interactive-touch);
  border-radius: var(--border-radius-base);
}
</style>
