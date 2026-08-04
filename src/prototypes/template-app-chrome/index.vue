<script setup lang="ts">
definePage({
  meta: {
    title: 'Chrome',
    description: 'A blank-ish template for app prototypes with a chrome header and footer',
    category: 'template',
    platform: 'app',
    order: 0,
  },
})

import { computed, defineComponent, h, ref } from 'vue'
import { CdxRadio, CdxSearchInput } from '@wikimedia/codex'

import AppChromeWrapper from '@/components/app/AppChromeWrapper.vue'
import {
  ANDROID_ARTICLE_BOTTOM_NAV_ITEMS,
  ANDROID_MAIN_BOTTOM_NAV_ITEMS,
  APP_BOTTOM_NAV_ITEM_META,
  IOS_ARTICLE_BOTTOM_NAV_ITEMS,
  IOS_MAIN_BOTTOM_NAV_ITEMS,
  type AppBottomNavItem,
} from '@/components/app/appBottomNavItems'
import type { AppHeaderItem } from '@/components/app/AppChromeHeader.vue'
import { useIsIos } from '@/composables/useAppPlatform'

type HeaderVariant = 'explore' | 'search' | 'activity' | 'saved' | 'article'

const HEADER_VARIANTS: { value: HeaderVariant; label: string }[] = [
  { value: 'explore', label: 'Explore — logo · actions' },
  { value: 'search', label: 'Search — back · search field' },
  { value: 'activity', label: 'Activity — title · actions' },
  { value: 'saved', label: 'Saved — title · actions' },
  { value: 'article', label: 'Article — back · search · logo · actions' },
]

type BottomBarVariant = 'main' | 'article' | 'hidden'

const isIos = useIsIos()

function formatBottomBarLabel(variant: 'main' | 'article', items: AppBottomNavItem[]): string {
  const names = items.map((id) => APP_BOTTOM_NAV_ITEM_META[id].ariaLabel.toLowerCase()).join(' · ')
  const prefix = variant === 'main' ? 'Main' : 'Article'
  return `${prefix} — ${names}`
}

const headerVariant = ref<HeaderVariant>('explore')
const bottomBarVariant = ref<BottomBarVariant>('main')
const searchQuery = ref('')

const DemoSearchField = defineComponent({
  name: 'TemplateAppChromeSearchField',
  setup() {
    return () =>
      h(CdxSearchInput, {
        class: 'template-app-chrome__search',
        modelValue: searchQuery.value,
        'onUpdate:modelValue': (value: string) => {
          searchQuery.value = value
        },
        placeholder: 'Search Wikipedia…',
        clearable: true,
      })
  },
})

const SEARCH_LEFT: AppHeaderItem[] = [
  { type: 'button', icon: 'arrow-previous', label: 'Back' },
  { type: 'component', component: DemoSearchField },
]

const ACTIVITY_LEFT: AppHeaderItem[] = [{ type: 'title', text: 'Activity' }]
const ACTIVITY_RIGHT: AppHeaderItem[] = [
  { type: 'button', icon: 'tabs', label: 'Tabs' },
  { type: 'button', icon: 'bell-outline', label: 'Notifications' },
  { type: 'button', icon: 'vertical-ellipsis', label: 'Menu' },
]

const SAVED_LEFT: AppHeaderItem[] = [{ type: 'title', text: 'Saved' }]
const SAVED_RIGHT: AppHeaderItem[] = [
  { type: 'button', icon: 'filter', label: 'Filter' },
  { type: 'button', icon: 'search', label: 'Search' },
  { type: 'button', icon: 'bell-outline', label: 'Notifications' },
  { type: 'button', icon: 'vertical-ellipsis', label: 'Menu' },
]

const ARTICLE_LEFT: AppHeaderItem[] = [
  { type: 'button', icon: 'arrow-previous', label: 'Back' },
  { type: 'button', icon: 'search', label: 'Search' },
]

const ARTICLE_MIDDLE: AppHeaderItem[] = [
  { type: 'link', icon: 'logo-wikipedia', label: 'Wikipedia' },
]

const ARTICLE_RIGHT: AppHeaderItem[] = [
  { type: 'button', icon: 'tabs', label: 'Tabs' },
  { type: 'button', icon: 'bell-outline', label: 'Notifications' },
  { type: 'button', icon: 'vertical-ellipsis', label: 'Menu' },
]

