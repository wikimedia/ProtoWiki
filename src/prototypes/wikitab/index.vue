<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import tabularWordmark from './assets/tabular-wikipedia-wordmark.svg'

import WikitabColorThemeButton from './WikitabColorThemeButton.vue'
import WikitabColorThemePicker from './WikitabColorThemePicker.vue'
import WikitabSearch from './WikitabSearch.vue'
import WikitabSearchPage from './WikitabSearchPage.vue'
import WikitabSection from './WikitabSection.vue'
import {
  colorThemeCycleId,
  colorThemeIsAccentOnWhite,
  colorThemeUsesTintedPageSubtle,
  DEFAULT_COLOR_THEME_ID,
  isDefaultColorTheme,
  type WikitabColorThemeId,
} from './data/wikitabColorThemes'
import { useWikitabColorTheme } from './useWikitabColorTheme'
import { useWikitabFeed } from './useWikitabFeed'
import { useWikitabHiddenArticles } from './useWikitabHiddenArticles'
import { useWikitabPinned } from './useWikitabPinned'
import { bumpWikitabSearchMountKey, useWikitabSearchMountKey } from './useWikitabSearchMount'
import { useWikitabSearchTab } from './useWikitabSearchTab'

definePage({
  meta: {
    title: 'Wikitab',
    description: 'New tab home',
    platform: 'web',
  },
})

const route = useRoute()

const searchQuery = computed(() => String(route.query.search ?? '').trim())
const searchMountKey = useWikitabSearchMountKey()
const isSearchMode = computed(() => searchQuery.value.length > 0)
const feedEnabled = computed(() => !isSearchMode.value)

const { sections, error, isSectionLoading } = useWikitabFeed({ enabled: feedEnabled })
const { isPinned, togglePin, orderSections } = useWikitabPinned()
const { filterCards, hideArticle } = useWikitabHiddenArticles()
const { colorThemeId, themeStyle, setColorTheme } = useWikitabColorTheme()
const { activeTab: searchTab } = useWikitabSearchTab()

const colorPickerOpen = ref(false)
const colorThemeButton = ref<InstanceType<typeof WikitabColorThemeButton> | null>(null)

async function openColorPicker(): Promise<void> {
  colorPickerOpen.value = true
}

async function closeColorPicker(): Promise<void> {
  colorPickerOpen.value = false
  await nextTick()
  colorThemeButton.value?.focusPalette()
}

function selectColorTheme(id: WikitabColorThemeId): void {
  setColorTheme(id)
}

function cycleColorTheme(direction: 'prev' | 'next'): void {
  setColorTheme(colorThemeCycleId(colorThemeId.value, direction))
}

const showColorThemeButton = computed(
  () => !colorPickerOpen.value && (!isSearchMode.value || searchTab.value !== 'images'),
)

const orderedSections = computed(() =>
  orderSections(sections.value).map((section) => ({
    ...section,
    items: filterCards(section.items),
  })),
)

watch(searchQuery, (next, prev) => {
  if (prev.length > 0 && next.length === 0) {
    bumpWikitabSearchMountKey()
  }
})
</script>

