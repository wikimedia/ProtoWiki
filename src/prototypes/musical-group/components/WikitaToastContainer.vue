<script setup lang="ts">
import { computed } from 'vue'

import { useWikitaSaveFeedback } from '../composables/useWikitaSaveFeedback'
import WikitaListsSheet from './WikitaListsSheet.vue'
import WikitaToast from './WikitaToast.vue'

const { listsSheetOpen } = useWikitaSaveFeedback()

const overlayInteractive = computed(() => listsSheetOpen.value)
</script>

<template>
  <div
    id="wikita-overlay-root"
    class="wikita-overlay-root"
    :class="{ 'wikita-overlay-root--interactive': overlayInteractive }"
  >
    <WikitaToast />
    <WikitaListsSheet />
  </div>
</template>

<style scoped>
.wikita-overlay-root {
  position: absolute;
  inset: 0;
  left: 0;
  right: 0;
  width: 100%;
  max-width: 412px;
  margin-inline: auto;
  overflow: hidden;
  pointer-events: none;
  z-index: var(--z-index-toast-notification, 900);
}

.wikita-overlay-root--interactive {
  pointer-events: auto;
}
</style>
