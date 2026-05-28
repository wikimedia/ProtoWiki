<script setup lang="ts">
import ArticleWrapper from '@/components/ArticleWrapper.vue'
import ChromeWrapper from '@/components/ChromeWrapper.vue'

import { einsteinLifeEvents } from './einstein-events'
import PersonalLifeCarousel from './PersonalLifeCarousel.vue'

definePage({
  meta: {
    title: 'Personal life cards',
    description: 'Swipe through Albert Einstein’s life events from Wikipedia.',
  },
})
</script>

<template>
  <ChromeWrapper skin="mobile">
    <ArticleWrapper title="Albert Einstein" skin="mobile">
      <div class="personal-life-cards">
        <h2 class="personal-life-cards__heading">Personal life</h2>
        <PersonalLifeCarousel class="personal-life-cards__carousel" :events="einsteinLifeEvents" />
      </div>
    </ArticleWrapper>
  </ChromeWrapper>
</template>

<style scoped>
.personal-life-cards {
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - 14rem);
  padding: var(--spacing-100, 16px);
  padding-block-end: 0;
}

.personal-life-cards__heading {
  margin: 0;
  flex-shrink: 0;
  padding-block-end: var(--spacing-75, 12px);
  font-size: var(--font-size-x-large, 1.5rem);
  font-weight: var(--font-weight-normal, 400);
  line-height: var(--line-height-x-large, 1.375);
  border-block-end: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
}

.personal-life-cards__carousel {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
