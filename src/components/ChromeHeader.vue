<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import {
  cdxIconAppearance,
  cdxIconBell,
  cdxIconMenu,
  cdxIconSearch,
  cdxIconTray,
  cdxIconUserAvatar,
  cdxIconWatchlist,
} from '@wikimedia/codex-icons'

import { useConfig } from '@/composables/useConfig'
import { DEFAULT_CHROME_NAV_TOOLS, type ChromeNavTool } from '@/lib/chromeHeader'
import { globalSkin, globalTheme } from '@/lib/theming'
import type { Skin, Theme } from '@/lib/theming'
import PrototypeUserSettingsPopover from './PrototypeUserSettingsPopover.vue'
import SearchBar from './SearchBar.vue'

const { user } = useConfig()

/** Fallback EN CDN SVGs — override via **`wordmarkSrc`** / **`taglineSrc`** / **`mobileWordmarkSrc`**. */
const WIKIPEDIA_WORDMARK_EN =
  'https://en.wikipedia.org/static/images/mobile/copyright/wikipedia-wordmark-en-25.svg'
const WIKIPEDIA_TAGLINE_EN =
  'https://en.wikipedia.org/static/images/mobile/copyright/wikipedia-tagline-en-25.svg'

interface Props {
  /** Local skin override. Sets `data-skin` on the root. */
  skin?: Skin
  /** Local theme override. Sets `data-theme` on the root. */
  theme?: Theme
  /**
   * Desktop chrome: Meta link mock before tool icons (`chrome-header__username-link`);
   * trim; empty hides unless **`#username`** overrides.
   */
  username?: string
  /** Desktop stacked wordmark image URL (`#logo` replaces both lines). */
  wordmarkSrc?: string
  /** Desktop tagline image URL beneath the wordmark. */
  taglineSrc?: string
  /** Minerva wordmark (`#logo` replaces on mobile path). Defaults to **`wordmarkSrc`** then EN constant. */
  mobileWordmarkSrc?: string
  /**
   * Subset/order of mocked Vector tool icons (**desktop only** — mobile bar ignores this).
   * **`#nav`** replaces the whole cluster regardless.
   */
  navTools?: ChromeNavTool[]
}

const props = withDefaults(defineProps<Props>(), {
  skin: undefined,
  theme: undefined,
  username: undefined,
  wordmarkSrc: undefined,
  taglineSrc: undefined,
  mobileWordmarkSrc: undefined,
  navTools: undefined,
})

const effectiveSkin = computed<Skin>(() => props.skin ?? globalSkin.value)
const effectiveTheme = computed<Theme>(() => props.theme ?? globalTheme.value)
const isDesktop = computed(() => effectiveSkin.value === 'desktop')
const isMobile = computed(() => effectiveSkin.value === 'mobile')
const trimmedUsername = computed(() => (props.username ?? '').trim())
const showChromeUsernameLink = computed(() => trimmedUsername.value.length > 0)
const isLoggedOut = computed(() => user.value === 'logged-out')

const desktopWordmarkSrc = computed(() => props.wordmarkSrc ?? WIKIPEDIA_WORDMARK_EN)
const desktopTaglineSrc = computed(() => props.taglineSrc ?? WIKIPEDIA_TAGLINE_EN)
const mobileWordmarkResolved = computed(
  () => props.mobileWordmarkSrc ?? props.wordmarkSrc ?? WIKIPEDIA_WORDMARK_EN,
)

const effectiveNavTools = computed(() =>
  props.navTools?.length ? props.navTools : DEFAULT_CHROME_NAV_TOOLS,
)

function navHas(tool: ChromeNavTool): boolean {
  return effectiveNavTools.value.includes(tool)
}
</script>

