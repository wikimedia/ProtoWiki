<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'

import { CdxToggleButton } from '@wikimedia/codex'

import { scrollTabIntoTrackView } from '../../musical-group/scrollTabIntoTrackView'
import type { DailyReadsTab } from '../composables/useWikitaLiteDailyReadsTabs'

const props = withDefaults(
  defineProps<{
    tabs: DailyReadsTab[]
    ariaLabel?: string
  }>(),
  {
    ariaLabel: 'Further reading filters',
  },
)

const activeTabId = defineModel<string>('activeTabId', { default: 'all' })

const trackRef = ref<HTMLElement | null>(null)

function scrollActiveTabIntoView() {
  const track = trackRef.value
  if (!track) return

  const button = track.querySelector<HTMLElement>(`[data-tab-id="${activeTabId.value}"]`)
  if (button) {
    scrollTabIntoTrackView(button, track)
  }
}

function onToggleTab(tabId: string, selected: boolean) {
  if (selected) activeTabId.value = tabId
}

watch(activeTabId, async () => {
  await nextTick()
  scrollActiveTabIntoView()
})

watch(
  () => props.tabs,
  async () => {
    await nextTick()
    scrollActiveTabIntoView()
  },
)

onMounted(() => {
  scrollActiveTabIntoView()
})
</script>

<template>
  <nav class="wikita-lite-daily-reads-tabs" :aria-label="ariaLabel">
    <div ref="trackRef" class="wikita-lite-daily-reads-tabs__track">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="wikita-lite-daily-reads-tabs__tab-wrap"
        :data-tab-id="tab.id"
      >
        <CdxToggleButton
          :model-value="activeTabId === tab.id"
          @update:model-value="onToggleTab(tab.id, $event)"
        >
          {{ tab.label }}
        </CdxToggleButton>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.wikita-lite-daily-reads-tabs {
  width: 100%;
}

.wikita-lite-daily-reads-tabs__track {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  overflow-x: auto;
  overscroll-behavior-x: none;
  touch-action: pan-x;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.wikita-lite-daily-reads-tabs__track::-webkit-scrollbar {
  display: none;
}

.wikita-lite-daily-reads-tabs__tab-wrap {
  flex: 0 0 auto;
}
</style>
