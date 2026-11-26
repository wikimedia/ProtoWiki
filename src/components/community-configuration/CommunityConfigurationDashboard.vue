<script setup lang="ts">
/**
 * `Special:CommunityConfiguration`: what Community Configuration is, then a
 * card for each feature, linking to its editor page at `<basePath>/<id>`.
 * Wrap it in `ChromeWrapper`. Copy is the extension's own English messages.
 */
import { RouterLink } from 'vue-router'

import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'

import type { CommunityConfigurationFeature } from './types'

defineProps<{
  features: readonly CommunityConfigurationFeature[]
  /** The dashboard's own route; each feature's editor page is `<basePath>/<id>`. */
  basePath: string
}>()

const LEARN_MORE_URL =
  'https://www.mediawiki.org/wiki/Special:MyLanguage/Help:Community_configuration'
const FEEDBACK_URL = 'https://www.mediawiki.org/wiki/Talk:Growth'
</script>

<template>
  <SpecialPageWrapper title="Community Configuration" class="cc-dashboard">
    <section>
      <h3>What is Community Configuration?</h3>
      <p>
        Community Configuration is a tool that allows communities to set up and control the
        configuration of different Wikipedia features, helping administrators suit their community
        specific needs.
      </p>

      <div class="cc-dashboard__guidelines">
        <div class="cc-dashboard__guideline">
          <h4>Learn more</h4>
          <p>
            <a :href="LEARN_MORE_URL" target="_blank">Learn more</a> about Community Configuration,
            what it is, how it works, and the team’s ongoing work on it.
          </p>
        </div>
        <div class="cc-dashboard__guideline">
          <h4>Send us your feedback</h4>
          <p>
            We would love to hear your thoughts! Reach out to us through our
            <a :href="FEEDBACK_URL" target="_blank">talk page</a>.
          </p>
        </div>
      </div>
    </section>

    <section class="cc-dashboard__features">
      <h3>Features</h3>
      <div class="cc-dashboard__grid">
        <div v-for="feature in features" :key="feature.id" class="cc-dashboard__feature">
          <RouterLink :to="`${basePath}/${feature.id}`">{{ feature.title }}</RouterLink>
          <p>{{ feature.description }}</p>
        </div>
        <!-- As the extension: two empty cards keep a short last row in the grid's columns. -->
        <div class="cc-dashboard__offset" />
        <div class="cc-dashboard__offset" />
      </div>
    </section>
  </SpecialPageWrapper>
</template>

<style scoped>
/* The extension's card width (`@dashboardCardWidth`): two columns on Vector, one on Minerva. */
.cc-dashboard {
  --cc-card-width: 426px;

  padding-bottom: var(--spacing-300);
}

.cc-dashboard__guidelines {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-50);
}

.cc-dashboard__guideline {
  box-sizing: content-box; /* As the cards, below. */
  flex: 1;
  min-width: min(calc(100% - 2rem), var(--cc-card-width));
  padding: 0 var(--spacing-75);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-progressive-subtle);
}

.cc-dashboard__features {
  padding-top: var(--spacing-100);
}

.cc-dashboard__grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--spacing-50);
  padding-top: var(--spacing-100);
}

/*
 * PROTOWIKI+ The global reset makes every box border-box. The extension's
 * sizes are content-box (a card is 426px plus its padding and border), so its
 * columns break at the same widths as on wiki.
 */
.cc-dashboard__feature,
.cc-dashboard__offset {
  box-sizing: content-box;
}

.cc-dashboard__feature {
  flex-grow: 1;
  width: var(--cc-card-width);
  padding: var(--spacing-100);
  border: var(--border-width-base) var(--border-style-base) var(--border-color-base);
  border-radius: var(--border-radius-base);
}

/* As the extension: the feature name is a bold link. */
.cc-dashboard__feature a {
  font-weight: var(--font-weight-bold);
}

.cc-dashboard__offset {
  flex-grow: 1;
  width: calc(var(--cc-card-width) + 2 * var(--spacing-100) + 2 * var(--border-width-base));
}
</style>
