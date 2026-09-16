<script setup lang="ts">
import { computed } from 'vue'
import WikitabSection from './WikitabSection.vue'
import WikitabSearch from './WikitabSearch.vue'
import { useWikitabFeed } from './useWikitabFeed'
import { useWikitabPinned } from './useWikitabPinned'

definePage({
  meta: {
    title: 'Wikitab',
    description: 'New tab home',
    platform: 'web',
  },
})

const { sections, loading, error } = useWikitabFeed()
const { isPinned, togglePin, orderSections } = useWikitabPinned()

const orderedSections = computed(() => orderSections(sections.value))
</script>

<template>
  <div class="wikitab">
    <header class="wikitab__hero">
      <h1 class="wikitab__wordmark">Wikitab</h1>
      <WikitabSearch class="wikitab__search" />
    </header>

    <div class="wikitab__sections">
      <WikitabSection
        v-for="section in orderedSections"
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

/* Elevate the whole hero while search is open so the menu covers section links. */
.wikitab__hero:has(.wikitab-search--expanded) {
  position: relative;
  z-index: 10;
}

.wikitab__wordmark {
  margin: 0;
  font-family: var(--font-family-serif);
  font-size: var(--font-size-xxx-large);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-xxx-large);
  color: var(--color-base);
}

.wikitab__search {
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
  padding-block: var(--spacing-200) var(--spacing-400);
}

[data-skin='mobile'] .wikitab__sections {
  gap: var(--spacing-300);
}
</style>
