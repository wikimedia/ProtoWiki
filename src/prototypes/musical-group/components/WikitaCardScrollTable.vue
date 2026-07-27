<script setup lang="ts">
import { useWikitaUiSkin, type WikitaUiSkin } from '../composables/useWikitaUiSkin'

interface Props {
  html: string
  caption?: string
  skin?: WikitaUiSkin
}

const props = withDefaults(defineProps<Props>(), {
  caption: undefined,
  skin: undefined,
})

const effectiveSkin = useWikitaUiSkin(() => props.skin)
</script>

<template>
  <div
    class="wikita-scroll-table"
    :class="{ 'wikita-scroll-table--wikipedia': effectiveSkin === 'wikipedia' }"
  >
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-if="caption" class="wikita-scroll-table__title" v-html="caption" />

    <div
      class="wikita-scroll-table__track"
      :class="{ 'mw-parser-output': effectiveSkin === 'wikipedia' }"
      :data-skin="effectiveSkin === 'wikipedia' ? 'mobile' : undefined"
    >
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="wikita-scroll-table__table" v-html="html" />
    </div>
  </div>
</template>

<style scoped>
.wikita-scroll-table {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
  min-width: 0;
  margin-block: calc(-1 * var(--spacing-50));
}

.wikita-scroll-table__title {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
  color: var(--color-base);
  overflow-wrap: anywhere;
}

.wikita-scroll-table__title :deep(a) {
  color: var(--color-progressive);
  text-decoration: none;
}

.wikita-scroll-table__title :deep(a:hover) {
  text-decoration: underline;
}

.wikita-scroll-table__track {
  margin-inline: calc(-1 * var(--spacing-50));
  overflow-x: auto;
  overscroll-behavior-x: none;
  touch-action: pan-x;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.wikita-scroll-table--wikipedia .wikita-scroll-table__track {
  margin-inline: 0;
}

.wikita-scroll-table__track::-webkit-scrollbar {
  display: none;
}

.wikita-scroll-table__table {
  display: inline-block;
  min-width: 0;
}

.wikita-scroll-table__table :deep(table) {
  width: max-content;
  margin: 0 var(--spacing-50);
  border-collapse: collapse;
  font-size: var(--font-size-medium);
  line-height: var(--line-height-small);
  color: var(--color-base);
}

.wikita-scroll-table--wikipedia .wikita-scroll-table__table :deep(table) {
  margin: 0;
}

.wikita-scroll-table__table :deep(caption) {
  display: none;
}

.wikita-scroll-table__table :deep(th),
.wikita-scroll-table__table :deep(td) {
  padding: var(--spacing-25) var(--spacing-50);
  border: 1px solid var(--border-color-muted);
  text-align: start;
  vertical-align: top;
}

.wikita-scroll-table__table :deep(th) {
  font-weight: var(--font-weight-bold);
  background-color: var(--background-color-interactive-subtle);
}

.wikita-scroll-table:has(.wikita-scroll-table__table table.succession-box) .wikita-scroll-table__track {
  margin-inline: 0;
  overflow-x: visible;
}

.wikita-scroll-table:has(.wikita-scroll-table__table table.succession-box) .wikita-scroll-table__table {
  display: block;
  width: 100%;
}

.wikita-scroll-table:has(.wikita-scroll-table__table table.succession-box) .wikita-scroll-table__table :deep(table) {
  width: 100%;
  margin: 0;
}

.wikita-scroll-table__table :deep(table.succession-box) {
  table-layout: fixed;
  font-size: var(--font-size-small);
  text-align: center;
}

.wikita-scroll-table__table :deep(table.succession-box td) {
  text-align: center;
  vertical-align: middle;
  font-weight: var(--font-weight-normal);
  background-color: transparent;
}

.wikita-scroll-table__table :deep(table.succession-box td:nth-child(1)) {
  width: 30%;
}

.wikita-scroll-table__table :deep(table.succession-box td:nth-child(2)) {
  width: 40%;
}

.wikita-scroll-table__table :deep(table.succession-box td:nth-child(3)) {
  width: 30%;
}

.wikita-scroll-table__table :deep(table.succession-box td div) {
  font-weight: var(--font-weight-bold);
}

.wikita-scroll-table__table :deep(table.succession-box a) {
  font-weight: var(--font-weight-bold);
}

.wikita-scroll-table__table :deep(a) {
  color: var(--color-progressive);
  text-decoration: none;
}

.wikita-scroll-table__table :deep(a:hover) {
  text-decoration: underline;
}

.wikita-scroll-table__table :deep(sup.wikita-ref) {
  font-family: var(--font-family-base);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: 0;
  vertical-align: super;
}

.wikita-scroll-table__table :deep(sup.wikita-ref a) {
  color: var(--color-progressive);
  text-decoration: none;
}
</style>
