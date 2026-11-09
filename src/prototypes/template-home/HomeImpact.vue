<script setup lang="ts">
/**
 * "Your impact", as the Newcomer Homepage template draws it, and its states per
 * Mock user (new → empty, experienced → fixtures, real → live). Standalone, so
 * without the template's own card and title: the Home's module heading sits
 * above, and the content gets a card frame. The desktop layout on every skin: the
 * template's mobile one is a link card to an Impact page this template doesn't have.
 */
import { watch } from 'vue'

import ImpactModule from '../template-homepage/ImpactModule.vue'
import { useHomepageImpact } from '../template-homepage/useHomepageImpact'

const { impactDesktopProps, onImpactRefresh } = useHomepageImpact()

/*
 * PROTOWIKI+ (Home) useHomepageImpact: a real user's impact waits behind a
 * "Load" prompt. Here it loads by itself — on page load, and whenever the
 * preset or username changes (`?user=real&realUser=…`) to one with nothing cached.
 */
watch(
  () => impactDesktopProps.value.loadPending && !impactDesktopProps.value.refreshing,
  (ready) => {
    if (ready) onImpactRefresh()
  },
  { immediate: true },
)
</script>

<template>
  <div class="home-impact">
    <ImpactModule standalone v-bind="impactDesktopProps" @refresh="onImpactRefresh" />
  </div>
</template>

<style scoped>
/* A Codex card's frame (`CdxCard`). */
.home-impact {
  overflow: hidden;
  border: var(--border-width-base) var(--border-style-base) var(--border-color-base);
  border-radius: var(--border-radius-base);
  padding: var(--spacing-75);
  background-color: var(--background-color-base);
}

/*
 * PROTOWIKI+ (Home) The template's stats band and empty-state illustration run
 * to the card's edges (out of its padding); the rest keeps it.
 */
.home-impact :deep(.impact-module__desktop-stats) {
  margin-top: calc(-1 * var(--spacing-75));
  margin-inline: calc(-1 * var(--spacing-75));
  /* The empty state's band too (the template greys it), like the filled grid. */
  background-color: var(--background-color-progressive-subtle);
}

/* The lines between stats are thick gaps in the band, in the card's own colour (both states). */
.home-impact :deep(.impact-module__desktop-stat-divider) {
  width: var(--border-width-thick);
  background-color: var(--border-color-inverted);
}

.home-impact :deep(.impact-module__desktop-stat--border-left) {
  border-left-width: var(--border-width-thick);
  border-left-color: var(--border-color-inverted);
}

.home-impact :deep(.impact-module__desktop-stat--border-top) {
  border-top-width: var(--border-width-thick);
  border-top-color: var(--border-color-inverted);
}

/* Empty: the illustration's band follows the stats straight on, on a subtle grey. */
.home-impact :deep(.impact-module__desktop-stats:has(+ .impact-module__desktop-empty-body)) {
  margin-bottom: 0;
}

.home-impact :deep(.impact-module__desktop-empty-body) {
  margin-inline: calc(-1 * var(--spacing-75));
  margin-bottom: var(--spacing-75);
  padding: var(--spacing-100) var(--spacing-75);
  background-color: var(--background-color-interactive-subtle);
}

/*
 * PROTOWIKI+ (Home) Most viewed: a long title stops at two lines, with an
 * ellipsis. Two 20px lines are the 40px thumbnail's height, so a wrapped title
 * doesn't make its row taller than the others.
 */
.home-impact :deep(.impact-module__most-viewed-title-link) {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  line-height: 20px;
}
</style>
