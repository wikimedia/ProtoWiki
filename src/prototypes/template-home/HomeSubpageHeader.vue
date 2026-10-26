<script setup lang="ts">
/**
 * A module page's bar: back to the Home, the module's title as the page's `h1`,
 * centred, and the module's actions (its "…" menu) at the end. Runs edge to
 * edge in place of the wiki header.
 */
import { useRoute, useRouter } from 'vue-router'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconArrowPrevious } from '@wikimedia/codex-icons'

import { preservedQueryFromLocationQuery } from '@/appearance/url-query'

import { HOME_PATH } from './homeRoutes'

defineProps<{ title: string }>()

const route = useRoute()
const router = useRouter()

/** Step back when the Home is the page we came from (keeping its state), else go there. */
function goBack(): void {
  const back = window.history.state?.back
  if (typeof back === 'string' && back.split(/[?#]/)[0] === HOME_PATH) router.back()
  else void router.push({ path: HOME_PATH, query: preservedQueryFromLocationQuery(route.query) })
}
</script>

<template>
  <header class="home-subpage-header">
    <CdxButton weight="quiet" icon-only aria-label="Back" @click="goBack">
      <CdxIcon :icon="cdxIconArrowPrevious" />
    </CdxButton>
    <h1 class="home-subpage-header__title">{{ title }}</h1>
    <span class="home-subpage-header__actions">
      <!-- With no actions, a spacer balances the back button, so the title centres on the bar. -->
      <slot name="actions">
        <span class="home-subpage-header__spacer" aria-hidden="true" />
      </slot>
    </span>
  </header>
</template>

<style scoped>
/*
 * 48px bar: 32px controls in an 8px padding box, a hairline under it (outside
 * the 48px). Sticks to the top as the list scrolls; on a phone with a notch the
 * safe-area inset pushes it down rather than eating its padding.
 */
.home-subpage-header {
  position: sticky;
  top: 0;
  /* Above the page, which would otherwise paint over the hairline. */
  z-index: 2;
  display: flex;
  align-items: center;
  gap: var(--spacing-50);
  box-sizing: border-box;
  min-height: calc(var(--spacing-300) + env(safe-area-inset-top, 0px));
  padding: var(--spacing-50);
  padding-top: calc(var(--spacing-50) + env(safe-area-inset-top, 0px));
  box-shadow: 0 1px 0 var(--border-color-base);
  background-color: var(--background-color-base);
}

/* Codex Body bold, not a Heading: a toolbar title, not a page heading's look. */
.home-subpage-header__title {
  flex: 1;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
  color: var(--color-base);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-subpage-header__actions {
  display: flex;
  flex-shrink: 0;
}

.home-subpage-header__spacer {
  flex-shrink: 0;
  width: var(--min-size-interactive-pointer);
}
</style>