<template>
  <div
    class="wikitab"
    :class="{
      'wikitab--search': isSearchMode,
      'wikitab--themed': !isDefaultColorTheme(colorThemeId),
      'wikitab--accent-on-white': colorThemeIsAccentOnWhite(colorThemeId),
      'wikitab--tinted-subtle':
        colorThemeId != null && colorThemeUsesTintedPageSubtle(colorThemeId),
    }"
    :style="themeStyle"
  >
    <div v-show="!colorPickerOpen" class="wikitab__main" :aria-hidden="colorPickerOpen">
      <header class="wikitab__hero">
        <div class="wikitab__hero-top">
          <h1 class="wikitab__wordmark">
            <RouterLink class="wikitab__wordmark-link" :to="{ path: route.path, query: {} }">
              <img
                class="wikitab__wordmark-img"
                :src="tabularWordmark"
                alt="Tabular Wikipedia"
                width="150"
                height="33"
              />
            </RouterLink>
          </h1>
          <WikitabSearch
            :key="searchMountKey"
            class="wikitab__search"
            :initial-query="searchQuery"
          />
        </div>
        <WikitabSearchPage
          v-if="isSearchMode"
          class="wikitab__search-page"
          :search-query="searchQuery"
        />
      </header>

      <div v-if="!isSearchMode" class="wikitab__sections">
        <WikitabSection
          v-for="section in orderedSections"
          :key="section.spec.id"
          :spec="section.spec"
          :items="section.items"
          :loading="isSectionLoading(section.spec.id)"
          :error="error"
          :pinned="isPinned(section.spec.id)"
          @toggle-pin="togglePin(section.spec.id)"
          @hide-article="hideArticle"
        />
      </div>
    </div>

    <WikitabColorThemeButton
      v-if="showColorThemeButton"
      ref="colorThemeButton"
      :aria-expanded="colorPickerOpen"
      @open="openColorPicker"
      @prev="cycleColorTheme('prev')"
      @next="cycleColorTheme('next')"
    />

    <WikitabColorThemePicker
      v-if="colorPickerOpen"
      :selected-id="colorThemeId ?? DEFAULT_COLOR_THEME_ID"
      @close="closeColorPicker"
      @select="selectColorTheme"
    />
  </div>
</template>

<style scoped>
.wikitab {
  --wikitab-page-gutter: var(--spacing-100);

  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  min-height: 100vh;
  padding-inline: var(--wikitab-page-gutter);
  padding-bottom: calc(var(--spacing-400) + var(--spacing-100));
  background-color: var(--background-color-base);
}

.wikitab__main {
  display: flex;
  flex-direction: column;
  width: 100%;
}

[data-skin='desktop'] .wikitab__main {
  align-items: center;
}

.wikitab__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-50);
}

.wikitab__hero-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-100);
  width: 100%;
}

/* Elevate the whole hero while search is open so the menu covers section links. */
.wikitab__hero:has(.wikitab-search--expanded) {
  position: relative;
  z-index: 10;
}

.wikitab__wordmark {
  margin: 0;
}

.wikitab__wordmark-link {
  display: block;
  color: inherit;
  text-decoration: none;
}

.wikitab__wordmark-link:hover,
.wikitab__wordmark-link:focus-visible {
  text-decoration: none;
  opacity: 0.85;
}

.wikitab__wordmark-img {
  display: block;
  height: 33px;
  width: auto;
}

[data-theme='dark'] .wikitab__wordmark-img {
  filter: brightness(0) invert(1);
}

.wikitab__search {
  width: 100%;
}

.wikitab__search-page {
  width: 100%;
}

.wikitab__sections {
  display: flex;
  flex-direction: column;
}

/*
 * Desktop layout (grid, Show more) applies from 640px via `[data-skin]`, but the
 * column width and gutter vary:
 *
 * - Compact (640–767px): full-width column, 16px page gutter — the band between
 *   mobile carousel and the centred wide-desktop column.
 * - Wide (768px+): centred 640px column, 64px page gutter.
 *
 * Typography: compact scale on home feed cards only (`.wikitab-section__cards`).
 * Hero search, section headings, and search results keep Codex defaults (16px body).
 */
[data-skin='desktop'] .wikitab {
  align-items: center;
}

[data-skin='desktop'] .wikitab__hero,
[data-skin='desktop'] .wikitab__sections {
  width: 100%;
}

[data-skin='desktop'] .wikitab__hero {
  padding-top: calc(var(--spacing-400) * 2);
  padding-bottom: calc(var(--spacing-400) * 1);
}

[data-skin='desktop'] .wikitab__sections {
  gap: var(--spacing-300);
}

