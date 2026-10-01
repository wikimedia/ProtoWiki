<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { CdxButton, CdxIcon, CdxMenuButton } from '@wikimedia/codex'
import type { MenuButtonItemData, MenuItemValue } from '@wikimedia/codex'
import {
  cdxIconAppearance,
  cdxIconBell,
  cdxIconBookmarkList,
  cdxIconExpand,
  cdxIconHome,
  cdxIconImageGallery,
  cdxIconLabFlask,
  cdxIconLanguage,
  cdxIconLogOut,
  cdxIconMenu,
  cdxIconSandbox,
  cdxIconSearch,
  cdxIconSettings,
  cdxIconTray,
  cdxIconUserAvatar,
  cdxIconUserContributions,
  cdxIconUserTalk,
  cdxIconWatchlist,
} from '@wikimedia/codex-icons'

import { useConfig } from '@/composables/useConfig'
import { t } from '@/i18n'
import { createAccountOpener } from './createAccountOpener'
import { DEFAULT_CHROME_NAV_TOOLS, type ChromeNavTool } from './headerNavTools'
import { wikipediaTaglineSrc, wikipediaWordmarkSrc } from './wikipediaWordmark'
import { globalTheme } from '@/theme'
import type { Theme } from '@/theme'
import MobileSearchOverlay from '@/components/search/MobileSearchOverlay.vue'
import Search from '../Search.vue'

const { user, displayName } = useConfig()

/** Where "Create account" goes when the prototype has no flow of its own. */
const CREATE_ACCOUNT_URL = 'https://en.wikipedia.org/w/index.php?title=Special:CreateAccount'

interface Props {
  /** Local theme override. Sets `data-theme` on the root. */
  theme?: Theme
  /**
   * Meta link mock before tool icons; trim; empty hides unless **`#username`** overrides.
   * With **`user-menu`** in **`navTools`** the name labels that button instead
   * (the mock user's display name stands in when empty).
   */
  username?: string
  /** Stacked wordmark image URL (`#logo` replaces both lines). */
  wordmarkSrc?: string
  /** Tagline image URL beneath the wordmark. */
  taglineSrc?: string
  /**
   * Subset/order of mocked Vector tool icons.
   * **`#nav`** replaces the whole cluster regardless.
   */
  navTools?: ChromeNavTool[]
}

const props = withDefaults(defineProps<Props>(), {
  theme: undefined,
  username: undefined,
  wordmarkSrc: undefined,
  taglineSrc: undefined,
  navTools: undefined,
})

const emit = defineEmits<{
  /** The **`home`** tool was clicked — where Home is belongs to the prototype. */
  home: []
}>()

/**
 * Below 1120px Vector trades the inline field for an icon, the same as
 * production. There is no room to expand in place, so the icon opens the
 * full-screen overlay — the same component the mobile bar uses.
 */
const searchOpen = ref(false)

const effectiveTheme = computed<Theme>(() => props.theme ?? globalTheme.value)
const trimmedUsername = computed(() => (props.username ?? '').trim())
const isLoggedOut = computed(() => user.value === 'logged-out')

/** UI-language CDN SVGs by default — override via **`wordmarkSrc`** / **`taglineSrc`**. */
const desktopWordmarkSrc = computed(() => props.wordmarkSrc ?? wikipediaWordmarkSrc())
const desktopTaglineSrc = computed(() => props.taglineSrc ?? wikipediaTaglineSrc())

const effectiveNavTools = computed(() =>
  props.navTools?.length ? props.navTools : DEFAULT_CHROME_NAV_TOOLS,
)

function navHas(tool: ChromeNavTool): boolean {
  return effectiveNavTools.value.includes(tool)
}

/*
 * The user menu carries the name as its label, so the meta link before the
 * tool icons would only repeat it.
 */
const showChromeUsernameLink = computed(
  () => trimmedUsername.value.length > 0 && !navHas('user-menu'),
)
const userMenuLabel = computed(() => trimmedUsername.value || displayName.value)

