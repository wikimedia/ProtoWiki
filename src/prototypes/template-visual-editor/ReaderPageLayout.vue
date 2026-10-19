<script setup lang="ts">
import { computed } from 'vue'

import type { Skin } from '@/theme'

import ReaderTocSidebar from './ReaderTocSidebar.vue'
import ReaderToolsSidebar from './ReaderToolsSidebar.vue'

const props = defineProps<{
  skin: Skin
}>()

const skinClass = computed(() => (props.skin === 'mobile' ? 'minerva-skin read-mode' : 'vector-skin read-mode'))
</script>

<template>
  <div :class="skinClass">
    <div class="page-container">
      <div class="main-content-area">
        <ReaderTocSidebar />
        <div class="reader-page-layout__article">
          <slot />
        </div>
        <ReaderToolsSidebar />
      </div>
    </div>
  </div>
</template>

<style scoped>
.reader-page-layout__article {
  flex: 1;
  min-width: 0;
}

.reader-page-layout__article :deep(.article) {
  max-width: none;
  margin-inline: 0;
  padding-inline: 0;
}
</style>

<style src="./visual-editor.css"></style>