@media (min-width: 768px) {
  [data-skin='desktop'] .wikitab {
    --wikitab-page-gutter: var(--spacing-400);
  }

  [data-skin='desktop'] .wikitab__hero,
  [data-skin='desktop'] .wikitab__sections {
    max-width: 640px;
  }
}

[data-skin='mobile'] .wikitab__hero {
  padding-block: var(--spacing-400);
}

[data-skin='mobile'] .wikitab__sections {
  gap: var(--spacing-300);
}

/*
 * Search mode — keep hero top padding so the search bar stays put; only tighten
 * spacing below the results. Layout inherits the centred 640px column.
 */
[data-skin='desktop'] .wikitab--search .wikitab__hero {
  gap: var(--spacing-150);
  padding-bottom: var(--spacing-400);
}

[data-skin='mobile'] .wikitab--search .wikitab__hero {
  gap: var(--spacing-100);
  padding-bottom: var(--spacing-100);
}

/*
 * Page chrome on tinted backgrounds — headings/pins use --wikitab-theme-fg (dark on
 * light / lightCards themes, inverted on neutral dark themes). Page-scope progressive
 * (Show more, tab underline) uses --color-progressive — white on lightCards tints.
 * lightCards remap card link tokens below.
 */
.wikitab--themed :deep(.wikitab-section__heading) {
  color: var(--wikitab-theme-fg);
}

/*
 * Page-surface subtle text — hue-tinted on colored backgrounds only. Neutral
 * themes (Dark, Off black, Gray) keep Codex subtle. White card surfaces keep
 * neutral Codex subtle.
 */
.wikitab--themed.wikitab--tinted-subtle,
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-search-page),
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-search-result-card),
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-section) {
  --color-subtle: var(--wikitab-theme-subtle);
}

.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-section__error),
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-section__empty) {
  color: var(--wikitab-theme-subtle);
}

.wikitab--themed :deep(.wikitab-card),
.wikitab--themed :deep(.wikitab-search-activity-card),
.wikitab--themed :deep(.wikitab-search-contribute-card) {
  --color-subtle: var(--wikitab-codex-subtle);
}

.wikitab--themed :deep(.wikitab-section__pin) {
  color: var(--wikitab-theme-fg);
}

.wikitab--themed :deep(.wikitab-color-theme-picker__close .cdx-icon) {
  color: var(--wikitab-theme-fg);
}

/* Section ⋯ and palette — same quiet icon color (Codex neutral, not theme-subtle). */
.wikitab--themed :deep(.wikitab-section__menu .cdx-icon),
.wikitab--themed :deep(.wikitab-color-theme-button .cdx-icon) {
  color: var(--color-neutral);
}

/*
 * Page-chrome quiet buttons (section ⋯, Show more, palette, picker close): Codex hover
 * uses multiply blend + gray/blue subtle fill — replace with theme washes from
 * --wikitab-theme-quiet-* (colorThemePageStyle). No background-color transition.
 */
.wikitab--themed :deep(.wikitab-section__menu .cdx-button.cdx-button--weight-quiet),
.wikitab--themed :deep(.wikitab-section__more-button.cdx-button--weight-quiet),
.wikitab--themed :deep(.wikitab-color-theme-button.cdx-button--weight-quiet),
.wikitab--themed :deep(.wikitab-color-theme-picker__close.cdx-button--weight-quiet) {
  mix-blend-mode: normal;
  background-color: transparent;
  border-color: transparent;
  transition-property: color, border-color, box-shadow;
}

.wikitab--themed :deep(.wikitab-section__menu .cdx-button.cdx-button--weight-quiet:hover),
.wikitab--themed :deep(.wikitab-section__more-button.cdx-button--weight-quiet:hover),
.wikitab--themed :deep(.wikitab-color-theme-button.cdx-button--weight-quiet:hover),
.wikitab--themed :deep(.wikitab-color-theme-picker__close.cdx-button--weight-quiet:hover) {
  background-color: var(--wikitab-theme-quiet-hover-bg);
}