/**
 * Mocked Vector user menu. The name is already on the button that opens it,
 * so the first row names the destination instead. Items are inert affordances
 * like the rest of the chrome — selecting one closes the menu and clears the
 * selection so no entry renders a persistent checkmark.
 */
const userMenuItems: MenuButtonItemData[] = [
  { value: 'user-page', label: t('chrome.userPage'), icon: cdxIconUserAvatar },
  { value: 'talk', label: t('chrome.talk'), icon: cdxIconUserTalk },
  { value: 'sandbox', label: t('chrome.sandbox'), icon: cdxIconSandbox },
  { value: 'preferences', label: t('chrome.preferences'), icon: cdxIconSettings },
  { value: 'beta', label: t('chrome.beta'), icon: cdxIconLabFlask },
  { value: 'contributions', label: t('chrome.contributions'), icon: cdxIconUserContributions },
  { value: 'translations', label: t('chrome.translations'), icon: cdxIconLanguage },
  { value: 'uploaded-media', label: t('chrome.uploadedMedia'), icon: cdxIconImageGallery },
  { value: 'log-out', label: t('chrome.logOut'), icon: cdxIconLogOut },
]

const userMenuSelection = ref<MenuItemValue | null>(null)

watch(userMenuSelection, (value) => {
  if (value !== null) userMenuSelection.value = null
})

/*
 * "Create account" is a real link either way: a prototype that registered an
 * opener gets its own in-ProtoWiki URL (so ⌘-click still opens a new tab on
 * the right screen), everything else keeps Special:CreateAccount on enwiki.
 */
const createAccountHref = computed(() => createAccountOpener.value?.href() ?? CREATE_ACCOUNT_URL)

function onCreateAccountClick(event: MouseEvent): void {
  const opener = createAccountOpener.value
  if (!opener) return
  // Leave modified clicks to the browser — that's what the href is for.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  opener.open()
}
</script>

