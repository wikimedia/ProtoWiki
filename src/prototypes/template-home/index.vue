<script setup lang="ts">
import { computed } from 'vue'
import { cdxIconHome } from '@wikimedia/codex-icons'

import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import { useConfig } from '@/composables/useConfig'
import { globalSkin } from '@/theme'
import HomeImpact from './HomeImpact.vue'
import HomePageHeader from './HomePageHeader.vue'
import HomeSectionFrame from './HomeSectionFrame.vue'

definePage({
  meta: {
    title: 'Home',
    description: 'Template for prototyping Home.',
    category: 'template',
    platform: 'web',
    order: 5.5,
    icon: cdxIconHome,
  },
})

const { pageTitle } = useConfig()

/* Desktop: 60/40, main column then side column. Mobile: one column. */
const isSplit = computed(() => globalSkin.value === 'desktop')
</script>

<template>
  <ChromeWrapper :last-edited-notice="false">
    <!-- The Home draws its own header: the greeting over production's page tabs. -->
    <SpecialPageWrapper :title="null" class="home-page">
      <HomePageHeader :title="pageTitle" />

      <div class="home-columns" :class="{ 'home-columns--split': isSplit }">
        <!-- Main column: empty for now. -->
        <div v-if="isSplit" class="home-modules home-modules--main" />

        <div class="home-modules home-modules--side">
          <HomeSectionFrame id="impact" title="Your impact">
            <HomeImpact />
          </HomeSectionFrame>
        </div>
      </div>
    </SpecialPageWrapper>
  </ChromeWrapper>
</template>

<style scoped>
.home-page {
  padding-bottom: var(--spacing-300);
}

/* PROTOWIKI+ SpecialPageWrapper: mobile gutter is the desktop one. */
.home-page[data-skin='mobile'] {
  padding-inline: var(--spacing-100);
}

/*
 * PROTOWIKI+ SpecialPageWrapper: no content-width option (it clamps at ~1596px).
 * Vector: the column `Special:CreateAccount` uses — 984px of content inside the
 * wrapper's own padding — rather than the special page's ~1596px clamp.
 */
.home-page[data-skin='desktop'] {
  max-width: calc(984px + 2 * var(--spacing-150));
}

.home-modules {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-200);
}

/* Each desktop module is a block of cards, so it needs a wider break between. */
.home-page[data-skin='desktop'] .home-modules {
  gap: var(--spacing-300);
  margin-top: var(--spacing-100);
}

/* Desktop: 60/40, each column's modules from the top. */
.home-columns--split {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  align-items: start;
  column-gap: var(--spacing-200);
}

/* Narrow desktop: one column, and the empty main column takes no room. */
@media (max-width: 767px) {
  .home-columns--split {
    grid-template-columns: minmax(0, 1fr);
  }

  .home-modules--main:empty {
    display: none;
  }
}
</style>