.wikitab--themed :deep(.wikitab-section__menu .cdx-button.cdx-button--weight-quiet:active),
.wikitab--themed
  :deep(.wikitab-section__menu .cdx-button.cdx-button--weight-quiet.cdx-button--is-active),
.wikitab--themed :deep(.wikitab-section__more-button.cdx-button--weight-quiet:active),
.wikitab--themed
  :deep(.wikitab-section__more-button.cdx-button--weight-quiet.cdx-button--is-active),
.wikitab--themed :deep(.wikitab-color-theme-button.cdx-button--weight-quiet:active),
.wikitab--themed :deep(.wikitab-color-theme-button.cdx-button--weight-quiet.cdx-button--is-active),
.wikitab--themed :deep(.wikitab-color-theme-picker__close.cdx-button--weight-quiet:active),
.wikitab--themed
  :deep(.wikitab-color-theme-picker__close.cdx-button--weight-quiet.cdx-button--is-active) {
  background-color: var(--wikitab-theme-quiet-active-bg);
}

/*
 * Themed thumbnail borders on tinted page surfaces only (Articles + Images tabs).
 * White cards (feed, Activity, Contribute) and the search typeahead keep Codex defaults.
 */
.wikitab--themed:not(.wikitab--accent-on-white)
  :deep(.wikitab-search-result-card .cdx-thumbnail__image),
.wikitab--themed:not(.wikitab--accent-on-white)
  :deep(.wikitab-search-result-card .cdx-thumbnail__placeholder) {
  border-color: var(--wikitab-theme-border, var(--border-color-subtle));
}

.wikitab--themed:not(.wikitab--accent-on-white) :deep(.wikitab-search-image-card) {
  border-color: var(--wikitab-theme-border, var(--border-color-subtle));
}

.wikitab--themed:not(.wikitab--accent-on-white)
  :deep(.wikitab-search-result-card .cdx-thumbnail__placeholder) {
  background-color: var(--wikitab-theme-skeleton-bg, var(--background-color-neutral-subtle));
  --color-placeholder: var(--wikitab-theme-skeleton-icon, var(--color-placeholder));
}

/*
 * Card link accent + full Codex progressive tokens (⋯ menu focus ring, etc.).
 * lightCards themes: card accent differs from white page progressive.
 * Search result cards are excluded — transparent on the page tint (Articles tab),
 * so they inherit page-scope progressive (white on Blue bold, Purple bold, etc.).
 */
