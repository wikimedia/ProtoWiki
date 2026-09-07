<script setup lang="ts">
import { useWikitaUiSkin, type WikitaUiSkin } from '../composables/useWikitaUiSkin'

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
  <div
    class="wikita-sidebar"
    :class="{
      'wikita-sidebar--wikipedia': effectiveSkin === 'wikipedia',
      'mw-parser-output': effectiveSkin === 'wikipedia',
    }"
    :data-skin="effectiveSkin === 'wikipedia' ? 'mobile' : undefined"
  >
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="wikita-sidebar__inner" v-html="html" />
  </div>
</template>

<style scoped>
.wikita-sidebar {
  min-width: 0;
  margin-block: calc(-1 * var(--spacing-50));
}

.wikita-sidebar--wikipedia {
  margin-block: 0;
}

.wikita-sidebar__inner :deep(table.sidebar) {
  box-sizing: border-box;
  width: 100%;
  clear: both;
  float: none;
  margin: 0;
  padding: var(--spacing-25);
  border: 1px solid var(--border-color-muted);
  border-collapse: collapse;
  display: table;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  text-align: center;
  color: var(--color-base);
  background-color: var(--background-color-neutral-subtle);
}

.wikita-sidebar--wikipedia .wikita-sidebar__inner :deep(table.sidebar) {
  border-color: var(--border-color-base);
}

.wikita-sidebar__inner :deep(.sidebar td),
.wikita-sidebar__inner :deep(.sidebar th) {
  padding: 0;
  border: none;
  vertical-align: top;
}

.wikita-sidebar__inner :deep(.sidebar td.sidebar-navbar) {
  padding: 0 var(--spacing-50) var(--spacing-25);
  font-size: var(--font-size-small);
  text-align: end;
}

.wikita-sidebar__inner :deep(.sidebar-pretitle) {
  padding: var(--spacing-50) var(--spacing-50) 0;
  line-height: var(--line-height-small);
}

.wikita-sidebar__inner :deep(.sidebar-title),
.wikita-sidebar__inner :deep(.sidebar-title-with-pretitle) {
  padding: var(--spacing-25) var(--spacing-100);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
}

.wikita-sidebar__inner :deep(.sidebar-title-with-pretitle) {
  padding: var(--spacing-25) var(--spacing-50);
}

.wikita-sidebar__inner :deep(.sidebar-top-image) {
  padding: var(--spacing-50);
}

.wikita-sidebar__inner :deep(.sidebar-image) {
  padding: var(--spacing-25) var(--spacing-50) var(--spacing-50);
}

.wikita-sidebar__inner :deep(.sidebar-heading) {
  padding: var(--spacing-25) var(--spacing-50);
  font-weight: var(--font-weight-bold);
}

.wikita-sidebar__inner :deep(.sidebar-content) {
  padding: 0 var(--spacing-50) var(--spacing-50);
}

.wikita-sidebar__inner :deep(.sidebar-content-with-subgroup) {
  padding: var(--spacing-25) var(--spacing-50) var(--spacing-25);
}

.wikita-sidebar__inner :deep(.sidebar-above),
.wikita-sidebar__inner :deep(.sidebar-below) {
  padding: var(--spacing-50) var(--spacing-100);
  font-weight: var(--font-weight-bold);
}

.wikita-sidebar__inner :deep(.sidebar-list-title) {
  padding: 0 var(--spacing-50);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
  text-align: start;
}

.wikita-sidebar__inner :deep(.sidebar-list-title-c) {
  padding: 0 var(--spacing-50);
  margin: 0 var(--spacing-200);
  text-align: center;
}

.wikita-sidebar__inner :deep(.sidebar-content ul),
.wikita-sidebar__inner :deep(.sidebar-content ol),
.wikita-sidebar__inner :deep(.sidebar-below ul),
.wikita-sidebar__inner :deep(.sidebar-below ol),
.wikita-sidebar__inner :deep(.sidebar-above ul),
.wikita-sidebar__inner :deep(.sidebar-above ol) {
  margin: 0;
  padding: 0;
  list-style: none;
}

.wikita-sidebar__inner :deep(.sidebar-below),
.wikita-sidebar__inner :deep(.sidebar-above) {
  text-align: center;
}

.wikita-sidebar__inner :deep(.sidebar-below li),
.wikita-sidebar__inner :deep(.sidebar-above li) {
  display: inline;
  margin: 0;
}

.wikita-sidebar__inner :deep(.sidebar.hlist .sidebar-content li) {
  display: inline;
  margin: 0;
}

.wikita-sidebar__inner :deep(.sidebar.hlist .sidebar-content li::after) {
  content: none;
}

.wikita-sidebar__inner :deep(.sidebar img) {
  height: auto;
  max-width: 100%;
}

.wikita-sidebar__inner :deep(.sidebar a) {
  color: var(--color-progressive);
  text-decoration: none;
}

.wikita-sidebar__inner :deep(.sidebar a:hover) {
  text-decoration: underline;
}

.wikita-sidebar__inner :deep(.human-growth-dev-sidebar .sidebar-title-with-pretitle) {
  background-color: var(--background-color-progressive-subtle--active);
}

.wikita-sidebar__inner :deep(.human-growth-dev-sidebar .sidebar-heading) {
  background-color: var(--background-color-progressive-subtle--hover);
}

.wikita-sidebar__inner :deep(.human-growth-dev-sidebar .sidebar-below) {
  border-top: 1px solid var(--border-color-muted);
  border-bottom: 1px solid var(--border-color-muted);
}

.wikita-sidebar__inner :deep(.sidebar .navbar) {
  display: inline;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
}

.wikita-sidebar__inner :deep(.sidebar .navbar ul) {
  display: inline-block;
  margin: 0;
  padding: 0;
  list-style: none;
  white-space: nowrap;
  line-height: inherit;
}

.wikita-sidebar__inner :deep(.sidebar .navbar li) {
  display: inline;
  margin: 0;
}

.wikita-sidebar__inner :deep(.sidebar .navbar.hlist li::after) {
  content: ' · ';
  font-weight: var(--font-weight-bold);
}

.wikita-sidebar__inner :deep(.sidebar .navbar.hlist li:last-child::after) {
  content: none;
}

.wikita-sidebar__inner :deep(.sidebar .navbar-mini abbr) {
  font-variant: small-caps;
  border-bottom: none;
  text-decoration: none;
  cursor: inherit;
}

.wikita-sidebar__inner :deep(sup.wikita-ref) {
  font-family: var(--font-family-base);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: 0;
  vertical-align: super;
}

.wikita-sidebar__inner :deep(sup.wikita-ref a) {
  color: var(--color-progressive);
  text-decoration: none;
}
</style>
