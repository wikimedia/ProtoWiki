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
import ArticleLive from '@/components/article/ArticleLive.vue'
import { useIsIos } from '@/composables/useAppPlatform'

const route = useRoute()
const router = useRouter()
const isIos = useIsIos()

/** Article title from `?article=` (e.g. navigated here from search); a random article without it. */
const article = computed(() => {
  const value = route.query.article
  return typeof value === 'string' && value.trim().length ? value : undefined
})

/** Wikipedia language code — driven by `?lang=`; random mode picks its own. */
const lang = computed(() => {
  const value = route.query.lang
  return typeof value === 'string' && value.trim().length ? value : undefined
})

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

const headerLeft = computed((): AppHeaderItem[] => [
  { type: 'button', icon: backIcon.value, label: 'Back', onClick: goBack },
  { type: 'button', icon: 'search', label: 'Search', onClick: goToSearch },
])

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
    <ArticleLive app :article="article" :lang="lang" />
  </AppChromeWrapper>
</template>
