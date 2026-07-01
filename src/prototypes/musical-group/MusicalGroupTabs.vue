<script setup lang="ts">
import { computed } from 'vue'

import WikitaButton from './components/WikitaButton.vue'
import { scrollTabIntoTrackView } from './scrollTabIntoTrackView'
import type { TabId } from './data/types'

const allTabs: { id: TabId; label: string; dot?: 'blue' }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'info', label: 'Info' },
  { id: 'article', label: 'Article' },
  { id: 'images', label: 'Images', dot: 'blue' },
  { id: 'links', label: 'Links' },
]

interface Props {
  showArticleTab?: boolean
  showImagesTab?: boolean
  showImagesTabDot?: boolean
  showInfoTab?: boolean
  showLinksTab?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showArticleTab: true,
  showImagesTab: true,
  showImagesTabDot: true,
  showInfoTab: true,
  showLinksTab: true,
})

const tabs = computed(() =>
  allTabs.filter((tab) => {
    if (tab.id === 'article' && !props.showArticleTab) return false
    if (tab.id === 'images' && !props.showImagesTab) return false
    if (tab.id === 'info' && !props.showInfoTab) return false
    if (tab.id === 'links' && !props.showLinksTab) return false
    return true
  }),
)

const activeTab = defineModel<TabId>('activeTab', { default: 'overview' })

function onTabClick(tabId: TabId, event: MouseEvent) {
  activeTab.value = tabId

  const target = event.target
  const button =
    target instanceof HTMLElement ? target.closest('.wikita-button') : null
  const track = button?.closest('.musical-group-tabs__track')
  if (button instanceof HTMLElement && track instanceof HTMLElement) {
    scrollTabIntoTrackView(button, track)
  }
}
</script>

<template>
  <div class="musical-group-tabs-sticky">
    <nav class="musical-group-tabs" aria-label="Section tabs">
      <div class="musical-group-tabs__track">
        <div
          v-for="tab in tabs"
          :key="tab.id"
          class="musical-group-tabs__tab-wrap"
        >
          <WikitaButton
            :variant="activeTab === tab.id ? 'filled' : 'subtle'"
            :aria-pressed="activeTab === tab.id"
            @click="onTabClick(tab.id, $event)"
          >
            {{ tab.label }}
          </WikitaButton>
          <span
            v-if="tab.dot === 'blue' && showImagesTabDot && activeTab !== tab.id"
            class="musical-group-tabs__dot"
            aria-hidden="true"
          />
        </div>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.musical-group-tabs-sticky {
  position: sticky;
  top: var(--musical-group-tabs-sticky-top, 132px);
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

.musical-group-tabs__tab-wrap {
  position: relative;
  flex: 0 0 auto;
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