<template>
  <header class="vector-chrome-header" data-skin="desktop" :data-theme="effectiveTheme">
    <nav class="vector-chrome-header__nav" :aria-label="t('chrome.siteNavigation')">
      <div class="vector-chrome-header__start">
        <slot name="menu">
          <!-- Mock only — not interactive (FakeMediaWiki uses bare chrome / icon affordances). -->
          <span class="vector-chrome-header__menu-icon" aria-hidden="true">
            <CdxIcon :icon="cdxIconMenu" />
          </span>
        </slot>

        <RouterLink
          class="vector-chrome-header__brand-link"
          to="/"
          :aria-label="t('chrome.visitMainPage')"
        >
          <slot name="logo">
            <span class="vector-chrome-header__wordmarks">
              <img
                class="vector-chrome-header__wordmark-img"
                :src="desktopWordmarkSrc"
                width="120"
                height="18"
                :alt="t('chrome.wordmarkAlt')"
              />
              <img
                class="vector-chrome-header__tagline-img"
                :src="desktopTaglineSrc"
                width="120"
                height="14"
                alt=""
              />
            </span>
          </slot>
        </RouterLink>
      </div>

      <div class="vector-chrome-header__inline-search">
        <div class="vector-chrome-header__search">
          <Search />
        </div>
        <CdxButton
          class="vector-chrome-header__search-submit"
          type="submit"
          form="protowiki-search"
        >
          {{ t('chrome.search') }}
        </CdxButton>
      </div>

      <div class="vector-chrome-header__end">
        <CdxButton
          class="vector-chrome-header__search-icon-toggle"
          weight="quiet"
          :aria-label="t('chrome.search')"
          @click="searchOpen = true"
        >
          <CdxIcon :icon="cdxIconSearch" />
        </CdxButton>
        <slot name="username">
          <div v-if="isLoggedOut" class="vector-chrome-header__logged-out-toolbar">
            <a
              class="vector-chrome-header__text-link"
              href="https://donate.wikimedia.org/"
              rel="noopener noreferrer"
            >
              {{ t('chrome.donate') }}
            </a>
            <a
              class="vector-chrome-header__text-link"
              :href="createAccountHref"
              rel="noopener noreferrer"
              @click="onCreateAccountClick"
            >
              {{ t('chrome.createAccount') }}
            </a>
            <a
              class="vector-chrome-header__text-link"
              href="https://en.wikipedia.org/w/index.php?title=Special:UserLogin"
              rel="noopener noreferrer"
            >
              {{ t('chrome.logIn') }}
            </a>
          </div>
          <a
            v-else-if="showChromeUsernameLink"
            class="vector-chrome-header__text-link vector-chrome-header__username-display"
            href="#"
            @click.prevent
          >
            {{ trimmedUsername }}
          </a>
        </slot>
        <slot v-if="!isLoggedOut" name="nav">
          <CdxButton
            v-if="navHas('home')"
            class="vector-chrome-header__home"
            weight="quiet"
            action="progressive"
            @click="emit('home')"
          >
            <CdxIcon :icon="cdxIconHome" />
            {{ t('chrome.home') }}
          </CdxButton>
          <CdxButton
            v-if="navHas('appearance')"
            weight="quiet"
            :aria-label="t('chrome.appearance')"
          >
            <CdxIcon :icon="cdxIconAppearance" />
          </CdxButton>
          <CdxButton
            v-if="navHas('notifications')"
            weight="quiet"
            :aria-label="t('chrome.notifications')"
          >
            <CdxIcon :icon="cdxIconBell" />
          </CdxButton>
          <CdxButton v-if="navHas('notices')" weight="quiet" :aria-label="t('chrome.notices')">
            <CdxIcon :icon="cdxIconTray" />
          </CdxButton>
          <CdxButton
            v-if="navHas('bookmarks')"
            weight="quiet"
            :aria-label="t('chrome.readingLists')"
          >
            <CdxIcon :icon="cdxIconBookmarkList" />
          </CdxButton>
          <CdxButton
            v-if="navHas('watchlist')"
            weight="quiet"
            class="vector-chrome-header__hide-narrow"
            :aria-label="t('chrome.watchlist')"
          >
            <CdxIcon :icon="cdxIconWatchlist" />
          </CdxButton>
          <CdxButton v-if="navHas('user')" weight="quiet" :aria-label="t('chrome.userMenu')">
            <CdxIcon :icon="cdxIconUserAvatar" />
          </CdxButton>
          <!-- The visible name is the accessible name, so no `aria-label`. -->
          <CdxMenuButton
            v-if="navHas('user-menu')"
            v-model:selected="userMenuSelection"
            class="vector-chrome-header__user-menu menu-content-width"
            weight="quiet"
            :menu-items="userMenuItems"
          >
            {{ userMenuLabel }}
            <CdxIcon
              class="vector-chrome-header__user-menu-chevron"
              :icon="cdxIconExpand"
              size="small"
            />
          </CdxMenuButton>
        </slot>
      </div>
    </nav>
  </header>

  <MobileSearchOverlay v-if="searchOpen" :theme="effectiveTheme" @close="searchOpen = false" />
</template>

<style scoped>
.vector-chrome-header {
  background-color: var(--background-color-base, #fff);
}

.vector-chrome-header__search {
  min-width: 0;
}

.vector-chrome-header__wordmark-img,
.vector-chrome-header__tagline-img {
  display: block;
  width: auto;
  max-width: 100%;
}

/*
 * Breakpoint parity with FakeMediaWiki `src/views/SpecialView/style.css`:
 * - max-width 1120px — collapse inline search → icon (nav-item-search / nav-button-search).
 * - max-width 768px — hide desktop-only tools (nav-button-desktop, e.g. watchlist).
 * Skin swap (nav-desktop vs nav-mobile) stays at 640px via src/theme.ts.
 */

.vector-chrome-header__nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-100, 16px);
  min-height: 66px;
  padding: var(--spacing-50, 8px) var(--spacing-100, 16px);
}

.vector-chrome-header__start {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
}

.vector-chrome-header__menu-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  min-width: var(--size-icon-medium, 32px);
  min-height: var(--size-icon-medium, 32px);
  margin: 0;
  padding: var(--spacing-25, 4px);
  padding-inline-start: var(--spacing-50, 8px);
  border: none;
  background: transparent;
  color: var(--color-base, #202122);
  line-height: 0;
  cursor: default;
  pointer-events: none;
}

