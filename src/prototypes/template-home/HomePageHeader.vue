<script setup lang="ts">
/**
 * The Home's title over production's tabs — Homepage (this page), User page and
 * Talk — styled as each skin's page tabs: Vector 2022's under the title rule,
 * Minerva's bold grey strip. User page and Talk are the account's pages on
 * Wikipedia.
 */
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { useConfig } from '@/composables/useConfig'

defineProps<{ title: string }>()

const route = useRoute()
const { displayName, lang } = useConfig()

const wikiUrl = (page: string) =>
  `https://${lang.value || 'en'}.wikipedia.org/wiki/${encodeURIComponent(page.replace(/ /g, '_')).replace(/%3A/g, ':')}`

const userPageHref = computed(() => wikiUrl(`User:${displayName.value}`))
const talkHref = computed(() => wikiUrl(`User talk:${displayName.value}`))
</script>

<template>
  <header class="home-page-header">
    <h1 class="home-page-header__title">{{ title }}</h1>
    <nav class="home-page-header__tabs" aria-label="Page tabs">
      <RouterLink
        :to="route.fullPath"
        class="home-page-header__tab home-page-header__tab--active"
        aria-current="page"
      >
        Homepage
      </RouterLink>
      <a :href="userPageHref" class="home-page-header__tab">User page</a>
      <a :href="talkHref" class="home-page-header__tab">Talk</a>
    </nav>
  </header>
</template>

<style scoped>
/* The gap `SpecialPageWrapper` leaves under its own header. */
.home-page-header {
  margin-bottom: var(--spacing-100);
}

/*
 * Serif on both skins, as in production: Vector 2022's `#firstHeading`, and on
 * Minerva GrowthExperiments forces it over Minerva's sans special-page titles
 * (`Homepage.less`, `.growthexperiments-homepage-mobile-summary`).
 */
.home-page-header__title {
  margin: 0;
  padding: 0;
  border-bottom: 1px solid var(--border-color-base);
  font-family: var(--font-family-serif);
  font-size: 1.8rem;
  font-weight: var(--font-weight-normal);
  line-height: 1.375;
  color: var(--color-base);
}

.home-page-header__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-100);
  border-bottom: 1px solid var(--border-color-subtle);
  font-family: var(--font-family-base);
  font-size: var(--font-size-small);
}

/* Vector 2022: blue link tabs; the current one is base-coloured over a 2px rule. */
.home-page-header__tab {
  margin-bottom: -1px;
  padding-block: var(--spacing-25);
  border-bottom: 2px solid transparent;
  color: var(--color-progressive);
  text-decoration: none;
}

.home-page-header__tab:hover {
  text-decoration: underline;
}

.home-page-header__tab--active,
.home-page-header__tab--active:hover {
  border-bottom-color: var(--color-base);
  color: var(--color-base);
  text-decoration: none;
}

/* Minerva: GrowthExperiments' 1.7em title with no rule under it, then bold grey tabs. */
[data-skin='mobile'] .home-page-header__title {
  border-bottom: 0;
  font-size: 1.7rem;
}

[data-skin='mobile'] .home-page-header__tabs {
  padding-top: var(--spacing-35);
}

[data-skin='mobile'] .home-page-header__tab,
[data-skin='mobile'] .home-page-header__tab:hover {
  color: var(--color-subtle);
  font-weight: var(--font-weight-bold);
  text-decoration: none;
}

[data-skin='mobile'] .home-page-header__tab--active {
  border-bottom-color: var(--color-subtle);
}
</style>
