<script setup lang="ts">
import { ref } from 'vue'

import type { TabId } from './data/types'

const tabs: { id: TabId; label: string; dot?: 'blue' }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'article', label: 'Article' },
  { id: 'photos', label: 'Photos', dot: 'blue' },
  { id: 'links', label: 'Links' },
  { id: 'members', label: 'Members' },
  { id: 'awards', label: 'Awards' },
]

const activeTab = ref<TabId>('overview')
</script>

<template>
  <nav class="musical-group-tabs" aria-label="Section tabs">
    <div class="musical-group-tabs__track">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="musical-group-tabs__tab"
        :class="{ 'musical-group-tabs__tab--active': activeTab === tab.id }"
        :aria-pressed="activeTab === tab.id"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
        <span
          v-if="tab.dot === 'blue'"
          class="musical-group-tabs__dot"
          aria-hidden="true"
        />
      </button>
    </div>
  </nav>
</template>

<style scoped>
.musical-group-tabs {
  margin-inline: calc(-1 * var(--spacing-50));
}

.musical-group-tabs__track {
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-50);
  padding-inline: var(--spacing-50);
  overflow-x: auto;
  overscroll-behavior-x: none;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.musical-group-tabs__track::-webkit-scrollbar {
  display: none;
}

.musical-group-tabs__tab {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  box-sizing: border-box;
  height: 38px;
  padding: 1px var(--spacing-100);
  border: 1px solid var(--color-base);
  border-radius: 6px;
  background-color: var(--background-color-base);
  color: var(--color-base);
  font-family: var(--font-family-base);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
  white-space: nowrap;
  cursor: pointer;
}

.musical-group-tabs__tab--active {
  border-color: var(--background-color-inverted);
  background-color: var(--background-color-inverted);
  color: var(--color-inverted);
}

.musical-group-tabs__dot {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--color-progressive);
}
</style>
