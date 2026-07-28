<script setup lang="ts">
definePage({
  meta: {
    title: 'Chrome',
    category: 'template',
    platform: 'app',
    order: 0,
  },
})

import { computed, defineComponent, h, ref } from 'vue'
import { CdxRadio, CdxSearchInput } from '@wikimedia/codex'

import AppChromeWrapper from '@/components/app/AppChromeWrapper.vue'
import type { AppHeaderItem } from '@/components/app/AppChromeHeader.vue'

type HeaderVariant = 'explore' | 'search' | 'activity' | 'saved' | 'article'

const HEADER_VARIANTS: { value: HeaderVariant; label: string }[] = [
  { value: 'explore', label: 'Explore — logo · actions' },
  { value: 'search', label: 'Search — back · search field' },
  { value: 'activity', label: 'Activity — title · actions' },
  { value: 'saved', label: 'Saved — title · actions' },
  { value: 'article', label: 'Article — back · search · logo · actions' },
]

const headerVariant = ref<HeaderVariant>('explore')
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
</script>

<template>
  <AppChromeWrapper :left="headerLeft" :middle="headerMiddle" :right="headerRight">
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
