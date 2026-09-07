<script setup lang="ts">
import { computed } from 'vue'

import { CdxButton, CdxIcon } from '@wikimedia/codex'
import type { Icon } from '@wikimedia/codex-icons'

import { useWikitaUiSkin, type WikitaUiSkin } from '../composables/useWikitaUiSkin'

type WikitaIconFrame =
  | 'menu'
  | 'search'
  | 'bell'
  | 'user'
  | 'history'
  | 'talk'
  | 'edit'

interface Props {
  icon: Icon
  frame: WikitaIconFrame
  size?: 18 | 20
  skin?: WikitaUiSkin
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 20,
  skin: undefined,
  ariaLabel: undefined,
})

defineEmits<{
  click: [event: MouseEvent]
}>()

const effectiveSkin = useWikitaUiSkin(() => props.skin)

const frameClass = computed(() => `wikita-icon--${props.frame}`)

const sizeStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}))
</script>

<template>
  <CdxButton
    v-if="effectiveSkin === 'wikipedia'"
    weight="quiet"
    :aria-label="ariaLabel"
    class="wikita-icon-wikipedia"
    @click="$emit('click', $event)"
  >
    <CdxIcon :icon="icon" />
  </CdxButton>

  <span
    v-else
    class="wikita-icon"
    :class="frameClass"
    :style="sizeStyle"
  >
    <CdxIcon :icon="icon" />
  </span>
</template>

<style scoped>
.wikita-icon-wikipedia {
  min-width: 32px;
  min-height: 32px;
}

.wikita-icon {
  position: relative;
  display: block;
  flex-shrink: 0;
}

.wikita-icon :deep(.cdx-icon) {
  position: absolute;
  box-sizing: border-box;
  min-width: 0 !important;
  min-height: 0 !important;
  width: auto !important;
  height: auto !important;
}

.wikita-icon :deep(.cdx-icon svg) {
  display: block;
  fill: currentColor;
  width: 100%;
  height: 100%;
}

.wikita-icon--menu :deep(.cdx-icon) {
  inset: 15% 5%;
}

.wikita-icon--search :deep(.cdx-icon) {
  inset: 5% 6.46% 6.46% 5%;
}

.wikita-icon--bell :deep(.cdx-icon) {
  inset: 0 15%;
}

.wikita-icon--user :deep(.cdx-icon) {
  inset: 5% 10%;
}

.wikita-icon--history :deep(.cdx-icon) {
  inset: 5%;
}

.wikita-icon--talk :deep(.cdx-icon) {
  inset: 10% 5% 3.4% 5%;
}

.wikita-icon--edit :deep(.cdx-icon) {
  inset: 1.79% 1.88% 3.33% 3.2%;
}
</style>