<template>
  <header
    class="chrome-header"
    :class="{
      'chrome-header--desktop': isDesktop,
      'chrome-header--mobile': isMobile,
    }"
    :data-skin="effectiveSkin"
    :data-theme="effectiveTheme"
  >
    <!-- Vector 2022–style chrome (desktop skin) -->
    <nav v-if="isDesktop" class="chrome-header__nav-desktop" aria-label="Site">
      <div class="chrome-header__desktop-start">
        <!-- Mock only — not interactive (FakeMediaWiki uses bare chrome / icon affordances). -->
        <span class="chrome-header__menu-icon" aria-hidden="true">
          <CdxIcon :icon="cdxIconMenu" />
        </span>

        <RouterLink class="chrome-header__brand-link" to="/" aria-label="Visit the main page">
          <slot name="logo">
            <span class="chrome-header__wordmarks">
              <img
                class="chrome-header__wordmark-img"
                :src="desktopWordmarkSrc"
                width="120"
                height="18"
                alt="Wikipedia"
              />
              <img
                class="chrome-header__tagline-img"
                :src="desktopTaglineSrc"
                width="120"
                height="14"
                alt=""
              />
            </span>
          </slot>
        </RouterLink>
      </div>

      <div class="chrome-header__inline-search">
        <div class="chrome-header__search">
          <SearchBar />
        </div>
        <CdxButton
          class="chrome-header__search-submit"
          tag="a"
          href="https://en.wikipedia.org/wiki/Special:Search"
        >
          Search
        </CdxButton>
      </div>

      <div class="chrome-header__desktop-end">
        <CdxButton
          class="chrome-header__search-icon-toggle"
          weight="quiet"
          aria-label="Search"
          tag="a"
          href="https://en.wikipedia.org/wiki/Special:Search"
        >
          <CdxIcon :icon="cdxIconSearch" />
        </CdxButton>
        <slot name="username">
          <div v-if="isLoggedOut" class="chrome-header__logged-out-toolbar">
            <a
              class="chrome-header__text-link"
              href="https://donate.wikimedia.org/"
              rel="noopener noreferrer"
            >
              Donate
            </a>
            <PrototypeUserSettingsPopover v-slot="{ toggle, open }">
              <button
                type="button"
                class="chrome-header__text-link chrome-header__text-link--button"
                aria-label="Prototype user"
                :aria-expanded="open"
                @click="toggle"
              >
                Create account
              </button>
            </PrototypeUserSettingsPopover>
            <a
              class="chrome-header__text-link"
              href="https://en.wikipedia.org/w/index.php?title=Special:UserLogin"
              rel="noopener noreferrer"
            >
              Log in
            </a>
          </div>
          <a
            v-else-if="showChromeUsernameLink"
            class="chrome-header__text-link chrome-header__username-display"
            href="#"
            @click.prevent
          >
            {{ trimmedUsername }}
          </a>
        </slot>
        <slot v-if="!isLoggedOut" name="nav">
          <CdxButton v-if="navHas('appearance')" weight="quiet" aria-label="Appearance">
            <CdxIcon :icon="cdxIconAppearance" />
          </CdxButton>
          <CdxButton
            v-if="navHas('notifications')"
            weight="quiet"
            aria-label="Notifications"
          >
            <CdxIcon :icon="cdxIconBell" />
          </CdxButton>
          <CdxButton v-if="navHas('notices')" weight="quiet" aria-label="Notices">
            <CdxIcon :icon="cdxIconTray" />
          </CdxButton>
          <CdxButton
            v-if="navHas('watchlist')"
            weight="quiet"
            class="chrome-header__hide-narrow"
            aria-label="Watchlist"
          >
            <CdxIcon :icon="cdxIconWatchlist" />
          </CdxButton>
          <PrototypeUserSettingsPopover v-if="navHas('user')" v-slot="{ toggle, open }">
            <CdxButton
              class="chrome-header__user-btn"
              weight="quiet"
              aria-label="Prototype user"
              :aria-expanded="open"
              @click="toggle"
            >
              <CdxIcon :icon="cdxIconUserAvatar" />
              <span class="chrome-header__dropdown-chevron" aria-hidden="true" />
            </CdxButton>
          </PrototypeUserSettingsPopover>
        </slot>
      </div>
    </nav>

    <!-- Minerva-style chrome (mobile skin) -->
    <nav v-else class="chrome-header__nav-mobile" aria-label="Site">
      <CdxButton weight="quiet" size="large" aria-label="Main menu">
        <CdxIcon :icon="cdxIconMenu" />
      </CdxButton>

      <RouterLink class="chrome-header__mobile-brand" to="/" aria-label="Visit the main page">
        <slot name="logo">
          <img
            class="chrome-header__mobile-wordmark-img"
            :src="mobileWordmarkResolved"
            alt="Wikipedia"
          />
        </slot>
      </RouterLink>

      <div class="chrome-header__mobile-actions">
        <CdxButton
          weight="quiet"
          size="large"
          aria-label="Search"
          tag="a"
          href="https://en.wikipedia.org/wiki/Special:Search"
        >
          <CdxIcon :icon="cdxIconSearch" />
        </CdxButton>
        <CdxButton
          weight="quiet"
          size="large"
          aria-label="Notifications"
        >
          <CdxIcon :icon="cdxIconBell" />
        </CdxButton>
        <PrototypeUserSettingsPopover v-slot="{ toggle, open }">
          <CdxButton
            class="chrome-header__mobile-user-btn"
            weight="quiet"
            size="large"
            aria-label="Prototype user"
            :aria-expanded="open"
            @click="toggle"
          >
            <CdxIcon :icon="cdxIconUserAvatar" size="large" />
          </CdxButton>
        </PrototypeUserSettingsPopover>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.chrome-header {
  background-color: var(--background-color-base, #fff);
}

/* Minerva bar separates from content; Vector desktop chrome stays flush (no bottom rule). */
.chrome-header[data-skin='mobile'] {
  border-bottom: 1px solid var(--border-color-subtle, #c8ccd1);
}

.chrome-header__search {
  min-width: 0;
}

.chrome-header__wordmark-img,
.chrome-header__tagline-img {
  display: block;
  width: auto;
  max-width: 100%;
}

/* ---------- Desktop (Vector) ---------- */
/*
 * Breakpoint parity with FakeMediaWiki `src/views/SpecialView/style.css`:
 * - max-width 1120px — collapse inline search → icon (nav-item-search / nav-button-search).
 * - max-width 768px — hide desktop-only tools (nav-button-desktop, e.g. watchlist).
 * Skin swap (nav-desktop vs nav-mobile) stays at 640px via src/lib/theming.ts.
 */

.chrome-header[data-skin='desktop'] .chrome-header__nav-desktop {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-100, 16px);
  min-height: 66px;
  padding: var(--spacing-50, 8px) var(--spacing-100, 16px);
}

.chrome-header[data-skin='desktop'] .chrome-header__desktop-start {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
}

.chrome-header[data-skin='desktop'] .chrome-header__menu-icon {
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

.chrome-header[data-skin='desktop'] .chrome-header__menu-icon :deep(svg) {
  display: block;
}

.chrome-header[data-skin='desktop'] .chrome-header__brand-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: inherit;
}

.chrome-header[data-skin='desktop'] .chrome-header__brand-link:hover {
  text-decoration: none;
  color: inherit;
}

.chrome-header[data-skin='desktop'] .chrome-header__wordmarks {
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

.chrome-header[data-skin='desktop'] .chrome-header__inline-search {
  display: flex;
  flex: 1 1 auto;
  align-items: stretch;
  gap: 0;
  max-width: 474px;
  padding-inline-start: var(--spacing-150, 24px);
}

.chrome-header[data-skin='desktop'] .chrome-header__inline-search .chrome-header__search {
  flex: 1;
  min-width: 0;
  max-width: 32rem;
}

.chrome-header[data-skin='desktop'] .chrome-header__search-submit.cdx-button {
  align-self: stretch;
  border-radius: 0 var(--border-radius-base, 2px) var(--border-radius-base, 2px) 0;
  margin-inline-start: -1px;
}

.chrome-header[data-skin='desktop'] .chrome-header__search-icon-toggle {
  display: none;
}

.chrome-header[data-skin='desktop'] .chrome-header__desktop-end {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.2rem;
  margin-inline-start: auto;
}

.chrome-header[data-skin='desktop'] .chrome-header__logged-out-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-75, 12px);
  margin-inline: var(--spacing-8, 8px);
}

