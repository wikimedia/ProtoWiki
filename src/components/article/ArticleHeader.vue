<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import { CdxButton, CdxIcon, CdxMenuButton } from '@wikimedia/codex'
import type { MenuButtonItemData, MenuItemValue } from '@wikimedia/codex'
import {
  cdxIconBookmarkOutline,
  cdxIconDownload,
  cdxIconEdit,
  cdxIconEllipsis,
  cdxIconExpand,
  cdxIconHistory,
  cdxIconLanguage,
  cdxIconStar,
  cdxIconUnStar,
} from '@wikimedia/codex-icons'

import {
  DEFAULT_ARTICLE_LANGUAGE_LINKS,
  type ArticleLanguageLink,
} from './shared/articleLanguageLinks'
import { useConfig } from '@/composables/useConfig'
import { t } from '@/i18n'
import { globalSkin, PROTOWIKI_CHROME_SKIN } from '@/theme'
import type { Skin } from '@/theme'

const internalLanguageLinks = DEFAULT_ARTICLE_LANGUAGE_LINKS

interface Props {
  /** Page title in the Vector-style first heading row (large serif); **`#title`** overrides inner markup. */
  title: string
  /** Shown in the interlanguage control, e.g. **`18`** → “18 languages”. */
  languagesCount?: number
  /**
   * Local skin override. Defaults to the inherited chrome skin (set by
   * `ChromeWrapper` via inject) or the global value from `<html>`.
   * Drives the structural mobile vs desktop layout (icon toolbar vs text actions).
   */
  skin?: Skin
  /**
   * Mobile icon toolbar: watchlist star (default) vs reader bookmark (Minerva
   * “save for later” affordance in onboarding flows).
   */
  bookmarkAffordance?: 'watch' | 'bookmark'
}

const props = withDefaults(defineProps<Props>(), {
  languagesCount: 18,
  skin: undefined,
  bookmarkAffordance: 'watch',
})

const inheritedSkin = inject(PROTOWIKI_CHROME_SKIN)
const effectiveSkin = computed<Skin>(() => props.skin ?? inheritedSkin?.value ?? globalSkin.value)
const { user } = useConfig()
const isLoggedOut = computed(() => user.value === 'logged-out')

const bookmarkLabel = computed(() =>
  props.bookmarkAffordance === 'bookmark' ? t('chrome.bookmark') : t('chrome.watch'),
)
const bookmarkIcon = computed(() =>
  props.bookmarkAffordance === 'bookmark' ? cdxIconBookmarkOutline : cdxIconUnStar,
)
const bookmarkIconLoggedOut = computed(() =>
  props.bookmarkAffordance === 'bookmark' ? cdxIconBookmarkOutline : cdxIconStar,
)

const languagesButtonLabel = computed(() => t('chrome.languagesCount', props.languagesCount ?? 18))

const emit = defineEmits<{
  talkClick: []
  articleClick: []
  readClick: []
  editClick: []
  historyClick: []
  bookmarkClick: []
  downloadClick: []
  moreClick: []
  languageSelect: [link: ArticleLanguageLink]
}>()

const bookmarkAnchor = ref<HTMLElement | null>(null)

defineExpose({ bookmarkAnchor })

/** `https://bg.wikipedia.org/wiki/` → `bg`; `simple` is a subdomain, not a tag. */
function languageTag(href: string): string {
  const subdomain = href.match(/^https?:\/\/([^.]+)\./)?.[1] ?? ''
  return subdomain === 'simple' ? 'en' : subdomain
}

/**
 * One menu for both skins — desktop labels its button “N languages”, mobile
 * reduces it to the language icon in the toolbar.
 *
 * `language` per row so each label shapes and picks fonts in its own language
 * rather than the page's, which matters for the RTL and CJK rows.
 *
 * No `url` on purpose: a Codex item with one renders as an anchor and would
 * navigate away to that wiki. The old popover called `@click.prevent` for the
 * same reason — the row still reaches consumers through `languageSelect`.
 */
const languageMenuItems = computed((): MenuButtonItemData[] =>
  internalLanguageLinks.map((row) => ({
    value: row.href,
    label: row.label,
    language: { label: languageTag(row.href) },
  })),
)

/** Bound with `v-model:selected`; self-clears so no row keeps a checkmark. */
const langSelection = ref<MenuItemValue | null>(null)

watch(langSelection, (value) => {
  if (value === null) return
  const row = internalLanguageLinks.find((link) => link.href === value)
  if (row) emit('languageSelect', row)
  langSelection.value = null
})
</script>

