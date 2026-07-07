<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'

import { scrollTabIntoTrackView } from '../scrollTabIntoTrackView'
import WikitaButton from './WikitaButton.vue'

export type HomeTabId = 'home' | 'featured' | 'trending' | 'activity' | 'contribute' | 'saved'

const allTabs: { id: HomeTabId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'featured', label: 'Featured' },
  { id: 'trending', label: 'Trending' },
  { id: 'saved', label: 'Saved' },
  { id: 'activity', label: 'Activity' },
  { id: 'contribute', label: 'Contribute' },
]

const { hasSavedPages = true } = defineProps<{
  hasSavedPages?: boolean
}>()

const visibleTabs = computed(() =>
  hasSavedPages
    ? allTabs
    : allTabs.filter(
        (tab) =>
          tab.id !== 'saved' &&
          tab.id !== 'contribute' &&
          tab.id !== 'activity',
      ),
)

const activeTab = defineModel<HomeTabId>('activeTab', { default: 'home' })

const trackRef = ref<HTMLElement | null>(null)

function scrollActiveTabIntoView() {
  const track = trackRef.value
  if (!track) return

  const button = track.querySelector<HTMLElement>(`[data-tab-id="${activeTab.value}"]`)
  if (button) {
    scrollTabIntoTrackView(button, track)
  }
}

function onTabClick(tabId: HomeTabId) {
  activeTab.value = tabId
}

watch(activeTab, async () => {
  await nextTick()
  scrollActiveTabIntoView()
})

watch(visibleTabs, async () => {
  await nextTick()
  scrollActiveTabIntoView()
})

onMounted(() => {
  scrollActiveTabIntoView()
})
</script>

<template>
  <div class="musical-group-tabs-sticky">
    <nav class="musical-group-tabs" aria-label="Home sections">
      <div ref="trackRef" class="musical-group-tabs__track">
        <WikitaButton
          v-for="tab in visibleTabs"
          :key="tab.id"
          :data-tab-id="tab.id"
          :variant="activeTab === tab.id ? 'filled' : 'subtle'"
          :aria-pressed="activeTab === tab.id"
          @click="onTabClick(tab.id)"
        >
          {{ tab.label }}
        </WikitaButton>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.musical-group-tabs-sticky {
  position: sticky;
  top: var(--musical-group-tabs-sticky-top, 48px);
  z-index: 2;
  container-type: scroll-state;
  container-name: musical-group-tabs;
}

.musical-group-tabs {
  position: relative;
  box-sizing: border-box;
  padding-bottom: calc(var(--spacing-50) + 1px);
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

@media (prefers-reduced-motion: reduce) {
  .musical-group-tabs::after {
    transition: none;
  }
}
</style>
