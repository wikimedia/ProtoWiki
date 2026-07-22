<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'

import { CdxTab, CdxTabs } from '@wikimedia/codex'

import WikitaButton from './components/WikitaButton.vue'
import { useWikitaUiSkin, type WikitaUiSkin } from './composables/useWikitaUiSkin'
import { scrollTabIntoTrackView } from './scrollTabIntoTrackView'
import type { TabId } from './data/types'

const allTabs: { id: TabId; label: string; dot?: 'blue' }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'info', label: 'Info' },
  { id: 'article', label: 'Article' },
  { id: 'images', label: 'Images', dot: 'blue' },
  { id: 'links', label: 'Links' },
  { id: 'activity', label: 'Activity' },
  { id: 'contribute', label: 'Contribute' },
]

interface Props {
  showArticleTab?: boolean
  showImagesTab?: boolean
  showImagesTabDot?: boolean
  showInfoTab?: boolean
  showLinksTab?: boolean
  showActivityTab?: boolean
  showContributeTab?: boolean
  skin?: WikitaUiSkin
}

const props = withDefaults(defineProps<Props>(), {
  showArticleTab: true,
  showImagesTab: true,
  showImagesTabDot: true,
  showInfoTab: true,
  showLinksTab: true,
  showActivityTab: true,
  showContributeTab: true,
  skin: undefined,
})

const effectiveSkin = useWikitaUiSkin(() => props.skin)

const tabs = computed(() =>
  allTabs.filter((tab) => {
    if (tab.id === 'article' && !props.showArticleTab) return false
    if (tab.id === 'images' && !props.showImagesTab) return false
    if (tab.id === 'info' && !props.showInfoTab) return false
    if (tab.id === 'links' && !props.showLinksTab) return false
    if (tab.id === 'activity' && !props.showActivityTab) return false
    if (tab.id === 'contribute' && !props.showContributeTab) return false
    return true
  }),
)

const activeTab = defineModel<TabId>('activeTab', { default: 'overview' })

const trackRef = ref<HTMLElement | null>(null)
const tabsRef = ref<HTMLElement | null>(null)

function scrollActiveTabIntoView() {
  if (effectiveSkin.value === 'wikipedia') {
    const tabsEl = tabsRef.value
    if (!tabsEl) return

    const track = tabsEl.querySelector<HTMLElement>('[role="tablist"]')
    const button = tabsEl.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
    if (button && track) scrollTabIntoTrackView(button, track)
    return
  }

  const track = trackRef.value
  if (!track) return

  const button = track.querySelector<HTMLElement>(`[data-tab-id="${activeTab.value}"]`)
  if (button) scrollTabIntoTrackView(button, track)
}

function onTabClick(tabId: TabId) {
  activeTab.value = tabId
}

watch(activeTab, async () => {
  await nextTick()
  scrollActiveTabIntoView()
})

watch(tabs, async () => {
  await nextTick()
  scrollActiveTabIntoView()
})

watch(effectiveSkin, async () => {
  await nextTick()
  scrollActiveTabIntoView()
})

onMounted(() => {
  scrollActiveTabIntoView()
})
</script>

<template>
  <div class="musical-group-tabs-sticky">
    <div
      v-if="effectiveSkin === 'wikipedia'"
      ref="tabsRef"
      class="musical-group-tabs musical-group-tabs--wikipedia"
    >
      <CdxTabs
        v-model:active="activeTab"
        aria-label="Section tabs"
      >
        <CdxTab
          v-for="tab in tabs"
          :key="tab.id"
          :name="tab.id"
          :label="tab.label"
        />
      </CdxTabs>
    </div>

    <nav v-else class="musical-group-tabs" aria-label="Section tabs">
      <div ref="trackRef" class="musical-group-tabs__track">
        <div
          v-for="tab in tabs"
          :key="tab.id"
          class="musical-group-tabs__tab-wrap"
        >
          <WikitaButton
            :data-tab-id="tab.id"
            :variant="activeTab === tab.id ? 'filled' : 'subtle'"
            :aria-pressed="activeTab === tab.id"
            @click="onTabClick(tab.id)"
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

.musical-group-tabs-sticky:has(.musical-group-tabs--wikipedia) {
  margin-inline: 0;
}

.musical-group-tabs--wikipedia {
  margin-inline: var(--spacing-50);
  padding-inline: 0;
  padding-top: var(--spacing-50);
  padding-bottom: 0;
}

.musical-group-tabs--wikipedia::before,
.musical-group-tabs--wikipedia::after {
  display: none;
}

.musical-group-tabs--wikipedia :deep(.cdx-tabs) {
  display: inline-block;
  width: auto;
  max-width: 100%;
}

.musical-group-tabs--wikipedia :deep(.cdx-tabs__header) {
  margin-inline: 0;
  border-bottom: none;
  width: auto;
  max-width: 100%;
}

.musical-group-tabs--wikipedia :deep(.cdx-tabs__list) {
  width: fit-content;
  max-width: 100%;
  border-bottom: 1px solid var(--border-color-base);
  box-sizing: border-box;
}

.musical-group-tabs--wikipedia :deep(.cdx-tabs__content) {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .musical-group-tabs::after {
    transition: none;
  }
}
</style>