<template>
  <header class="article-header" :data-skin="effectiveSkin">
    <div class="article-header__title-row">
      <h1 class="article-header__title">
        <slot name="title">{{ title }}</slot>
      </h1>
      <div v-if="effectiveSkin === 'desktop'" class="article-header__lang-anchor">
        <CdxMenuButton
          v-model:selected="langSelection"
          class="article-header__languages menu-content-width"
          weight="quiet"
          action="progressive"
          :menu-items="languageMenuItems"
          :menu-config="{ visibleItemLimit: 8 }"
        >
          <CdxIcon :icon="cdxIconLanguage" />
          {{ languagesButtonLabel }}
          <CdxIcon class="article-header__caret" :icon="cdxIconExpand" size="small" />
        </CdxMenuButton>
      </div>
    </div>

    <div class="article-header__toolbar">
      <nav class="article-header__tabs" :aria-label="t('chrome.pageTabs')">
        <a
          href="#"
          class="article-header__tab article-header__tab--active"
          aria-current="page"
          @click.prevent="$emit('articleClick')"
        >
          {{ t('chrome.articleTab') }}
        </a>
        <a href="#" class="article-header__tab" @click.prevent="$emit('talkClick')">
          {{ t('chrome.talk') }}
        </a>
      </nav>

      <nav
        v-if="effectiveSkin === 'desktop'"
        class="article-header__actions"
        :aria-label="t('chrome.pageActions')"
      >
        <a
          href="#"
          class="article-header__action article-header__action--active"
          aria-current="true"
          @click.prevent="$emit('readClick')"
        >
          {{ t('chrome.read') }}
        </a>
        <a href="#" class="article-header__action" @click.prevent="$emit('editClick')">
          {{ t('chrome.edit') }}
        </a>
        <a href="#" class="article-header__action" @click.prevent="$emit('historyClick')">
          {{ t('chrome.viewHistory') }}
        </a>
        <CdxButton
          class="article-header__icon-btn"
          weight="quiet"
          :aria-label="bookmarkLabel"
          @click="$emit('bookmarkClick')"
        >
          <CdxIcon :icon="bookmarkIcon" />
        </CdxButton>
      </nav>
    </div>

    <div
      v-if="effectiveSkin === 'mobile'"
      class="article-header__icon-toolbar"
      :class="{ 'article-header__icon-toolbar--logged-out': isLoggedOut }"
      :aria-label="t('chrome.pageActions')"
    >
      <CdxMenuButton
        v-model:selected="langSelection"
        class="article-header__languages article-header__lang-tool menu-content-width"
        weight="quiet"
        :menu-items="languageMenuItems"
        :menu-config="{ visibleItemLimit: 8 }"
        :aria-label="t('chrome.languages')"
      >
        <CdxIcon :icon="cdxIconLanguage" />
      </CdxMenuButton>
      <div v-if="isLoggedOut" class="article-header__icon-toolbar-group article-header__icon-toolbar-group--end">
        <button
          type="button"
          class="article-header__icon-tool"
          :aria-label="t('chrome.download')"
          @click="$emit('downloadClick')"
        >
          <CdxIcon :icon="cdxIconDownload" />
        </button>
        <button
          ref="bookmarkAnchor"
          type="button"
          class="article-header__icon-tool"
          :aria-label="bookmarkLabel"
          @click="$emit('bookmarkClick')"
        >
          <CdxIcon :icon="bookmarkIconLoggedOut" />
        </button>
        <button
          type="button"
          class="article-header__icon-tool"
          :aria-label="t('chrome.edit')"
          @click="$emit('editClick')"
        >
          <CdxIcon :icon="cdxIconEdit" />
        </button>
      </div>
      <template v-else>
        <button
          ref="bookmarkAnchor"
          type="button"
          class="article-header__icon-tool"
          :aria-label="bookmarkLabel"
          @click="$emit('bookmarkClick')"
        >
          <CdxIcon :icon="bookmarkIcon" />
        </button>
        <button
          type="button"
          class="article-header__icon-tool"
          :aria-label="t('chrome.viewHistory')"
          @click="$emit('historyClick')"
        >
          <CdxIcon :icon="cdxIconHistory" />
        </button>
        <button
          type="button"
          class="article-header__icon-tool"
          :aria-label="t('chrome.edit')"
          @click="$emit('editClick')"
        >
          <CdxIcon :icon="cdxIconEdit" />
        </button>
        <button
          type="button"
          class="article-header__icon-tool article-header__icon-tool--more"
          :aria-label="t('chrome.moreOptions')"
          @click="$emit('moreClick')"
        >
          <CdxIcon :icon="cdxIconEllipsis" />
        </button>
      </template>
    </div>

    <p v-if="effectiveSkin === 'desktop'" class="article-header__tagline">
      {{ t('chrome.articleTagline') }}
    </p>
  </header>
