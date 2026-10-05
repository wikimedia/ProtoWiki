<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import { CdxButton, CdxIcon, CdxPopover, CdxTextInput } from '@wikimedia/codex'
import {
  cdxIconBookmark,
  cdxIconBookmarkOutline,
  cdxIconDownTriangle,
  cdxIconDownload,
  cdxIconEdit,
  cdxIconEllipsis,
  cdxIconHistory,
  cdxIconLanguage,
  cdxIconSearch,
  cdxIconSettings,
  cdxIconStar,
  cdxIconUnStar,
} from '@wikimedia/codex-icons'

import {
  DEFAULT_ARTICLE_LANGUAGE_LINKS,
  type ArticleLanguageLink,
} from './shared/articleLanguageLinks'
import { useConfig } from '@/composables/useConfig'
import { togglePageInList } from '@/config'
import { globalSkin, PROTOWIKI_CHROME_SKIN } from '@/theme'
import type { Skin } from '@/theme'

const LANG_SEARCH_PLACEHOLDER = 'Search languages'
const DEFAULT_TAGLINE = 'From Wikipedia, the free encyclopedia'

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
}

const props = withDefaults(defineProps<Props>(), {
  languagesCount: 18,
  skin: undefined,
})

const inheritedSkin = inject(PROTOWIKI_CHROME_SKIN)
const effectiveSkin = computed<Skin>(() => props.skin ?? inheritedSkin?.value ?? globalSkin.value)
const { user, currentUserPageLists, setCurrentUserPageList } = useConfig()
const isLoggedOut = computed(() => user.value === 'logged-out')

const pageTitle = computed(() => props.title.trim())

const isWatched = computed(() => currentUserPageLists.value.watchlist.includes(pageTitle.value))

const isBookmarked = computed(() =>
  currentUserPageLists.value.readingList.includes(pageTitle.value),
)

const watchLabel = computed(() => (isWatched.value ? 'Unwatch' : 'Watch'))

const bookmarkAriaLabel = computed(() =>
  isBookmarked.value ? 'Remove bookmark' : 'Bookmark',
)

const languagesButtonLabel = computed(() => {
  const n = props.languagesCount ?? 18
  return n === 1 ? '1 language' : `${n} languages`
})

const emit = defineEmits<{
  talkClick: []
  articleClick: []
  readClick: []
  editClick: []
  historyClick: []
  watchClick: []
  bookmarkClick: []
  downloadClick: []
  moreClick: []
  languageSelect: [link: ArticleLanguageLink]
  languageSettingsClick: []
}>()

const langMenuOpen = ref(false)
const langSearch = ref('')
const langAnchor = ref<HTMLElement | null>(null)

const filteredLanguageLinks = computed(() => {
  const q = langSearch.value.trim().toLowerCase()
  if (!q) return internalLanguageLinks
  return internalLanguageLinks.filter((row) => row.label.toLowerCase().includes(q))
})

watch(langMenuOpen, (open) => {
  if (!open) langSearch.value = ''
})

function closeLangMenu() {
  langMenuOpen.value = false
}

function onLanguagePick(row: ArticleLanguageLink) {
  emit('languageSelect', row)
  closeLangMenu()
}

function toggleWatch() {
  setCurrentUserPageList(
    'watchlist',
    togglePageInList(currentUserPageLists.value.watchlist, pageTitle.value),
  )
  emit('watchClick')
}

function toggleBookmark() {
  setCurrentUserPageList(
    'readingList',
    togglePageInList(currentUserPageLists.value.readingList, pageTitle.value),
  )
  emit('bookmarkClick')
}
</script>

