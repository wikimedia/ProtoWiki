<script setup lang="ts">
/**
 * The Active discussions module's body: busy noticeboard threads, most recent
 * reply first. Cards are Codex `CdxCard`s with
 * no thumbnail — the thread, its noticeboard, then its comments and when —
 * opening the thread on Wikipedia in a new tab. Only shown to Experienced
 * editor and Real user (see `index.vue`). Desktop and mobile both reveal more
 * cards in place.
 */
import { computed, ref } from 'vue'
import { CdxButton, CdxCard, CdxIcon } from '@wikimedia/codex'
import { cdxIconCollapse, cdxIconSpeechBubbles } from '@wikimedia/codex-icons'

import { loadActiveDiscussions } from './loadActiveDiscussions'
import { useModuleLoad } from './useModuleLoad'

/** Cards shown at first, and revealed by each "Show more". */
const PAGE_SIZE = 3

const {
  items: discussions,
  loading,
  error,
  reload,
} = useModuleLoad(
  () => 'all',
  (signal) => loadActiveDiscussions(signal),
)

const shown = ref(PAGE_SIZE)
const visible = computed(() => discussions.value.slice(0, shown.value))
const hasMore = computed(() => shown.value < discussions.value.length)
const expanded = computed(() => shown.value > PAGE_SIZE)

function revealMore(): void {
  shown.value += PAGE_SIZE
}

const root = ref<HTMLElement | null>(null)

/** Fold back, and bring the module into view if the reader had scrolled past it. */
function collapse(): void {
  shown.value = PAGE_SIZE
  const el = root.value
  if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' })
}
</script>

<template>
  <div ref="root" class="home-active-discussions">
    <div v-if="error" class="home-active-discussions__error">
      <p>Couldn't load this section.</p>
      <CdxButton weight="quiet" @click="reload">Try again</CdxButton>
    </div>

    <p v-else-if="!loading && !discussions.length" class="home-active-discussions__empty">
      Nothing here right now.
    </p>

    <template v-else>
      <div class="home-active-discussions__cards" :aria-busy="loading">
        <template v-if="loading">
          <div
            v-for="index in PAGE_SIZE"
            :key="index"
            class="home-card-skeleton"
            aria-hidden="true"
          />
        </template>

        <CdxCard
          v-for="card in visible"
          v-else
          :key="card.key"
          class="home-active-discussions__card"
          :url="card.href"
          target="_blank"
        >
          <template #title>{{ card.title }}</template>
          <template #description>{{ card.board }}</template>
          <template #supporting-text>
            <span class="home-active-discussions__supporting">
              <span class="home-active-discussions__supporting-icon">
                <CdxIcon :icon="cdxIconSpeechBubbles" size="small" />
              </span>
              <span>{{ card.comments }}</span>
              <span class="home-active-discussions__time">{{ card.ago }}</span>
            </span>
          </template>
        </CdxCard>
      </div>

      <div v-if="hasMore || expanded" class="home-active-discussions__more-row">
        <CdxButton v-if="hasMore" :disabled="loading" @click="revealMore">Show more</CdxButton>
        <CdxButton
          v-if="expanded"
          class="home-active-discussions__collapse"
          weight="quiet"
          aria-label="Show fewer"
          @click="collapse"
        >
          <CdxIcon :icon="cdxIconCollapse" />
        </CdxButton>
      </div>
    </template>
  </div>
</template>

<style scoped>
.home-active-discussions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}

.home-active-discussions__cards {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}

.home-active-discussions__error,
.home-active-discussions__empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-50);
  margin: 0;
  color: var(--color-subtle);
}

.home-active-discussions__error p {
  margin: 0;
}

/*
 * CODEX+ CdxCard: no slot for a timestamp. The supporting line runs the full
 * width with the time at its far end, so it lands in the bottom corner.
 */
.home-active-discussions__card :deep(.cdx-card__text) {
  flex-grow: 1;
}

.home-active-discussions__supporting {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-25);
}

/* One line box tall, so the icon centres on the first line of text. */
.home-active-discussions__supporting-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  height: 1lh;
}

/* On the label's last line when the label wraps (the icon stays with its first). */
.home-active-discussions__time {
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

/* "Show more" hugs its label at the start, the collapse button sits at the end. */
.home-active-discussions__more-row {
  display: flex;
  align-items: center;
  margin-top: var(--spacing-25);
}

.home-active-discussions__collapse {
  margin-inline-start: auto;
}
</style>
