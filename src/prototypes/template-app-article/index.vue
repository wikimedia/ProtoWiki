<script setup lang="ts">
definePage({
  meta: {
    title: 'Article',
    description: 'Template for an in-app article reading screen with live content.',
    category: 'template',
    platform: 'app',
  },
})

import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppChromeWrapper from '@/components/app/AppChromeWrapper.vue'
import {
  ANDROID_ARTICLE_BOTTOM_NAV_ITEMS,
  IOS_ARTICLE_BOTTOM_NAV_ITEMS,
  type AppBottomNavItem,
} from '@/components/app/appBottomNavItems'
import type { AppHeaderItem } from '@/components/app/AppChromeHeader.vue'
import AppArticleLive from '@/components/article/AppArticleLive.vue'
import { useIsIos } from '@/composables/useAppPlatform'

import { enhanceCollapsibleTables } from './collapsibleTables'

const route = useRoute()
const router = useRouter()
const isIos = useIsIos()

/** Article title — driven by `?article=` (e.g. navigated here from search); defaults for direct visits. */
const article = computed(() => {
  const value = route.query.article
  return typeof value === 'string' && value.trim().length ? value : 'Baltimore'
})

/** Wikipedia language code — driven by `?lang=`. */
const lang = computed(() => {
  const value = route.query.lang
  return typeof value === 'string' && value.trim().length ? value : 'en'
})

function onParserReady(root: HTMLElement): void {
  enhanceCollapsibleTables(root)
}

function goBack(): void {
  router.back()
}

function goToSearch(): void {
  router.push('/template-app-search')
}

function onBottomNav(item: AppBottomNavItem): void {
  if (item === 'search' || item === 'article-search') goToSearch()
}

/** iOS convention is a plain chevron; Android uses a full back arrow. */
const backIcon = computed(() => (isIos.value ? 'previous' : 'arrow-previous'))

const headerLeft = computed(
  (): AppHeaderItem[] => [
    { type: 'button', icon: backIcon.value, label: 'Back', onClick: goBack },
    { type: 'button', icon: 'search', label: 'Search', onClick: goToSearch },
  ],
)

const headerMiddle: AppHeaderItem[] = [{ type: 'link', icon: 'logo-wikipedia', label: 'Wikipedia' }]

const headerRight: AppHeaderItem[] = [
  { type: 'button', icon: 'tabs', label: 'Tabs' },
  { type: 'button', icon: 'bell-outline', label: 'Notifications' },
  { type: 'button', icon: 'vertical-ellipsis', label: 'Menu' },
]

const bottomNavItems = computed(() =>
  isIos.value ? IOS_ARTICLE_BOTTOM_NAV_ITEMS : ANDROID_ARTICLE_BOTTOM_NAV_ITEMS,
)
</script>

<template>
  <AppChromeWrapper
    :left="headerLeft"
    :middle="headerMiddle"
    :right="headerRight"
    :bottom-nav-items="bottomNavItems"
    @navigate="onBottomNav"
  >
    <AppArticleLive :article="article" :lang="lang" @parser-ready="onParserReady" />
  </AppChromeWrapper>
</template>

<!--
  Targets DOM built by ./collapsibleTables.ts (raw nodes inserted into v-html
  content, not compiled by this SFC) — must stay unscoped to match.
-->
<style>
.pw-collapsible-table {
  margin: var(--spacing-100, 16px) 0;
  border: var(--border-width-base, 1px) solid var(--border-color-base, #a2a9b1);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-neutral-subtle, #f8f9fa);
}

.pw-collapsible-table__summary {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  width: 100%;
  padding: var(--spacing-75, 12px) var(--spacing-100, 16px);
  border: 0;
  background: none;
  text-align: start;
  color: var(--color-base, #202122);
  font: inherit;
  cursor: pointer;
}

.pw-collapsible-table__label {
  flex-shrink: 0;
  font-weight: var(--font-weight-bold, 700);
}

.pw-collapsible-table__preview {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  color: var(--color-subtle, #54595d);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pw-collapsible-table__chevron {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  opacity: 0.7;
}

.pw-collapsible-table__chevron svg {
  display: block;
  width: 100%;
  height: 100%;
}

.pw-collapsible-table__panel {
  border-top: var(--border-width-base, 1px) solid var(--border-color-base, #a2a9b1);
  padding: 0;
}

.pw-collapsible-table__panel--collapsed {
  display: none;
}

.pw-collapsible-table__panel table {
  margin: 0 !important;
  border: none !important;
}

/* Panel border-top is the sole divider above the infobox — drop the first row’s top edge. */
.pw-collapsible-table__panel table > tbody > tr:first-child > :is(th, td),
.pw-collapsible-table__panel table > tr:first-child > :is(th, td) {
  border-top: none !important;
}

.pw-collapsible-table__close {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-50, 8px);
  width: 100%;
  margin-top: 0;
  padding: var(--spacing-75, 12px) var(--spacing-100, 16px);
  border: 0;
  border-top: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  background: none;
  color: var(--color-subtle, #54595d);
  font: inherit;
  cursor: pointer;
}
</style>
