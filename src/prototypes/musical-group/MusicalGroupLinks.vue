<script setup lang="ts">
import { computed } from 'vue'

import { CdxProgressBar } from '@wikimedia/codex'

import WikitaExternalLink from './components/WikitaExternalLink.vue'
import type { ExternalLinkCategory, WikidataExternalLink } from './data/types'

interface Props {
  links: WikidataExternalLink[]
  loading?: boolean
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
})

const LINK_SECTIONS: { category: ExternalLinkCategory; title?: string }[] = [
  { category: 'official' },
  { category: 'social', title: 'Socials' },
  { category: 'other', title: 'Other' },
]

const sections = computed(() =>
  LINK_SECTIONS.map(({ category, title }) => ({
    key: category,
    title,
    links: props.links.filter((link) => link.category === category),
  })).filter((section) => section.links.length > 0),
)
</script>

<template>
  <div class="musical-group-links">
    <CdxProgressBar v-if="loading" inline aria-label="Loading links" />

    <p v-else-if="error" class="musical-group-links__empty">{{ error }}</p>

    <p v-else-if="!links.length" class="musical-group-links__empty">No links on Wikidata.</p>

    <div v-else class="musical-group-links__sections">
      <section
        v-for="section in sections"
        :key="section.key"
        class="musical-group-links__section"
        :class="{ 'musical-group-links__section--official': section.key === 'official' }"
      >
        <h4 v-if="section.title" class="musical-group-links__heading">{{ section.title }}</h4>
        <ul class="musical-group-links__list">
          <li v-for="link in section.links" :key="link.url" class="musical-group-links__item">
            <WikitaExternalLink :href="link.url" :label="link.displayText" truncate />
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.musical-group-links__sections {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
}

.musical-group-links__section--official {
  padding-top: var(--spacing-50);
}

.musical-group-links__heading {
  margin: 0 0 var(--spacing-50);
  color: var(--color-base);
}

.musical-group-links__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  margin: 0;
  padding: 0;
  list-style: none;
}

.musical-group-links__item {
  margin: 0;
  min-width: 0;
}

.musical-group-links__item :deep(.wikita-external-link--truncate) {
  max-width: 80%;
}

.musical-group-links__empty {
  margin: 0;
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}
</style>
