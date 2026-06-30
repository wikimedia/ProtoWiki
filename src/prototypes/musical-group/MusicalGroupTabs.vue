<script setup lang="ts">
import { computed } from 'vue'

import type { TabId } from './data/types'

const allTabs: { id: TabId; label: string; dot?: 'blue' }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'info', label: 'Info' },
  { id: 'article', label: 'Article' },
  { id: 'images', label: 'Images', dot: 'blue' },
  { id: 'links', label: 'Links' },
]

interface Props {
  showImagesTab?: boolean
  showInfoTab?: boolean
  showLinksTab?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showImagesTab: true,
  showInfoTab: true,
  showLinksTab: true,
})

const tabs = computed(() =>
  allTabs.filter((tab) => {
    if (tab.id === 'images' && !props.showImagesTab) return false
    if (tab.id === 'info' && !props.showInfoTab) return false
    if (tab.id === 'links' && !props.showLinksTab) return false
    return true
  }),
)

const activeTab = defineModel<TabId>('activeTab', { default: 'overview' })
</script>

<template>
  <div class="musical-group-tabs-sticky">
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
  </div>
</template>

<style scoped>
.musical-group-tabs-sticky {
  position: sticky;
  top: var(--musical-group-tabs-sticky-top, 105px);
  z-index: 2;
  margin-inline: calc(-1 * var(--spacing-50));
  container-type: scroll-state;
  container-name: musical-group-tabs;
}

.musical-group-tabs {
  position: relative;
  box-sizing: border-box;
  padding-bottom: var(--spacing-50);
  background-color: var(--background-color-base);
}

.musical-group-tabs::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background-color: var(--border-color-muted);
  transform: scaleY(0);
  transform-origin: bottom center;
  transition: transform 80ms linear;
}

.musical-group-tabs::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  height: var(--spacing-50);
  background-color: var(--background-color-base);
}

.musical-group-tabs__track {
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-50);
  padding-inline: var(--spacing-50);
  overflow-x: auto;
  overscroll-behavior-x: none;
  touch-action: pan-x;
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
  border-bottom-width: 2px;
  border-right-width: 2px;
  border-radius: 4px;
  background-color: var(--background-color-base);
  color: var(--color-base);
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
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

@media (prefers-reduced-motion: reduce) {
  .musical-group-tabs::after {
    transition: none;
  }
}
</style>
