<script setup lang="ts">
/**
 * A module's list of discussion cards: Codex `CdxCard`s with no thumbnail — the
 * thread, its noticeboard, then its comments and when — opening the thread on
 * Wikipedia in a new tab. While loading it shows flat skeletons of the same
 * shape. As a `feed` (a module's own page) the cards are divider rows.
 */
import { CdxCard, CdxIcon } from '@wikimedia/codex'
import { cdxIconSpeechBubbles } from '@wikimedia/codex-icons'

import type { DiscussionCard } from './loadActiveDiscussions'

defineProps<{
  cards: readonly DiscussionCard[]
  loading?: boolean
  /** Skeletons shown while loading. */
  skeletons: number
  /** Divider rows rather than outlined cards (a module's own page). */
  feed?: boolean
}>()
</script>

<template>
  <div class="home-discussion-cards" :class="{ 'home-feed': feed }" :aria-busy="loading">
    <template v-if="loading">
      <div v-for="index in skeletons" :key="index" class="home-card-skeleton" aria-hidden="true" />
    </template>

    <CdxCard
      v-for="card in cards"
      v-else
      :key="card.key"
      class="home-discussion-cards__card"
      :url="card.href"
      target="_blank"
      :separation="feed ? 'divider' : undefined"
    >
      <template #title>{{ card.title }}</template>
      <template #description>{{ card.board }}</template>
      <template #supporting-text>
        <span class="home-discussion-cards__supporting">
          <span class="home-discussion-cards__supporting-icon">
            <CdxIcon :icon="cdxIconSpeechBubbles" size="small" />
          </span>
          <span>{{ card.comments }}</span>
          <span class="home-discussion-cards__time">{{ card.ago }}</span>
        </span>
      </template>
    </CdxCard>
  </div>
</template>

<style scoped>
.home-discussion-cards {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}

/*
 * CODEX+ CdxCard: no slot for a timestamp. The supporting line runs the full
 * width with the time at its far end, so it lands in the bottom corner.
 */
.home-discussion-cards__card :deep(.cdx-card__text) {
  flex-grow: 1;
}

.home-discussion-cards__supporting {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-25);
}

/* One line box tall, so the icon centres on the first line of text. */
.home-discussion-cards__supporting-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  height: 1lh;
}

/* On the label's last line when the label wraps (the icon stays with its first). */
.home-discussion-cards__time {
  flex-shrink: 0;
  align-self: flex-end;
  margin-inline-start: auto;
  padding-inline-start: var(--spacing-50);
  white-space: nowrap;
}

/*
 * CODEX+ No skeleton / loading-placeholder component in Codex.
 * The card's own outline, empty. No fill and no motion. The height matches a
 * typical discussion card (title, noticeboard, comments).
 */
.home-card-skeleton {
  box-sizing: border-box;
  height: 107px;
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