.vector-chrome-header :slotted(.chrome-header__menu-btn) {
  flex-shrink: 0;
  min-width: var(--size-icon-medium, 32px);
  height: var(--size-icon-medium, 32px);
  margin: 0;
  padding: var(--spacing-25, 4px);
  padding-inline-start: var(--spacing-50, 8px);
}

.vector-chrome-header__menu-icon :deep(svg) {
  display: block;
}

.vector-chrome-header__brand-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: inherit;
}

.vector-chrome-header__brand-link:hover {
  text-decoration: none;
  color: inherit;
}

.vector-chrome-header__wordmarks {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 2px;
  padding-block: 3px;
  padding-inline-start: var(--spacing-75, 12px);
  margin-inline-start: var(--spacing-50, 8px);
  width: 152px;
  min-height: 44px;
}

.vector-chrome-header__inline-search {
  display: flex;
  flex: 1 1 auto;
  align-items: stretch;
  gap: 0;
  max-width: 474px;
  padding-inline-start: var(--spacing-150, 24px);
}

.vector-chrome-header__inline-search .vector-chrome-header__search {
  flex: 1;
  min-width: 0;
  max-width: 32rem;
}

.vector-chrome-header__search-submit.cdx-button {
  align-self: stretch;
  border-radius: 0 var(--border-radius-base, 2px) var(--border-radius-base, 2px) 0;
  margin-inline-start: -1px;
}

.vector-chrome-header__search-icon-toggle {
  display: none;
}

.vector-chrome-header__end {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-inline-start: auto;
}

.vector-chrome-header__logged-out-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-75, 12px);
  margin-inline: var(--spacing-8, 8px);
}

.vector-chrome-header__text-link {
  color: var(--color-progressive, #36c);
  font-size: var(--font-size-medium, 1rem);
  font-weight: normal;
  line-height: 1.4;
  text-decoration: none;
}

a.vector-chrome-header__text-link:hover {
  text-decoration: underline;
}

.vector-chrome-header__username-display {
  margin-inline: var(--spacing-8, 8px);
}

.vector-chrome-header__end .cdx-button {
  min-width: var(--size-icon-medium, 32px);
  height: var(--size-icon-medium, 32px);
  padding: 0.5rem 0.4rem;
}

/*
 * Home and the user menu carry visible labels, so they size to their content
 * and never shrink — the narrow-viewport rule below squares every end-cluster
 * button off at 40px, which would clip the label. Three classes outrank it.
 */
.vector-chrome-header__end .vector-chrome-header__home.cdx-button,
.vector-chrome-header__end .vector-chrome-header__user-menu :deep(.cdx-button) {
  width: auto;
  flex-shrink: 0;
  gap: var(--spacing-25, 4px);
  padding-inline: var(--spacing-50, 8px);
  white-space: nowrap;
}

/* Menu items read as links: base-coloured icon, progressive label. */
.vector-chrome-header__user-menu :deep(.cdx-menu-item .cdx-menu-item__icon) {
  color: var(--color-base, #202122);
}

.vector-chrome-header__user-menu :deep(.cdx-menu-item .cdx-menu-item__text__label) {
  color: var(--color-progressive, #36c);
}

.vector-chrome-header[data-theme='dark'] .vector-chrome-header__wordmark-img,
.vector-chrome-header[data-theme='dark'] .vector-chrome-header__tagline-img {
  opacity: 0;
}

@media (max-width: 1120px) {
  .vector-chrome-header__inline-search {
    display: none;
  }

  .vector-chrome-header__search-icon-toggle {
    display: inline-flex;
  }

  .vector-chrome-header__end .cdx-button {
    height: var(--size-icon-large, 40px);
    width: var(--size-icon-large, 40px);
    padding: 0.7rem;
  }
}

@media (max-width: 768px) {
  .vector-chrome-header__hide-narrow {
    display: none !important;
  }
}
</style>
