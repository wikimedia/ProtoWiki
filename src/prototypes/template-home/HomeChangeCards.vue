<script setup lang="ts">
/**
 * A module's list of change cards: Codex `CdxCard`s for edits — status chips
 * over the page title, the article's description, the edit summary, then the
 * editor and when. Cards open the diff on Wikipedia in a new tab. While loading
 * it shows flat skeletons of the same shape. As a `feed` (a module's own page)
 * the cards are divider rows.
 */
import { CdxCard, CdxIcon, CdxInfoChip } from '@wikimedia/codex'
import { cdxIconUserAvatar } from '@wikimedia/codex-icons'

import type { ChangeCard } from './loadReviewChanges'

defineProps<{
  cards: readonly ChangeCard[]
  loading?: boolean
  /** Skeletons shown while loading. */
  skeletons: number
  /** Divider rows rather than outlined cards (a module's own page). */
  feed?: boolean
}>()
</script>

<template>
  <div class="home-change-cards" :class="{ 'home-feed': feed }" :aria-busy="loading">
    <template v-if="loading">
      <div v-for="index in skeletons" :key="index" class="home-card-skeleton" aria-hidden="true" />
    </template>

    <CdxCard
      v-for="card in cards"
      v-else
      :key="card.key"
      class="home-change-cards__card"
      :url="card.href"
      target="_blank"
      :separation="feed ? 'divider' : undefined"
    >
      <template #title>
        <!-- CODEX+ CdxCard: no slot above the title, so status chips lead the title slot. -->
        <span v-if="card.chips.length" class="home-change-cards__chips">
          <CdxInfoChip
            v-for="chip in card.chips"
            :key="chip.label"
            :status="chip.status"
            :icon="chip.icon"
          >
            {{ chip.label }}
          </CdxInfoChip>
        </span>
        {{ card.title }}
        <span v-if="card.titleDescription" class="home-change-cards__title-description">
          {{ card.titleDescription }}
        </span>
      </template>
      <template #description>{{ card.summary }}</template>
      <template #supporting-text>
        <span class="home-change-cards__supporting">
          <span class="home-change-cards__supporting-icon">
            <CdxIcon :icon="cdxIconUserAvatar" size="small" />
          </span>
          <span>{{ card.user }}</span>
          <span class="home-change-cards__time">{{ card.ago }}</span>
        </span>
      </template>
    </CdxCard>
  </div>
</template>

<style scoped>
.home-change-cards {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}

/* Chips sit on their own row above the title, in regular weight. */
.home-change-cards__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-25);
  margin-bottom: var(--spacing-50);
  font-weight: var(--font-weight-normal);
}

/* CODEX+ CdxCard: one description slot. The article's description goes under its title. */
.home-change-cards__title-description {
  display: block;
  font-weight: var(--font-weight-normal);
  color: var(--color-subtle);
}

/* The description is the edit summary: the editor's own words, in base colour. */
.home-change-cards__card :deep(.cdx-card__text__description) {
  color: var(--color-base);
  font-style: italic;
}

/*
 * CODEX+ CdxCard: no slot for a timestamp. The supporting line runs the full
 * width with the time at its far end, so it lands in the bottom corner.
 */
.home-change-cards__card :deep(.cdx-card__text) {
  flex-grow: 1;
}

.home-change-cards__supporting {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-25);
}

/* One line box tall, so the icon centres on the first line of text. */
.home-change-cards__supporting-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  height: 1lh;
}

/* On the label's last line when the label wraps (the icon stays with its first). */
.home-change-cards__time {
  flex-shrink: 0;
  align-self: flex-end;
  margin-inline-start: auto;
  padding-inline-start: var(--spacing-50);
  white-space: nowrap;
}

/*
 * CODEX+ No skeleton / loading-placeholder component in Codex.
 * The card's own outline, empty. No fill and no motion. The height matches a
 * typical change card (chip row, title, description, summary, editor).
 */
.home-card-skeleton {
  box-sizing: border-box;
  height: 158px;
  border: var(--border-width-base) var(--border-style-base) var(--border-color-base);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-base);
}

/* A feed: divider rows, so no gap between them, and skeletons are rows too (no outline, a rule between). */
.home-feed {
  gap: 0;
}

.home-feed .home-card-skeleton {
  border-width: 0;
  border-radius: 0;
}

.home-feed .home-card-skeleton + .home-card-skeleton {
  border-top-width: var(--border-width-base);
}
</style>
