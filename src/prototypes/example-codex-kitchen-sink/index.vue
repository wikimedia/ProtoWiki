<script setup lang="ts">
import { ref, type Component } from 'vue'
import { CdxTab, CdxTabs, CdxToastContainer } from '@wikimedia/codex'

import { parseLeafTab, type MainTabId } from './lib/playground-tabs'
import {
  providePlaygroundLeafTab,
  syncMainTabWithLeafTab,
  usePlaygroundLeafTab,
} from './lib/use-playground-leaf-tab'

import ButtonsSection from './sections/ButtonsSection.vue'
import FeedbackSection from './sections/FeedbackSection.vue'
import IconsSection from './sections/IconsSection.vue'
import FormElementsSection from './sections/FormElementsSection.vue'
import MediaSection from './sections/MediaSection.vue'
import NavigationSection from './sections/NavigationSection.vue'
import SearchSection from './sections/SearchSection.vue'
import ContentDataSection from './sections/ContentDataSection.vue'
import ColorSection from './sections/ColorSection.vue'
import TokenSection from './sections/TokenSection.vue'
import TypographySection from './sections/TypographySection.vue'

definePage({
  meta: {
    title: 'Codex playground',
    description: 'Full Codex component, token, typography, and icon catalogue.',
  },
})

const navItems = [
  { id: 'typography', label: 'Typography' },
  { id: 'color', label: 'Color' },
  { id: 'tokens-layout', label: 'Layout' },
  { id: 'tokens-appearance', label: 'Appearance' },
  { id: 'tokens-animation', label: 'Animation' },
  { id: 'icons', label: 'Icons' },
  { id: 'components-buttons', label: 'Buttons' },
  { id: 'components-form-elements', label: 'Form elements' },
  { id: 'components-feedback', label: 'Feedback' },
  { id: 'components-content-data', label: 'Content & data' },
  { id: 'components-media', label: 'Media' },
  { id: 'components-navigation', label: 'Navigation' },
  { id: 'components-search', label: 'Search' },
] as const

const sectionByTab: Record<(typeof navItems)[number]['id'], Component> = {
  typography: TypographySection,
  color: ColorSection,
  'tokens-layout': TokenSection,
  'tokens-appearance': TokenSection,
  'tokens-animation': TokenSection,
  icons: IconsSection,
  'components-buttons': ButtonsSection,
  'components-form-elements': FormElementsSection,
  'components-feedback': FeedbackSection,
  'components-content-data': ContentDataSection,
  'components-media': MediaSection,
  'components-navigation': NavigationSection,
  'components-search': SearchSection,
}

const tokenSectionByTab: Partial<Record<(typeof navItems)[number]['id'], 'layout' | 'appearance' | 'animation'>> = {
  'tokens-layout': 'layout',
  'tokens-appearance': 'appearance',
  'tokens-animation': 'animation',
}

type TabId = MainTabId

const leafTab = usePlaygroundLeafTab()
const { subTabMemory } = providePlaygroundLeafTab(leafTab)

const activeTab = ref<TabId>(parseLeafTab(leafTab.value)?.main ?? 'typography')
syncMainTabWithLeafTab(activeTab, leafTab, subTabMemory)
</script>

<template>
  <main>
    <!-- <h1>Codex playground</h1> -->

    <CdxTabs v-model:active="activeTab" class="playground-tabs" aria-label="Sections">
      <CdxTab v-for="item in navItems" :key="item.id" :name="item.id" :label="item.label">
        <article>
          <TokenSection
            v-if="tokenSectionByTab[item.id]"
            :section="tokenSectionByTab[item.id]!"
          />
          <component v-else :is="sectionByTab[item.id]" />
        </article>
      </CdxTab>
    </CdxTabs>

    <CdxToastContainer />
  </main>
</template>

<style scoped>
main {
  /* padding: 6px 0px; */
  background-color: var(--background-color-base);
}

.playground-tabs {
  /* padding: 0px var(--spacing-100); */
  /* margin: 0px 0px; */
  /* padding: 0px 4px; */
  /* padding-top: 4px; */
  /* background-color: var(--background-color-base); */
}

.playground-tabs :deep(> .cdx-tabs__header) {
  position: sticky;
  top: 0px;
  z-index: 2;
  background-color: var(--background-color-base);
  padding-top: 4px;
  margin: 0px 0px;
  padding-left: 4px;
  padding-right: 4px;
}

article {
  /* padding: 0px 16px; */
}
</style>
