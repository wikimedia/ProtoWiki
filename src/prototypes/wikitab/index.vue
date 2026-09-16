<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import WikitabSearch from './WikitabSearch.vue'
import WikitabSearchPage from './WikitabSearchPage.vue'
import WikitabSection from './WikitabSection.vue'
import { useWikitabFeed } from './useWikitabFeed'
import { useWikitabPinned } from './useWikitabPinned'
import { useWikitabSearchMountKey } from './useWikitabSearchMount'

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

const { sections, loading, error } = useWikitabFeed({ enabled: feedEnabled })
const { isPinned, togglePin, orderSections } = useWikitabPinned()

const orderedSections = computed(() => orderSections(sections.value))

const visibleSections = computed(() =>
  loading.value
    ? orderedSections.value
    : orderedSections.value.filter((section) => section.items.length > 0),
)
</script>

<template>
  <div class="wikitab" :class="{ 'wikitab--search': isSearchMode }">
    <header class="wikitab__hero">
      <div class="wikitab__hero-top">
        <h1 class="wikitab__wordmark">Wikitab</h1>
        <WikitabSearch
          :key="searchMountKey"
          class="wikitab__search"
          :initial-query="searchQuery"
        />
      </div>
      <WikitabSearchPage v-if="isSearchMode" class="wikitab__search-page" :search-query="searchQuery" />
    </header>

    <div v-if="!isSearchMode" class="wikitab__sections">
      <WikitabSection
        v-for="section in visibleSections"
        :key="section.spec.id"
        :spec="section.spec"
        :items="section.items"
        :loading="loading"
        :error="error"
        :pinned="isPinned(section.spec.id)"
        @toggle-pin="togglePin(section.spec.id)"
      />
    </div>
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
  gap: var(--spacing-50);
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
 * Codex's type tokens are `rem`-based, so they resolve against the document root
 * and cannot be scaled by a font-size on this element. The desktop scale is
 * therefore set by shadowing the tokens themselves — which also means mobile
 * needs nothing, since Codex's defaults already match the mobile design
 * (16px body / 18px heading / 28px wordmark).
 */
[data-skin='desktop'] .wikitab {
  --font-size-small: 0.75rem;
  --font-size-medium: 0.875rem;
  --font-size-large: 1rem;
  --font-size-xxx-large: 1.625rem;
  --line-height-small: 1.25rem;
  --line-height-medium: 1.375rem;
  --line-height-large: 1.625rem;
  --line-height-xxx-large: 2.25rem;

  align-items: center;
}

[data-skin='desktop'] .wikitab__hero,
[data-skin='desktop'] .wikitab__sections {
  width: 100%;
}

[data-skin='desktop'] .wikitab__hero {
  padding-block: 128px;
}

[data-skin='desktop'] .wikitab__sections {
  gap: var(--spacing-400);
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
  padding-block: calc(var(--spacing-200) + var(--spacing-100)) var(--spacing-400);
}

[data-skin='mobile'] .wikitab__sections {
  gap: var(--spacing-300);
}

/*
 * Search results layout — left-aligned column with per-region max widths:
 * wordmark + search (640px), tabs (full bleed), results (896px).
 * Matches Figma desktop node 237:17943.
 */
[data-skin='desktop'] .wikitab--search {
  align-items: stretch;
  padding-inline: var(--spacing-400);
}

[data-skin='desktop'] .wikitab--search .wikitab__hero {
  align-items: flex-start;
  gap: var(--spacing-150);
  max-width: none;
  padding-block: var(--spacing-400);
}

[data-skin='desktop'] .wikitab--search .wikitab__hero-top {
  align-items: flex-start;
  max-width: 640px;
}

[data-skin='desktop'] .wikitab--search .wikitab__search-page {
  max-width: none;
}

[data-skin='mobile'] .wikitab--search .wikitab__hero {
  align-items: flex-start;
  gap: var(--spacing-100);
  padding-block: calc(var(--spacing-200) + var(--spacing-100)) var(--spacing-100);
}

[data-skin='mobile'] .wikitab--search .wikitab__hero-top {
  align-items: flex-start;
  width: 100%;
}
</style>