.chrome-header[data-skin='desktop'] .chrome-header__text-link {
  color: var(--color-progressive, #36c);
  font-size: var(--font-size-medium, 1rem);
  font-weight: normal;
  line-height: 1.4;
  text-decoration: none;
}

.chrome-header[data-skin='desktop'] a.chrome-header__text-link:hover,
.chrome-header[data-skin='desktop'] button.chrome-header__text-link--button:hover {
  text-decoration: underline;
}

.chrome-header[data-skin='desktop'] button.chrome-header__text-link--button {
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  font: inherit;
}

.chrome-header[data-skin='desktop'] .chrome-header__username-display {
  margin-inline: var(--spacing-8, 8px);
}

.chrome-header[data-skin='desktop'] .chrome-header__desktop-end .cdx-button {
  min-width: var(--size-icon-medium, 32px);
  height: var(--size-icon-medium, 32px);
  padding: 0.5rem 0.4rem;
}

.chrome-header[data-skin='desktop'] .chrome-header__dropdown-chevron {
  display: inline-block;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  transform: scale(0.5);
  background-color: var(--color-base, #202122);
  mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="%23000"><path d="m17.5 4.75-7.5 7.5-7.5-7.5L1 6.25l9 9 9-9z"/></svg>');
  mask-repeat: no-repeat;
  mask-position: center;
}

.chrome-header[data-skin='desktop'] .chrome-header__user-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25, 4px);
  overflow: visible;
}

