<script setup lang="ts">
import { ref, type Component } from 'vue'
import { CdxTab, CdxTabs, CdxToastContainer } from '@wikimedia/codex'

import ButtonsSection from './sections/ButtonsSection.vue'
import FeedbackSection from './sections/FeedbackSection.vue'
import IconsSection from './sections/IconsSection.vue'
import InputsSection from './sections/InputsSection.vue'
import LayoutSection from './sections/LayoutSection.vue'
import OverlaysSection from './sections/OverlaysSection.vue'
import ColorSection from './sections/ColorSection.vue'
import TokensSection from './sections/TokensSection.vue'
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
  { id: 'tokens', label: 'Tokens' },
  { id: 'icons', label: 'Icons' },
  { id: 'components-buttons', label: 'Buttons' },
  { id: 'components-inputs', label: 'Inputs' },
  { id: 'components-feedback', label: 'Feedback' },
  { id: 'components-overlays', label: 'Overlays' },
  { id: 'components-layout', label: 'Layout' },
] as const

const sectionByTab: Record<(typeof navItems)[number]['id'], Component> = {
  typography: TypographySection,
  color: ColorSection,
  tokens: TokensSection,
  icons: IconsSection,
  'components-buttons': ButtonsSection,
  'components-inputs': InputsSection,
  'components-feedback': FeedbackSection,
  'components-overlays': OverlaysSection,
  'components-layout': LayoutSection,
}

type TabId = (typeof navItems)[number]['id']

const activeTab = ref<TabId>('typography')
</script>

<template>
  <main>
    <!-- <h1>Codex playground</h1> -->

    <CdxTabs v-model:active="activeTab" class="playground-tabs" aria-label="Sections">
      <CdxTab v-for="item in navItems" :key="item.id" :name="item.id" :label="item.label">
        <article>
          <component :is="sectionByTab[item.id]" />
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
