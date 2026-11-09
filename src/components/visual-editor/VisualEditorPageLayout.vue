<script setup lang="ts">
import type { Skin } from '@/theme'

defineProps<{
  sidebarOpen: boolean
  editing: boolean
  skin: Skin
}>()
</script>

<template>
  <div
    class="ve-page"
    :class="{ 've-page--sidebar': sidebarOpen, 've-page--editing': editing }"
    :data-skin="skin"
  >
    <slot />
  </div>
</template>

<style scoped>
/*
 * Desktop with suggestions: the article column (title, tabs, toolbar, content)
 * keeps its reading width and moves left; the 325px sidebar sits outside it,
 * 24px to the right.
 */
.ve-page--sidebar :deep(.article[data-skin='desktop']) {
  --ve-sidebar-room: calc(325px + 24px);
  max-width: min(
    calc(984px + 2 * var(--spacing-100, 16px)),
    calc(100% - var(--ve-sidebar-room) - 32px)
  );
  margin-inline-start: max(
    16px,
    calc((100% - (984px + 2 * var(--spacing-100, 16px)) - var(--ve-sidebar-room)) / 2)
  );
  margin-inline-end: auto;
  transition: margin 250ms ease;
}

.ve-page :deep(.mw-editsection) {
  margin-inline-start: 13px;
  font-family: var(--font-family-base, sans-serif);
  font-size: 0.8125rem;
  font-weight: var(--font-weight-normal, 400);
  line-height: 1;
  white-space: nowrap;
  vertical-align: baseline;
  unicode-bidi: isolate;
}

.ve-page :deep(.mw-editsection-bracket) {
  color: var(--color-base, #202122);
}

.ve-page :deep(.mw-editsection a) {
  color: var(--color-progressive, #36c);
  text-decoration: none;
}

.ve-page :deep(.mw-editsection a:hover) {
  text-decoration: underline;
}

.ve-page--editing :deep(.article-header__tagline) {
  display: none;
}

.ve-page[data-skin='mobile'] :deep(.protowiki-mobile-h2--collapsed .protowiki-mobile-h2__edit) {
  display: none;
}

.ve-page--editing[data-skin='mobile'] :deep(.article-header) {
  display: none;
}

.ve-page--editing[data-skin='mobile'] :deep(.article) {
  padding-top: 48px;
  overflow-x: clip;
}

.ve-page--editing[data-skin='mobile'] :deep(.ve-editor__surface table) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
}

.ve-page--sidebar {
  overflow-x: clip;
}
</style>
