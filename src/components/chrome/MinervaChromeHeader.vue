<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconHome } from '@wikimedia/codex-icons'

import MobileSearchOverlay from '@/components/search/MobileSearchOverlay.vue'
import { resolveHeaderIcon } from '@/components/header/headerIcons'
import type { HeaderItem } from '@/components/header/headerItems'
import { t } from '@/i18n'
import { wikipediaLogoStyle, wikipediaWordmarkSrc } from './wikipediaWordmark'
import { globalTheme } from '@/theme'
import type { Theme } from '@/theme'

export type MinervaHeaderItem = HeaderItem

const MAX_FLANK_ITEMS = 4

const defaultLeft = (): HeaderItem[] => [
  { type: 'button', icon: 'menu', label: t('chrome.mainMenu') },
]

/**
 * Full-screen search, the way Minerva does it. Owned here so every mobile
 * chrome gets a working search icon; a prototype that overrides `right` with
 * its own search item (an address of its own to navigate to, say) opts out.
 */
const searchOpen = ref(false)

const defaultRight = (): HeaderItem[] => [
  {
    type: 'button',
    icon: 'search',
    label: t('chrome.search'),
    onClick: () => (searchOpen.value = true),
  },
  { type: 'button', icon: 'bell-outline', label: t('chrome.notifications') },
  { type: 'button', icon: 'user-avatar-outline', label: t('chrome.userMenu') },
]

interface Props {
  theme?: Theme
  left?: HeaderItem[]
  middle?: HeaderItem[]
  right?: HeaderItem[]
  /** Wordmark image URL when **`middle`** is omitted. */
  wordmarkSrc?: string
  /** Minerva wordmark; defaults to **`wordmarkSrc`** then the UI-language wordmark. */
  mobileWordmarkSrc?: string
  /** When false, the default wordmark is decorative (not a link). */
  brandLink?: boolean
  /** Float a Home button in the bottom-trailing corner; clicking it emits **`home`**. */
  floatingHome?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  theme: undefined,
  left: undefined,
  middle: undefined,
  right: undefined,
  wordmarkSrc: undefined,
  mobileWordmarkSrc: undefined,
  brandLink: true,
  floatingHome: false,
})

const emit = defineEmits<{
  /** The floating Home button was clicked — where Home is belongs to the prototype. */
  home: []
}>()

const effectiveTheme = computed<Theme>(() => props.theme ?? globalTheme.value)

const wordmarkResolved = computed(
  () => props.mobileWordmarkSrc ?? props.wordmarkSrc ?? wikipediaWordmarkSrc(),
)

/** Arabic artwork is taller; size it like arwiki does (CSS height is 21px for English). */
const wordmarkStyle = computed(() =>
  props.mobileWordmarkSrc ?? props.wordmarkSrc ? undefined : wikipediaLogoStyle('wordmark', 21),
)

function clampFlank(items: HeaderItem[], side: 'left' | 'right'): HeaderItem[] {
  if (items.length <= MAX_FLANK_ITEMS) return items
  if (import.meta.env.DEV) {
    console.warn(`[MinervaChromeHeader] ${side} exceeds ${MAX_FLANK_ITEMS} items; truncating.`)
  }
  return items.slice(0, MAX_FLANK_ITEMS)
}

const effectiveLeft = computed(() => clampFlank(props.left ?? defaultLeft(), 'left'))
const effectiveRight = computed(() => clampFlank(props.right ?? defaultRight(), 'right'))
const effectiveMiddle = computed(() => props.middle ?? [])

const useDefaultWordmark = computed(() => props.middle === undefined)

const hasLeft = computed(() => effectiveLeft.value.length > 0)
const hasRight = computed(() => effectiveRight.value.length > 0)

const showMiddle = computed(() => {
  if (!hasLeft.value || !hasRight.value) return false
  if (useDefaultWordmark.value) return true
  return effectiveMiddle.value.length > 0
})

if (import.meta.env.DEV) {
  watch(
    () => [props.middle?.length ?? 0, hasLeft.value, hasRight.value] as const,
    ([middleCount, left, right]) => {
      if (middleCount > 0 && !(left && right)) {
        console.warn(
          '[MinervaChromeHeader] middle is ignored unless both left and right are present.',
        )
      }
    },
    { immediate: true },
  )
}

