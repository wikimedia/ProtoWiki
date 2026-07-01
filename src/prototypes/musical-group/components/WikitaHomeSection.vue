<script setup lang="ts">
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconNext } from '@wikimedia/codex-icons'

import type { HomeTabId } from './WikitaHomeTabs.vue'

interface Props {
  title?: string
  /** When set, the title links to this home tab (preview sections on Home). */
  toTab?: HomeTabId
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'title-navigate': [tab: HomeTabId]
}>()

function onTitleClick() {
  if (props.toTab) {
    emit('title-navigate', props.toTab)
  }
}
</script>

<template>
  <section class="wikita-home-section">
    <h2 v-if="title && !toTab" class="wikita-home-section__title">{{ title }}</h2>
    <h2 v-if="title && toTab" class="wikita-home-section__title">
      <button
        type="button"
        class="wikita-home-section__title-link"
        @click="onTitleClick"
      >
        <span class="wikita-home-section__title-text">{{ title }}</span>
        <CdxIcon :icon="cdxIconNext" class="wikita-home-section__title-arrow" />
      </button>
    </h2>
    <div class="wikita-home-section__cards">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.wikita-home-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  width: 100%;
}

/* Matches the Codex Heading 3 used for facts like "Musical group since …". */
.wikita-home-section__title {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-x-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-x-large);
  color: var(--color-base);
}

.wikita-home-section__title-link {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25);
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  text-align: start;
  font: inherit;
  color: inherit;
  -webkit-tap-highlight-color: transparent;
}

.wikita-home-section__title-text {
  flex: 0 1 auto;
}

.wikita-home-section__title-arrow {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.wikita-home-section__cards {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}
</style>