.wikitab--themed :deep(.wikitab-card),
.wikitab--themed :deep(.wikitab-search-activity-card),
.wikitab--themed :deep(.wikitab-search-contribute-card) {
  --color-progressive: var(--wikitab-theme-card-progressive, var(--color-progressive));
  --color-progressive--hover: var(
    --wikitab-theme-card-progressive--hover,
    var(--color-progressive--hover)
  );
  --color-progressive--active: var(
    --wikitab-theme-card-progressive--active,
    var(--color-progressive--active)
  );
  --color-link: var(--wikitab-theme-card-progressive, var(--color-link));
  --color-link--hover: var(--wikitab-theme-card-progressive--hover, var(--color-link--hover));
  --color-link--active: var(--wikitab-theme-card-progressive--active, var(--color-link--active));
  --color-visited: var(--wikitab-theme-card-progressive, var(--color-visited));
  --color-visited--hover: var(--wikitab-theme-card-progressive--hover, var(--color-visited--hover));
  --color-visited--active: var(
    --wikitab-theme-card-progressive--active,
    var(--color-visited--active)
  );
  --border-color-progressive: var(
    --wikitab-theme-card-progressive,
    var(--border-color-progressive)
  );
  --border-color-progressive--hover: var(
    --wikitab-theme-card-progressive--hover,
    var(--border-color-progressive--hover)
  );
  --border-color-progressive--active: var(
    --wikitab-theme-card-progressive--active,
    var(--border-color-progressive--active)
  );
  --border-color-progressive--focus: var(
    --wikitab-theme-card-progressive,
    var(--border-color-progressive--focus)
  );
  --box-shadow-color-progressive--focus: var(
    --wikitab-theme-card-progressive,
    var(--box-shadow-color-progressive--focus)
  );
  --background-color-progressive: var(
    --wikitab-theme-card-progressive,
    var(--background-color-progressive)
  );
  --background-color-progressive--hover: var(
    --wikitab-theme-card-progressive--hover,
    var(--background-color-progressive--hover)
  );
  --background-color-progressive--active: var(
    --wikitab-theme-card-progressive--active,
    var(--background-color-progressive--active)
  );
  --background-color-progressive-subtle: var(
    --wikitab-theme-card-progressive-subtle,
    var(--background-color-progressive-subtle)
  );
  --background-color-progressive-subtle--hover: var(
    --wikitab-theme-card-progressive-subtle--hover,
    var(--background-color-progressive-subtle--hover)
  );
  --background-color-progressive-subtle--active: var(
    --wikitab-theme-card-progressive-subtle--active,
    var(--background-color-progressive-subtle--active)
  );
}

/* Card ⋯ menus — theme focus ring + open/active wash (Codex quiet defaults to blue). */
.wikitab--themed :deep(.wikitab-card__menu-button .cdx-button.cdx-button--weight-quiet),
.wikitab--themed
  :deep(.wikitab-search-result-card__menu-button .cdx-button.cdx-button--weight-quiet),
.wikitab--themed
  :deep(.wikitab-search-activity-card__menu-button .cdx-button.cdx-button--weight-quiet) {
  mix-blend-mode: normal;
  background-color: transparent;
  border-color: transparent;
  transition-property: color, border-color, box-shadow;
}

.wikitab--themed :deep(.wikitab-card__menu-button .cdx-button.cdx-button--weight-quiet:hover),
.wikitab--themed
  :deep(.wikitab-search-result-card__menu-button .cdx-button.cdx-button--weight-quiet:hover),
.wikitab--themed
  :deep(.wikitab-search-activity-card__menu-button .cdx-button.cdx-button--weight-quiet:hover),
.wikitab--themed
  :deep(.wikitab-card__menu-button .cdx-button.cdx-button--weight-quiet[aria-expanded='true']),
.wikitab--themed
  :deep(
    .wikitab-search-result-card__menu-button
      .cdx-button.cdx-button--weight-quiet[aria-expanded='true']
  ),
.wikitab--themed
  :deep(
    .wikitab-search-activity-card__menu-button
      .cdx-button.cdx-button--weight-quiet[aria-expanded='true']
  ) {
  background-color: var(--wikitab-theme-quiet-hover-bg);
}

.wikitab--themed :deep(.wikitab-card__menu-button .cdx-button.cdx-button--weight-quiet:active),
.wikitab--themed
  :deep(.wikitab-search-result-card__menu-button .cdx-button.cdx-button--weight-quiet:active),
.wikitab--themed
  :deep(.wikitab-search-activity-card__menu-button .cdx-button.cdx-button--weight-quiet:active),
.wikitab--themed
  :deep(.wikitab-card__menu-button .cdx-button.cdx-button--weight-quiet.cdx-button--is-active),
.wikitab--themed
  :deep(
    .wikitab-search-result-card__menu-button
      .cdx-button.cdx-button--weight-quiet.cdx-button--is-active
  ),
.wikitab--themed
  :deep(
    .wikitab-search-activity-card__menu-button
      .cdx-button.cdx-button--weight-quiet.cdx-button--is-active
  ) {
  background-color: var(--wikitab-theme-quiet-active-bg);
}
</style>
