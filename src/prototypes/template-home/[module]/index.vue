<script setup lang="ts">
/**
 * A Home module on its own page — `/template-home/<module>`, where Minerva's
 * "Show more" leads. The module's bar (back to the Home, its title, its "…"
 * menu) takes the wiki header's place, with no footer, and every card follows
 * as a feed of divider rows. Any other path, or a module the Mock user doesn't
 * get, goes back to the Home.
 */
import { computed, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { MenuButtonItemData } from '@wikimedia/codex'

import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import { preservedQueryFromLocationQuery } from '@/appearance/url-query'
import { useConfig } from '@/composables/useConfig'

import HomeActiveDiscussions from '../HomeActiveDiscussions.vue'
import HomeModuleMenu from '../HomeModuleMenu.vue'
import HomeReviewChanges from '../HomeReviewChanges.vue'
import HomeSubpageHeader from '../HomeSubpageHeader.vue'
import HomeSuggestedEdits from '../HomeSuggestedEdits.vue'
import { REVIEW_CHANGES_MENU, SUGGESTED_EDITS_MENU } from '../homeModuleMenus'
import { HOME_PATH } from '../homeRoutes'

interface ModulePage {
  title: string
  body: Component
  /** Its "…" menu, as on the Home. */
  menu?: { items: readonly MenuButtonItemData[]; footer: MenuButtonItemData }
  /** Only for experienced editors (Experienced editor and Real user), as on the Home. */
  editorsOnly?: boolean
}

/** The modules with a "Show more", by id. */
const MODULE_PAGES: Record<string, ModulePage> = {
  'suggested-edits': {
    title: 'Suggested edits',
    body: HomeSuggestedEdits,
    menu: SUGGESTED_EDITS_MENU,
  },
  'review-changes': {
    title: 'Review changes',
    body: HomeReviewChanges,
    menu: REVIEW_CHANGES_MENU,
    editorsOnly: true,
  },
  'active-discussions': {
    title: 'Active discussions',
    body: HomeActiveDiscussions,
    editorsOnly: true,
  },
}

const route = useRoute()
const router = useRouter()
const { user } = useConfig()

const moduleId = computed(() => {
  const param = (route.params as { module?: string | string[] }).module
  return String(Array.isArray(param) ? param[0] : (param ?? ''))
})

const page = computed(() => {
  const found = MODULE_PAGES[moduleId.value]
  if (!found) return null
  if (found.editorsOnly && user.value !== 'experienced' && user.value !== 'real') return null
  return found
})

watch(
  page,
  (found) => {
    if (!found) {
      void router.replace({ path: HOME_PATH, query: preservedQueryFromLocationQuery(route.query) })
    }
  },
  { immediate: true },
)

// PROTOWIKI+ Router: no `scrollBehavior`, so a new page keeps the old scroll position.
watch(moduleId, () => window.scrollTo(0, 0), { immediate: true })
</script>

<template>
  <ChromeWrapper :last-edited-notice="false" :show-footer="false">
    <template v-if="page" #header>
      <HomeSubpageHeader :title="page.title">
        <template v-if="page.menu" #actions>
          <HomeModuleMenu :menu="page.menu" />
        </template>
      </HomeSubpageHeader>
    </template>

    <SpecialPageWrapper v-if="page" :title="null" class="home-module-page">
      <!-- Keyed: each module gets a fresh load, not the last one's cards. -->
      <component :is="page.body" :key="moduleId" feed />
    </SpecialPageWrapper>
  </ChromeWrapper>
</template>

<style scoped>
/*
 * PROTOWIKI+ SpecialPageWrapper: the list starts right under the bar — each
 * divider row brings its own 12px — with Minerva's 16px gutter.
 */
.home-module-page[data-skin] {
  padding-top: 0;
}

.home-module-page[data-skin='mobile'] {
  padding-inline: var(--spacing-100);
}

/* Vector: a full-width takeover with a slim inset, not the Home's 984px column. */
.home-module-page[data-skin='desktop'] {
  max-width: none;
  padding-inline: var(--spacing-50);
}
</style>