<template>
  <header class="article-header" :data-skin="effectiveSkin">
    <div class="article-header__title-row">
      <h1 class="article-header__title">
        <slot name="title">{{ title }}</slot>
      </h1>
      <div
        v-if="effectiveSkin === 'desktop'"
        ref="langAnchor"
        class="article-header__lang-anchor"
      >
        <CdxButton
          class="article-header__lang-btn"
          weight="quiet"
          action="progressive"
          :aria-expanded="langMenuOpen"
          aria-haspopup="dialog"
          :aria-controls="langMenuOpen ? 'article-header-lang-menu' : undefined"
          @click="langMenuOpen = !langMenuOpen"
        >
          <CdxIcon :icon="cdxIconLanguage" size="small" />
          {{ languagesButtonLabel }}
          <CdxIcon :icon="cdxIconDownTriangle" size="small" />
        </CdxButton>
      </div>
    </div>

    <div class="article-header__toolbar">
      <nav class="article-header__tabs" aria-label="Page tabs">
        <a
          href="#"
          class="article-header__tab article-header__tab--active"
          aria-current="page"
          @click.prevent="$emit('articleClick')"
        >
          Article
        </a>
        <a href="#" class="article-header__tab" @click.prevent="$emit('talkClick')"> Talk </a>
      </nav>

      <nav
        v-if="effectiveSkin === 'desktop'"
        class="article-header__actions"
        :class="{ 'article-header__actions--logged-out': isLoggedOut }"
        aria-label="Page actions"
      >
        <a
          href="#"
          class="article-header__action article-header__action--active"
          aria-current="true"
          @click.prevent="$emit('readClick')"
        >
          Read
        </a>
        <a href="#" class="article-header__action" @click.prevent="$emit('editClick')"> Edit </a>
        <a href="#" class="article-header__action" @click.prevent="$emit('historyClick')">
          View history
        </a>
        <div class="article-header__page-tools">
          <CdxButton
            v-if="!isLoggedOut"
            class="article-header__watch-btn"
            weight="quiet"
            action="progressive"
            :aria-label="watchLabel"
            @click="toggleWatch"
          >
            <CdxIcon :icon="isWatched ? cdxIconUnStar : cdxIconStar" />
            {{ watchLabel }}
          </CdxButton>
          <CdxButton
            v-if="!isLoggedOut"
            weight="quiet"
            :icon-only="true"
            :aria-label="bookmarkAriaLabel"
            @click="toggleBookmark"
          >
            <CdxIcon :icon="isBookmarked ? cdxIconBookmark : cdxIconBookmarkOutline" />
          </CdxButton>
          <CdxButton
            v-if="!isLoggedOut"
            weight="quiet"
            :icon-only="true"
            aria-label="More options"
            class="article-header__more-btn"
            @click="$emit('moreClick')"
          >
            <CdxIcon :icon="cdxIconEllipsis" />
          </CdxButton>
          <CdxButton
            v-else
            weight="quiet"
            :icon-only="true"
            aria-label="More options"
            class="article-header__more-btn"
            @click="$emit('moreClick')"
          >
            <CdxIcon :icon="cdxIconEllipsis" />
          </CdxButton>
        </div>
      </nav>
    </div>

    <div
      v-if="effectiveSkin === 'mobile'"
      class="article-header__icon-toolbar"
      :class="{ 'article-header__icon-toolbar--logged-out': isLoggedOut }"
      aria-label="Page actions"
    >
      <button
        ref="langAnchor"
        type="button"
        class="article-header__icon-tool"
        :aria-expanded="langMenuOpen"
        aria-haspopup="dialog"
        :aria-controls="langMenuOpen ? 'article-header-lang-menu' : undefined"
        aria-label="Languages"
        @click="langMenuOpen = !langMenuOpen"
      >
        <CdxIcon :icon="cdxIconLanguage" />
      </button>
      <div v-if="isLoggedOut" class="article-header__icon-toolbar-group article-header__icon-toolbar-group--end">
        <button
          type="button"
          class="article-header__icon-tool"
          aria-label="Download"
          @click="$emit('downloadClick')"
        >
          <CdxIcon :icon="cdxIconDownload" />
        </button>
        <button
          type="button"
          class="article-header__icon-tool"
          aria-label="Watch"
          @click="$emit('bookmarkClick')"
        >
          <CdxIcon :icon="cdxIconStar" />
        </button>
        <button
          type="button"
          class="article-header__icon-tool"
          aria-label="Edit"
          @click="$emit('editClick')"
        >
          <CdxIcon :icon="cdxIconEdit" />
        </button>
      </div>
      <template v-else>
        <button
          type="button"
          class="article-header__icon-tool"
          aria-label="Watch"
          @click="$emit('bookmarkClick')"
        >
          <CdxIcon :icon="cdxIconUnStar" />
        </button>
        <button
          type="button"
          class="article-header__icon-tool"
          aria-label="View history"
          @click="$emit('historyClick')"
        >
          <CdxIcon :icon="cdxIconHistory" />
        </button>
        <button
          type="button"
          class="article-header__icon-tool"
          aria-label="Edit"
          @click="$emit('editClick')"
        >
          <CdxIcon :icon="cdxIconEdit" />
        </button>
        <button
          type="button"
          class="article-header__icon-tool article-header__icon-tool--more"
          aria-label="More options"
          @click="$emit('moreClick')"
        >
          <CdxIcon :icon="cdxIconEllipsis" />
        </button>
      </template>
    </div>

    <CdxPopover
      v-model:open="langMenuOpen"
      :anchor="langAnchor"
      :placement="effectiveSkin === 'mobile' ? 'bottom-start' : 'bottom-end'"
      render-in-place
    >
      <div id="article-header-lang-menu" class="article-header__lang-panel" @click.stop>
        <CdxTextInput
          v-model="langSearch"
          :start-icon="cdxIconSearch"
          input-type="search"
          :placeholder="LANG_SEARCH_PLACEHOLDER"
          clearable
        />
        <ul class="article-header__lang-list" role="listbox" :aria-label="LANG_SEARCH_PLACEHOLDER">
          <li v-for="row in filteredLanguageLinks" :key="row.href + row.label">
            <a
              class="article-header__lang-link"
              :href="row.href"
              rel="noopener noreferrer"
              role="option"
              @click.prevent="onLanguagePick(row)"
            >
              {{ row.label }}
            </a>
          </li>
        </ul>
        <div class="article-header__lang-footer">
          <CdxButton
            weight="quiet"
            aria-label="Language settings"
            @click="
              () => {
                emit('languageSettingsClick')
                closeLangMenu()
              }
            "
          >
            <CdxIcon :icon="cdxIconSettings" />
          </CdxButton>
        </div>
      </div>
    </CdxPopover>

    <p v-if="effectiveSkin === 'desktop'" class="article-header__tagline">
      {{ DEFAULT_TAGLINE }}
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
  padding-bottom: var(--spacing-25, 4px);
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

