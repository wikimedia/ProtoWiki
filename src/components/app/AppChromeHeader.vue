<script setup lang="ts">
import { computed, watch } from 'vue'
import type { Component } from 'vue'
import { RouterLink } from 'vue-router'
import { CdxButton, CdxIcon } from '@wikimedia/codex'

import { resolveAppHeaderIcon, type AppHeaderIconName } from './appHeaderIcons'
import { globalTheme } from '@/theme'
import type { Theme } from '@/theme'

export interface AppHeaderLinkItem {
  type: 'link'
  icon: AppHeaderIconName
  label: string
  href?: string
}

export interface AppHeaderButtonItem {
  type: 'button'
  icon: AppHeaderIconName
  label: string
  onClick?: () => void
}

export interface AppHeaderComponentItem {
  type: 'component'
  component: Component
}

/** Screen title — Codex Heading 3 ([Figma Activity / Saved topbars](https://www.figma.com/design/8qeEyA6LT4bzpQLin1Gx43/protowiki-apps)). */
export interface AppHeaderTitleItem {
  type: 'title'
  text: string
}

export type AppHeaderItem =
  | AppHeaderLinkItem
  | AppHeaderButtonItem
  | AppHeaderComponentItem
  | AppHeaderTitleItem

const MAX_FLANK_ITEMS = 4

/** Explore feed — [Figma 1:702](https://www.figma.com/design/8qeEyA6LT4bzpQLin1Gx43/protowiki-apps?node-id=1-702). */
const DEFAULT_LEFT: AppHeaderItem[] = [{ type: 'link', icon: 'logo-wikipedia', label: 'Wikipedia' }]

const DEFAULT_RIGHT: AppHeaderItem[] = [
  { type: 'button', icon: 'tabs', label: 'Tabs' },
  { type: 'button', icon: 'bell-outline', label: 'Notifications' },
]

interface Props {
  theme?: Theme
  left?: AppHeaderItem[]
  middle?: AppHeaderItem[]
  right?: AppHeaderItem[]
}

const props = withDefaults(defineProps<Props>(), {
  theme: undefined,
  left: undefined,
  middle: undefined,
  right: undefined,
})

const effectiveTheme = computed<Theme>(() => props.theme ?? globalTheme.value)

function clampFlank(items: AppHeaderItem[], side: 'left' | 'right'): AppHeaderItem[] {
  if (items.length <= MAX_FLANK_ITEMS) return items
  if (import.meta.env.DEV) {
    console.warn(`[AppChromeHeader] ${side} exceeds ${MAX_FLANK_ITEMS} items; truncating.`)
  }
  return items.slice(0, MAX_FLANK_ITEMS)
}

const effectiveLeft = computed(() => clampFlank(props.left ?? DEFAULT_LEFT, 'left'))

const effectiveMiddle = computed(() => props.middle ?? [])

const effectiveRight = computed(() => clampFlank(props.right ?? DEFAULT_RIGHT, 'right'))

const hasLeft = computed(() => effectiveLeft.value.length > 0)
const hasRight = computed(() => effectiveRight.value.length > 0)

/** Middle only renders when both flanks are present. */
const showMiddle = computed(
  () => hasLeft.value && hasRight.value && effectiveMiddle.value.length > 0,
)

if (import.meta.env.DEV) {
  watch(
    () => [props.middle?.length ?? 0, hasLeft.value, hasRight.value] as const,
    ([middleCount, left, right]) => {
      if (middleCount > 0 && !(left && right)) {
        console.warn('[AppChromeHeader] middle is ignored unless both left and right are present.')
      }
    },
    { immediate: true },
  )
}

const navMode = computed(() => {
  if (showMiddle.value) return 'balanced'
  if (hasLeft.value && hasRight.value) return 'spread'
  return 'flow'
})

const leftGrows = computed(() => navMode.value === 'flow' && hasLeft.value && !hasRight.value)

function isExternalHref(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://')
}
</script>