const headerLeft = computed((): AppHeaderItem[] | undefined => {
  switch (headerVariant.value) {
    case 'explore':
      return undefined
    case 'search':
      return SEARCH_LEFT
    case 'activity':
      return ACTIVITY_LEFT
    case 'saved':
      return SAVED_LEFT
    case 'article':
      return ARTICLE_LEFT
  }
})

const headerMiddle = computed((): AppHeaderItem[] | undefined => {
  if (headerVariant.value === 'article') return ARTICLE_MIDDLE
  return undefined
})

const headerRight = computed((): AppHeaderItem[] | undefined => {
  switch (headerVariant.value) {
    case 'explore':
      return undefined
    case 'search':
      return []
    case 'activity':
      return ACTIVITY_RIGHT
    case 'saved':
      return SAVED_RIGHT
    case 'article':
      return ARTICLE_RIGHT
  }
})

const showBottomMenu = computed(() => bottomBarVariant.value !== 'hidden')

const bottomNavItems = computed((): AppBottomNavItem[] | undefined => {
  switch (bottomBarVariant.value) {
    case 'main':
      return isIos.value ? IOS_MAIN_BOTTOM_NAV_ITEMS : ANDROID_MAIN_BOTTOM_NAV_ITEMS
    case 'article':
      return isIos.value ? IOS_ARTICLE_BOTTOM_NAV_ITEMS : ANDROID_ARTICLE_BOTTOM_NAV_ITEMS
    case 'hidden':
      return undefined
  }
})

const bottomBarVariantOptions = computed(() => {
  const mainItems = isIos.value ? IOS_MAIN_BOTTOM_NAV_ITEMS : ANDROID_MAIN_BOTTOM_NAV_ITEMS
  const articleItems = isIos.value ? IOS_ARTICLE_BOTTOM_NAV_ITEMS : ANDROID_ARTICLE_BOTTOM_NAV_ITEMS
  return [
    { value: 'main' as const, label: formatBottomBarLabel('main', mainItems) },
    { value: 'article' as const, label: formatBottomBarLabel('article', articleItems) },
    { value: 'hidden' as const, label: 'Hidden — search / keyboard' },
  ]
})

</script>

<template>
  <AppChromeWrapper
    :left="headerLeft"
    :middle="headerMiddle"
    :right="headerRight"
    :show-bottom-menu="showBottomMenu"
    :bottom-nav-items="bottomNavItems"
  >
    <div class="template-app-chrome">
      <fieldset class="template-app-chrome__fieldset">
        <legend class="template-app-chrome__legend">Header type</legend>
        <div class="template-app-chrome__options" role="radiogroup" aria-label="Header type">
          <CdxRadio
            v-for="option in HEADER_VARIANTS"
            :key="option.value"
            v-model="headerVariant"
            name="template-app-chrome-header"
            :input-value="option.value"
          >
            {{ option.label }}
          </CdxRadio>
        </div>
      </fieldset>

      <fieldset class="template-app-chrome__fieldset template-app-chrome__fieldset--spaced">
        <legend class="template-app-chrome__legend">Bottom bar type</legend>
        <div class="template-app-chrome__options" role="radiogroup" aria-label="Bottom bar type">
          <CdxRadio
            v-for="option in bottomBarVariantOptions"
            :key="option.value"
            v-model="bottomBarVariant"
            name="template-app-chrome-bottom-bar"
            :input-value="option.value"
          >
            {{ option.label }}
          </CdxRadio>
        </div>
      </fieldset>
    </div>
  </AppChromeWrapper>
</template>

<style scoped>
.template-app-chrome {
  padding-block: var(--spacing-100, 16px);
}

.template-app-chrome__fieldset {
  margin: 0;
  padding: 0;
  border: 0;
}

.template-app-chrome__fieldset--spaced {
  margin-top: var(--spacing-200, 32px);
}

.template-app-chrome__legend {
  margin-bottom: var(--spacing-75, 12px);
  font-family:
    var(--font-family-system-sans, system-ui, sans-serif), var(--font-family-base, sans-serif);
  font-size: var(--font-size-medium, 1rem);
  font-weight: var(--font-weight-bold, 700);
}

.template-app-chrome__options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
}

.template-app-chrome__search {
  width: 100%;
  min-width: 0;
}
</style>
