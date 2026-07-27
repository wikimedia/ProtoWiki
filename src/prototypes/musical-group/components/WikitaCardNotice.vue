<script setup lang="ts">
import { CdxMessage } from '@wikimedia/codex'

import { useWikitaUiSkin, type WikitaUiSkin } from '../composables/useWikitaUiSkin'
import WikitaCardWrapper from './WikitaCardWrapper.vue'

interface Props {
  html: string
  skin?: WikitaUiSkin
}

const props = withDefaults(defineProps<Props>(), {
  skin: undefined,
})

const effectiveSkin = useWikitaUiSkin(() => props.skin)
</script>

<template>
  <CdxMessage
    v-if="effectiveSkin === 'wikipedia'"
    type="notice"
    :allow-user-dismiss="false"
    class="wikita-card-notice-wikipedia"
  >
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="wikita-card-notice-wikipedia__inner" v-html="html" />
  </CdxMessage>

  <div v-else class="wikita-article-notice">
    <WikitaCardWrapper>
      <div class="wikita-card-notice">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-html="html" />
      </div>
    </WikitaCardWrapper>
  </div>
</template>

<style scoped>
.wikita-card-notice {
  min-width: 0;
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.wikita-card-notice :deep(.wikita-notice__row) {
  display: flex;
  gap: var(--spacing-100);
  align-items: flex-start;
}

.wikita-card-notice :deep(.wikita-notice__icon) {
  flex: 0 0 auto;
  padding-top: var(--spacing-25);
  line-height: 0;
}

.wikita-card-notice :deep(.wikita-notice__icon img) {
  display: block;
  width: 32px;
  height: auto;
}

.wikita-card-notice :deep(.wikita-notice__text) {
  flex: 1;
  min-width: 0;
}

.wikita-card-notice :deep(a) {
  color: var(--color-progressive);
  text-decoration: none;
}

.wikita-card-notice :deep(a:hover) {
  text-decoration: underline;
}

.wikita-card-notice :deep(.date-container) {
  color: var(--color-subtle);
}

.wikita-card-notice-wikipedia__inner {
  min-width: 0;
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
}

.wikita-card-notice-wikipedia__inner :deep(a) {
  color: var(--color-progressive);
  text-decoration: none;
}

.wikita-card-notice-wikipedia__inner :deep(a:hover) {
  text-decoration: underline;
}
</style>