</template>

<style scoped>
.article-header {
  background-color: var(--background-color-base);
}

.article-header__title-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--spacing-100, 16px);
  padding-bottom: var(--spacing-50, 8px);
}

.article-header__title {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-family: var(--font-family-serif);
  font-size: 2rem;
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-xxx-small, 1.375);
  color: var(--color-base);
}

.article-header__lang-anchor {
  position: relative;
  flex-shrink: 0;
}

.article-header__languages.cdx-button {
  display: inline-flex;
  gap: var(--spacing-25, 4px);
  align-items: center;
}

.article-header__caret {
  flex-shrink: 0;
}

.article-header__toolbar {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: var(--spacing-100, 16px);
  flex-wrap: wrap;
  padding: 0;
  border-block: 1px solid var(--border-color-subtle);
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small, 14px);
}

.article-header__tabs,
.article-header__actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  flex-wrap: wrap;
}

.article-header__tab,
.article-header__action {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25, 4px);
  padding: var(--spacing-25, 4px);
  margin: 0;
  color: var(--color-progressive);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.article-header__tab:hover,
.article-header__action:hover {
  text-decoration: none;
}

.article-header__tab--active,
.article-header__action--active {
  color: var(--color-base);
  font-weight: var(--font-weight-normal);
  border-bottom-color: var(--color-base);
  text-decoration: none;
}

.article-header__icon-btn {
  margin-inline-start: var(--spacing-25, 2px);
  color: var(--color-base);
}

.article-header__tagline {
  margin: var(--spacing-50, 8px) 0 0;
  padding: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-small, 14px);
  color: var(--color-base);
}

/* Mobile (Minerva) icon toolbar — replaces the desktop text actions row. */
.article-header__icon-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-50, 8px) 0;
  border-bottom: 1px solid var(--border-color-subtle);
  margin-bottom: 0;
}

.article-header__icon-toolbar--logged-out {
  justify-content: flex-start;
}

.article-header__icon-toolbar-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-25, 4px);
}

.article-header__icon-toolbar-group--end {
  margin-inline-start: auto;
}

.article-header__icon-tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  min-width: 36px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: var(--border-radius-base, 2px);
  cursor: pointer;
}

.article-header__icon-tool .cdx-icon {
  color: var(--color-subtle);
}

.article-header__icon-tool:hover {
  background-color: var(--background-color-button-quiet--hover, rgba(0, 24, 73, 0.027));
}

.article-header__icon-tool:focus-visible {
  outline: 2px solid var(--color-progressive, #36c);
  outline-offset: -2px;
}

/* CdxMenuButton wraps its button in a <div>, so the icon-tool geometry has to
   land on the inner button — otherwise the language tool's hover and hit area
   are Codex's 32px against the 36px of the plain tools beside it. */
.article-header__lang-tool :deep(.cdx-button) {
  width: 36px;
  height: 36px;
  min-width: 36px;
  padding: 0;
  border-radius: var(--border-radius-base, 2px);
}

.article-header__lang-tool :deep(.cdx-icon) {
  color: var(--color-subtle);
}

/* Vertical kebab — Codex ships only a horizontal ellipsis, so we rotate it
   to match Wikipedia's mobile-web overflow affordance. */
.article-header__icon-tool--more :deep(.cdx-icon) {
  transform: rotate(90deg);
}

.article-header[data-skin='mobile'] .article-header__title {
  font-size: 1.625rem;
}

.article-header[data-skin='mobile'] .article-header__title-row {
  padding-bottom: 0;
}

.article-header[data-skin='mobile'] .article-header__toolbar {
  /* No top rule under the page title; no bottom on the row wrapper — the tab
     strip carries the divider (see `.article-header__tabs` below). */
  border-top: none;
  border-bottom: none;
  padding-top: var(--spacing-35, 6px);
}

.article-header[data-skin='mobile'] .article-header__tabs {
  width: 100%;
  align-items: flex-end;
  padding-bottom: 0;
  margin-bottom: 0;
  border-bottom: 1px solid var(--border-color-subtle);
}

.article-header[data-skin='mobile'] .article-header__tab {
  margin-bottom: -1px;
  color: var(--color-subtle);
  font-weight: var(--font-weight-bold);
}

.article-header[data-skin='mobile'] .article-header__tab:hover {
  color: var(--color-subtle);
  text-decoration: none;
}

.article-header[data-skin='mobile'] .article-header__tab--active {
  color: var(--color-subtle);
  border-bottom-color: var(--color-subtle);
  font-weight: var(--font-weight-bold);
}
</style>