function isExternalHref(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://')
}
</script>

<template>
  <header class="minerva-chrome-header" data-skin="mobile" :data-theme="effectiveTheme">
    <nav class="minerva-chrome-header__nav" :aria-label="t('chrome.siteNavigation')">
      <div v-if="hasLeft" class="minerva-chrome-header__left">
        <template v-for="(item, index) in effectiveLeft" :key="`left-${index}`">
          <component
            v-if="item.type === 'component'"
            :is="item.component"
            class="minerva-chrome-header__region-component"
          />
          <RouterLink
            v-else-if="item.type === 'link' && item.href && !isExternalHref(item.href)"
            class="minerva-chrome-header__link"
            :to="item.href"
            :aria-label="item.label"
          >
            <CdxIcon :icon="resolveHeaderIcon(item.icon)!" />
          </RouterLink>
          <a
            v-else-if="item.type === 'link' && item.href && isExternalHref(item.href)"
            class="minerva-chrome-header__link"
            :href="item.href"
            :aria-label="item.label"
          >
            <CdxIcon :icon="resolveHeaderIcon(item.icon)!" />
          </a>
          <CdxButton
            v-else-if="item.type === 'button'"
            weight="quiet"
            size="large"
            :aria-label="item.label"
            @click="item.onClick?.()"
          >
            <CdxIcon :icon="resolveHeaderIcon(item.icon)!" />
          </CdxButton>
        </template>
      </div>

      <div v-if="showMiddle" class="minerva-chrome-header__middle">
        <RouterLink
          v-if="useDefaultWordmark && brandLink"
          class="minerva-chrome-header__brand"
          to="/"
          :aria-label="t('chrome.visitMainPage')"
        >
          <img
            class="minerva-chrome-header__wordmark-img"
            :src="wordmarkResolved"
            :style="wordmarkStyle"
            :alt="t('chrome.wordmarkAlt')"
          />
        </RouterLink>
        <span v-else-if="useDefaultWordmark" class="minerva-chrome-header__brand">
          <img
            class="minerva-chrome-header__wordmark-img"
            :src="wordmarkResolved"
            :style="wordmarkStyle"
            :alt="t('chrome.wordmarkAlt')"
          />
        </span>
        <template v-else v-for="(item, index) in effectiveMiddle" :key="`middle-${index}`">
          <component
            v-if="item.type === 'component'"
            :is="item.component"
            class="minerva-chrome-header__region-component"
          />
          <RouterLink
            v-else-if="item.type === 'link' && item.href && !isExternalHref(item.href)"
            class="minerva-chrome-header__link"
            :to="item.href"
            :aria-label="item.label"
          >
            <CdxIcon :icon="resolveHeaderIcon(item.icon)!" />
          </RouterLink>
          <a
            v-else-if="item.type === 'link' && item.href && isExternalHref(item.href)"
            class="minerva-chrome-header__link"
            :href="item.href"
            :aria-label="item.label"
          >
            <CdxIcon :icon="resolveHeaderIcon(item.icon)!" />
          </a>
          <CdxButton
            v-else-if="item.type === 'button'"
            weight="quiet"
            size="large"
            :aria-label="item.label"
            @click="item.onClick?.()"
          >
            <CdxIcon :icon="resolveHeaderIcon(item.icon)!" />
          </CdxButton>
        </template>
      </div>

      <div v-if="hasRight" class="minerva-chrome-header__right">
        <template v-for="(item, index) in effectiveRight" :key="`right-${index}`">
          <component
            v-if="item.type === 'component'"
            :is="item.component"
            class="minerva-chrome-header__region-component"
          />
          <RouterLink
            v-else-if="item.type === 'link' && item.href && !isExternalHref(item.href)"
            class="minerva-chrome-header__link"
            :to="item.href"
            :aria-label="item.label"
          >
            <CdxIcon :icon="resolveHeaderIcon(item.icon)!" />
          </RouterLink>
          <a
            v-else-if="item.type === 'link' && item.href && isExternalHref(item.href)"
            class="minerva-chrome-header__link"
            :href="item.href"
            :aria-label="item.label"
          >
            <CdxIcon :icon="resolveHeaderIcon(item.icon)!" />
          </a>
          <CdxButton
            v-else-if="item.type === 'button'"
            weight="quiet"
            size="large"
            :aria-label="item.label"
            @click="item.onClick?.()"
          >
            <CdxIcon
              :icon="resolveHeaderIcon(item.icon)!"
              :size="item.icon === 'user-avatar-outline' ? 'medium' : undefined"
            />
          </CdxButton>
        </template>
      </div>
    </nav>

    <!--
      Outside `__nav` because it isn't part of the bar's layout: it's pinned to
      the viewport, not to the header. Framed, thumb-sized and icon-only — a
      labelled pill would cover more of the text it floats over.
    -->
    <CdxButton
      v-if="floatingHome"
      class="minerva-chrome-header__fab"
      size="large"
      :aria-label="t('chrome.home')"
      @click="emit('home')"
    >
      <CdxIcon :icon="cdxIconHome" />
    </CdxButton>
  </header>

  <MobileSearchOverlay v-if="searchOpen" :theme="effectiveTheme" @close="searchOpen = false" />