<template>
  <header class="app-chrome-header" :data-theme="effectiveTheme">
    <nav
      class="app-chrome-header__nav"
      :class="[
        `app-chrome-header__nav--${navMode}`,
        { 'app-chrome-header__nav--left-grow': leftGrows },
      ]"
      aria-label="App"
    >
      <div
        v-if="hasLeft"
        class="app-chrome-header__left"
        :class="{ 'app-chrome-header__left--grow': leftGrows }"
      >
        <template v-for="(item, index) in effectiveLeft" :key="`left-${index}`">
          <h3 v-if="item.type === 'title'" class="app-chrome-header__title">
            {{ item.text }}
          </h3>
          <component
            v-else-if="item.type === 'component'"
            :is="item.component"
            class="app-chrome-header__region-component"
          />
          <RouterLink
            v-else-if="item.type === 'link' && item.href && !isExternalHref(item.href)"
            class="app-chrome-header__link"
            :to="item.href"
            :aria-label="item.label"
          >
            <CdxIcon :icon="resolveAppHeaderIcon(item.icon)!" />
          </RouterLink>
          <a
            v-else-if="item.type === 'link' && item.href && isExternalHref(item.href)"
            class="app-chrome-header__link"
            :href="item.href"
            :aria-label="item.label"
          >
            <CdxIcon :icon="resolveAppHeaderIcon(item.icon)!" />
          </a>
          <span
            v-else-if="item.type === 'link'"
            class="app-chrome-header__link app-chrome-header__link--logo"
            :aria-label="item.label"
          >
            <CdxIcon
              class="app-chrome-header__logo-icon"
              :icon="resolveAppHeaderIcon(item.icon)!"
              :icon-label="item.label"
            />
          </span>
          <CdxButton
            v-else-if="item.type === 'button'"
            weight="quiet"
            size="large"
            :aria-label="item.label"
            @click="item.onClick?.()"
          >
            <CdxIcon :icon="resolveAppHeaderIcon(item.icon)!" />
          </CdxButton>
        </template>
      </div>

      <div v-if="showMiddle" class="app-chrome-header__middle">
        <template v-for="(item, index) in effectiveMiddle" :key="`middle-${index}`">
          <h3 v-if="item.type === 'title'" class="app-chrome-header__title">
            {{ item.text }}
          </h3>
          <component
            v-else-if="item.type === 'component'"
            :is="item.component"
            class="app-chrome-header__region-component"
          />
          <RouterLink
            v-else-if="item.type === 'link' && item.href && !isExternalHref(item.href)"
            class="app-chrome-header__middle-link"
            :to="item.href"
            :aria-label="item.label"
          >
            <CdxIcon
              class="app-chrome-header__middle-icon"
              :icon="resolveAppHeaderIcon(item.icon)!"
            />
          </RouterLink>
          <a
            v-else-if="item.type === 'link' && item.href && isExternalHref(item.href)"
            class="app-chrome-header__middle-link"
            :href="item.href"
            :aria-label="item.label"
          >
            <CdxIcon
              class="app-chrome-header__middle-icon"
              :icon="resolveAppHeaderIcon(item.icon)!"
            />
          </a>
          <span
            v-else-if="item.type === 'link'"
            class="app-chrome-header__middle-link"
            :aria-label="item.label"
          >
            <CdxIcon
              class="app-chrome-header__middle-icon"
              :icon="resolveAppHeaderIcon(item.icon)!"
              :icon-label="item.label"
            />
          </span>
          <CdxButton
            v-else-if="item.type === 'button'"
            weight="quiet"
            size="large"
            :aria-label="item.label"
            @click="item.onClick?.()"
          >
            <CdxIcon :icon="resolveAppHeaderIcon(item.icon)!" />
          </CdxButton>
        </template>
      </div>

      <div
        v-if="hasRight"
        class="app-chrome-header__right"
        :class="{ 'app-chrome-header__right--solo': !hasLeft && !showMiddle }"
      >
        <template v-for="(item, index) in effectiveRight" :key="`right-${index}`">
          <h3 v-if="item.type === 'title'" class="app-chrome-header__title">
            {{ item.text }}
          </h3>
          <component
            v-else-if="item.type === 'component'"
            :is="item.component"
            class="app-chrome-header__region-component"
          />
          <RouterLink
            v-else-if="item.type === 'link' && item.href && !isExternalHref(item.href)"
            class="app-chrome-header__link"
            :to="item.href"
            :aria-label="item.label"
          >
            <CdxIcon :icon="resolveAppHeaderIcon(item.icon)!" />
          </RouterLink>
          <a
            v-else-if="item.type === 'link' && item.href && isExternalHref(item.href)"
            class="app-chrome-header__link"
            :href="item.href"
            :aria-label="item.label"
          >
            <CdxIcon :icon="resolveAppHeaderIcon(item.icon)!" />
          </a>
          <span
            v-else-if="item.type === 'link'"
            class="app-chrome-header__link"
            :aria-label="item.label"
          >
            <CdxIcon :icon="resolveAppHeaderIcon(item.icon)!" :icon-label="item.label" />
          </span>
          <CdxButton
            v-else-if="item.type === 'button'"
            weight="quiet"
            size="large"
            :aria-label="item.label"
            @click="item.onClick?.()"
          >
            <CdxIcon :icon="resolveAppHeaderIcon(item.icon)!" />
          </CdxButton>
        </template>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.app-chrome-header {
  flex-shrink: 0;
  background-color: var(--background-color-base, #fff);
}

.app-chrome-header__nav {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  min-height: 60px;
  padding: var(--spacing-50, 8px) var(--spacing-150, 24px);
}

.app-chrome-header__nav--balanced {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  column-gap: var(--spacing-50, 8px);
}

.app-chrome-header__nav--spread {
  justify-content: space-between;
}

.app-chrome-header__nav--spread .app-chrome-header__left:has(.app-chrome-header__title) {
  flex: 1 1 auto;
  min-width: 0;
}

.app-chrome-header__title {
  margin: 0;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-family-base, sans-serif);
  font-size: var(--font-size-x-large, 1.125rem);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-x-large, 1.75rem);
  color: var(--color-base, #202122);
}

.app-chrome-header__left,
.app-chrome-header__right {
  display: flex;
  flex-shrink: 0;
  align-items: center;
}

.app-chrome-header__region-component:not(:first-child) {
  margin-inline-start: var(--spacing-50, 8px);
}

.app-chrome-header__left--grow {
  flex: 1 1 auto;
  min-width: 0;
}

.app-chrome-header__nav--balanced .app-chrome-header__left {
  justify-self: start;
}

.app-chrome-header__nav--balanced .app-chrome-header__right {
  justify-self: end;
}

.app-chrome-header__right--solo {
  margin-inline-start: auto;
}

.app-chrome-header__middle {
  display: flex;
  min-width: 0;
  align-items: center;
}

.app-chrome-header__nav--balanced .app-chrome-header__middle {
  justify-content: center;
  justify-self: center;
}

.app-chrome-header__region-component {
  flex: 1 1 auto;
  min-width: 0;
}

.app-chrome-header__link,
.app-chrome-header__middle-link {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  color: inherit;
  text-decoration: none;
}

.app-chrome-header__logo-icon,
.app-chrome-header__middle-icon {
  width: 32px;
  height: 32px;
}
</style>