/* Match Article / Talk tab typography (toolbar small text, normal weight). */
.article-header__lang-btn,
.article-header__watch-btn {
  font-size: var(--font-size-small, 14px);
  font-weight: var(--font-weight-normal);
}

.article-header__lang-btn {
  padding-block-end: 0;
}

.article-header__lang-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  min-width: min(20rem, 90vw);
  max-height: min(24rem, 70vh);
}

.article-header__lang-panel :deep(.cdx-text-input) {
  flex-shrink: 0;
}

.article-header__lang-list {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
  border: 1px solid var(--border-color-subtle);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-base);
}

.article-header__lang-list li {
  margin: 0;
}

.article-header__lang-link {
  display: block;
  padding: var(--spacing-50, 8px) var(--spacing-65, 12px);
  font-family: var(--font-family-base);
  font-size: var(--font-size-small, 14px);
  color: var(--color-progressive);
  text-decoration: none;
}

.article-header__lang-link:hover {
  text-decoration: underline;
  background-color: var(--background-color-interactive-subtle, #f8f9fa);
}

.article-header__lang-footer {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.article-header__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-100, 16px);
  flex-wrap: wrap;
  padding: 0;
  border-block: 1px solid var(--border-color-subtle);
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-small, 14px);
}

.article-header[data-skin='desktop'] .article-header__toolbar {
  box-sizing: border-box;
  min-height: 34px;
  align-items: stretch;
}

.article-header[data-skin='desktop'] .article-header__tabs,
.article-header[data-skin='desktop'] .article-header__actions {
  align-items: stretch;
}

.article-header[data-skin='desktop'] .article-header__page-tools {
  align-self: stretch;
  align-items: stretch;
}

.article-header__tabs {
  display: flex;
  align-items: center;
  gap: var(--spacing-75, 12px);
  flex-wrap: wrap;
}

.article-header__actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-75, 12px);
  flex-wrap: wrap;
}

/* Logged out: span the toolbar so ellipsis can sit at the far edge. */
.article-header__actions--logged-out {
  flex: 1;
  min-width: 0;
}

.article-header__tab,
.article-header__action {
  display: inline-flex;
  align-items: center;
  padding-block: 0;
  padding-inline: var(--spacing-12, 1px);
  margin: 0;
  color: var(--color-progressive);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.article-header__tab:hover,
.article-header__action:hover {
  text-decoration: underline;
}

.article-header__tab--active,
.article-header__action--active {
  color: var(--color-base);
  border-bottom-color: var(--color-base);
  text-decoration: none;
}

.article-header__page-tools {
  display: flex;
  align-items: center;
  gap: 0;
}

.article-header__page-tools :deep(.cdx-button) {
  min-height: auto;
  padding-block: 0;
}

.article-header[data-skin='desktop'] .article-header__page-tools :deep(.cdx-button) {
  height: 100%;
  min-height: 100%;
  padding-block: 0;
  border-radius: 0;
}

.article-header__actions--logged-out .article-header__page-tools {
  margin-inline-start: auto;
}

/* Vertical kebab — Codex ships only a horizontal ellipsis. */
.article-header__more-btn :deep(.cdx-icon) {
  transform: rotate(90deg);
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