@media (max-width: 1120px) {
  .chrome-header[data-skin='desktop'] .chrome-header__inline-search {
    display: none;
  }

  .chrome-header[data-skin='desktop'] .chrome-header__search-icon-toggle {
    display: inline-flex;
  }

  /* Icon-only tools stay square; user menu needs width for avatar + chevron (FM parity). */
  .chrome-header[data-skin='desktop']
    .chrome-header__desktop-end
    .cdx-button:not(.chrome-header__user-btn) {
    height: var(--size-icon-large, 40px);
    width: var(--size-icon-large, 40px);
    padding: 0.7rem;
  }

  .chrome-header[data-skin='desktop'] .chrome-header__desktop-end .chrome-header__user-btn {
    width: auto;
    min-width: var(--size-icon-large, 40px);
    height: var(--size-icon-large, 40px);
    padding: 0.45rem 0.5rem;
  }

}

@media (max-width: 768px) {
  .chrome-header[data-skin='desktop'] .chrome-header__hide-narrow {
    display: none !important;
  }
}

/* ---------- Mobile (Minerva-style bar) ---------- */

.chrome-header[data-skin='mobile'] .chrome-header__nav-mobile {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  min-height: 3.375em;
  padding: 0 var(--spacing-100, 16px) 0 var(--spacing-50, 8px);
  background-color: var(--background-color-interactive, #eaecf0);
  box-shadow: inset 0 -1px 3px 0 rgba(0, 0, 0, 0.08);
}

.chrome-header[data-skin='mobile'] .chrome-header__nav-mobile > .cdx-button:first-of-type {
  flex-shrink: 0;
}

.chrome-header[data-skin='mobile'] .chrome-header__mobile-brand {
  flex: 0 1 auto;
  max-width: fit-content;
  min-width: 0;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
}

.chrome-header[data-skin='mobile'] .chrome-header__mobile-brand:hover {
  text-decoration: none;
  color: inherit;
}

.chrome-header[data-skin='mobile'] .chrome-header__mobile-wordmark-img {
  display: block;
  height: 21px;
  width: auto;
  opacity: 0.67;
}

.chrome-header[data-theme='dark'] .chrome-header__wordmark-img,
.chrome-header[data-theme='dark'] .chrome-header__tagline-img,
.chrome-header[data-theme='dark'][data-skin='mobile'] .chrome-header__mobile-wordmark-img {
  opacity: 0;
}

.chrome-header[data-skin='mobile'] .chrome-header__mobile-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--spacing-25, 4px);
  margin-inline-start: auto;
}

/* Equal square touch targets for search, notifications, and user (Minerva parity). */
.chrome-header[data-skin='mobile'] .chrome-header__mobile-actions .cdx-button,
.chrome-header[data-skin='mobile'] .chrome-header__mobile-user-btn {
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

.chrome-header[data-skin='mobile'] .prototype-user-settings-popover {
  width: var(--size-icon-large, 40px);
}

.chrome-header[data-skin='mobile'] .prototype-user-settings-popover__trigger {
  width: 100%;
  justify-content: center;
}
</style>