</template>

<style scoped>
/*
 * Pinned to the viewport rather than the header, so it stays in the corner
 * while the article scrolls. `inset-inline-end` keeps it on the trailing edge,
 * which mirrors to the left in RTL chrome.
 */
.minerva-chrome-header__fab.cdx-button {
  position: fixed;
  bottom: var(--spacing-75, 12px);
  inset-inline-end: var(--spacing-75, 12px);
  z-index: var(--z-index-fixed, 200);
}

.minerva-chrome-header {
  border-bottom: 1px solid var(--border-color-subtle, #c8ccd1);
}

.minerva-chrome-header__nav {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  min-height: 3.375em;
  padding-block: 0;
  padding-inline-start: var(--spacing-25, 4px);
  padding-inline-end: var(--spacing-75, 12px);
  background-color: var(--background-color-interactive, #eaecf0);
  box-shadow: inset 0 -1px 3px 0 rgba(0, 0, 0, 0.08);
}

.minerva-chrome-header__left {
  display: flex;
  flex-shrink: 0;
  align-items: center;
}

.minerva-chrome-header__left :deep(.prototype-chrome-menu-popover) {
  flex-shrink: 0;
}

.minerva-chrome-header__middle {
  flex: 0 1 auto;
  max-width: fit-content;
  min-width: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.minerva-chrome-header__brand {
  text-decoration: none;
  color: inherit;
}

.minerva-chrome-header__brand:hover {
  text-decoration: none;
  color: inherit;
}

.minerva-chrome-header__wordmark-img {
  display: block;
  height: 21px;
  width: auto;
  opacity: 0.67;
}

.minerva-chrome-header[data-theme='dark'] .minerva-chrome-header__wordmark-img {
  opacity: 0;
}

.minerva-chrome-header__right {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  margin-inline-start: auto;
}

/* Equal square touch targets — no gap between adjacent icon buttons/links. */
.minerva-chrome-header__right :deep(.cdx-button) {
  box-sizing: border-box;
  flex-shrink: 0;
  width: var(--size-icon-large, 40px);
  min-width: var(--size-icon-large, 40px);
  max-width: var(--size-icon-large, 40px);
  height: var(--size-icon-large, 40px);
  min-height: var(--size-icon-large, 40px);
  padding: 0;
  color: var(--color-subtle, #54595d);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.minerva-chrome-header__left :deep(.cdx-button) {
  box-sizing: border-box;
  flex-shrink: 0;
  width: var(--size-icon-large, 40px);
  min-width: var(--size-icon-large, 40px);
  max-width: var(--size-icon-large, 40px);
  height: var(--size-icon-large, 40px);
  min-height: var(--size-icon-large, 40px);
  padding: 0;
  color: var(--color-subtle, #54595d);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.minerva-chrome-header__link {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--size-icon-large, 40px);
  height: var(--size-icon-large, 40px);
  color: var(--color-subtle, #54595d);
  text-decoration: none;
}

.minerva-chrome-header__link:visited,
.minerva-chrome-header__link:hover {
  color: var(--color-subtle, #54595d);
  text-decoration: none;
}
</style>
