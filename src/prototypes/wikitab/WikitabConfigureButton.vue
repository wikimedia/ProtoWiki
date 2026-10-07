<script setup lang="ts">
import { ref } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconConfigure } from '@wikimedia/codex-icons'

defineProps<{
  ariaExpanded?: boolean
}>()

const emit = defineEmits<{
  open: []
}>()

const configureButton = ref<InstanceType<typeof CdxButton> | null>(null)

defineExpose({
  focusButton(): void {
    const el = configureButton.value?.$el as HTMLElement | undefined
    el?.querySelector('button')?.focus()
  },
})
</script>

<template>
  <CdxButton
    ref="configureButton"
    class="wikitab-configure-button"
    weight="quiet"
    :icon-only="true"
    aria-label="Configure modules"
    :aria-expanded="ariaExpanded"
    @click="emit('open')"
  >
    <CdxIcon :icon="cdxIconConfigure" />
  </CdxButton>
</template>

<style scoped>
.wikitab-configure-button {
  flex-shrink: 0;
  width: var(--min-size-interactive-touch);
  min-width: var(--min-size-interactive-touch);
  height: var(--min-size-interactive-touch);
  min-height: var(--min-size-interactive-touch);
  border-radius: var(--border-radius-base);
}
</style>
