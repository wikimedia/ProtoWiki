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
  width: 2.75rem;
  min-width: 2.75rem;
  height: 2.75rem;
  min-height: 2.75rem;
  border-radius: 2px;
}
</style>
