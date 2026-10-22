<script setup lang="ts">
import { computed } from 'vue'
import { cdxIconConfigure, cdxIconHome, cdxIconLevelOne } from '@wikimedia/codex-icons'

import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import { useConfig } from '@/composables/useConfig'
import { globalSkin } from '@/theme'
import HomeImpact from './HomeImpact.vue'
import HomeMentor from './HomeMentor.vue'
import HomeModuleMenu from './HomeModuleMenu.vue'
import HomePageHeader from './HomePageHeader.vue'
import HomeSectionFrame from './HomeSectionFrame.vue'
import HomeSuggestedEdits from './HomeSuggestedEdits.vue'
import { MENTOR_CONTENT } from './mentorContent'
import { useHomeMentor } from './useHomeMentor'

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

/* The picks don't lead anywhere yet. */
const SUGGESTED_EDITS_MENU = {
  items: [
    { value: 'interests', label: 'Interests', icon: cdxIconConfigure },
    { value: 'edit-types', label: 'Types of edits', icon: cdxIconLevelOne },
  ],
  footer: { value: 'about', label: 'About suggested edits' },
}

const { isAssigned: isMentorAssigned, assign: assignMentor, optOut: optOutOfMentor } =
  useHomeMentor()
const mentorTitle = computed(() =>
  isMentorAssigned.value ? MENTOR_CONTENT.assigned.title : MENTOR_CONTENT.unassigned.title,
)
/* With a mentor: opt out. Without one: get one, as the module's own button does. */
const mentorMenu = computed(() => ({
  items: isMentorAssigned.value
    ? [{ value: 'opt-out', label: 'Opt out of mentorship' }]
    : [{ value: 'get-mentor', label: MENTOR_CONTENT.unassigned.action }],
  footer: { value: 'about', label: 'About mentors' },
}))

function onMentorMenuSelect(value: string | number): void {
  if (value === 'opt-out') optOutOfMentor()
  if (value === 'get-mentor') assignMentor()
}
</script>

<template>
  <ChromeWrapper :last-edited-notice="false">
    <!-- The Home draws its own header: the greeting over production's page tabs. -->
    <SpecialPageWrapper :title="null" class="home-page">
      <HomePageHeader :title="pageTitle" />

      <div class="home-columns" :class="{ 'home-columns--split': isSplit }">
        <div class="home-modules home-modules--main">
          <HomeSectionFrame id="suggested-edits" title="Suggested edits">
            <template #actions>
              <HomeModuleMenu :menu="SUGGESTED_EDITS_MENU" />
            </template>
            <HomeSuggestedEdits />
          </HomeSectionFrame>
        </div>

        <div class="home-modules home-modules--side">
          <HomeSectionFrame id="impact" title="Your impact">
            <HomeImpact />
          </HomeSectionFrame>

          <HomeSectionFrame id="mentor" :title="mentorTitle">
            <template #actions>
              <HomeModuleMenu :menu="mentorMenu" @select="onMentorMenuSelect" />
            </template>
            <HomeMentor />
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

/* Mobile: one column, the main column's modules first, with the modules' own gap between. */
.home-columns {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-200);
}

/* Desktop: 60/40, each column's modules from the top. */
.home-columns--split {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  align-items: start;
  column-gap: var(--spacing-200);
}

/*
 * Narrow desktop: one column. With the side column's own top margin, the row
 * gap makes the desktop modules' 48px break between the columns' modules.
 */
@media (max-width: 767px) {
  .home-columns--split {
    grid-template-columns: minmax(0, 1fr);
    row-gap: var(--spacing-200);
  }
}
</style>
