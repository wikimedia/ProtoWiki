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

const { sections, error, isSectionLoading } = useWikitabFeed({ enabled: feedEnabled })
const { isPinned, togglePin, orderSections } = useWikitabPinned()

const orderedSections = computed(() => orderSections(sections.value))
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
        v-for="section in orderedSections"
        :key="section.spec.id"
        :spec="section.spec"
        :items="section.items"
        :loading="isSectionLoading(section.spec.id)"
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
 * Typography: Codex defaults for wordmark, section headings, and search results
 * (16px body). Home feed cards shadow a compact scale on `.wikitab-section__cards`
 * (14px body) — see WikitabSection.vue.
 */
[data-skin='desktop'] .wikitab {
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
</style>
