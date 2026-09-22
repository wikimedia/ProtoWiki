<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CdxButton, CdxIcon, CdxMenuButton } from '@wikimedia/codex'
import { cdxIconEllipsis, cdxIconHelpNotice, cdxIconPushPin } from '@wikimedia/codex-icons'
import { useSkin } from '@/composables/useSkin'
import WikitabCard from './WikitabCard.vue'
import { useEqualRowHeights } from './useEqualRowHeights'
import { useRevealOnScrollEnd } from './useRevealOnScrollEnd'
import { useSectionReveal } from './useSectionReveal'
import type { WikitabCardData, WikitabSectionSpec } from './sections'

const props = defineProps<{
  spec: WikitabSectionSpec
  items: WikitabCardData[]
  loading: boolean
  error: string | null
  pinned: boolean
}>()

const emit = defineEmits<{
  'toggle-pin': []
}>()

const items = computed(() => props.items)
const { reserved, ready, revealing, hasMore, revealMore } = useSectionReveal(props.spec, items)

const skin = useSkin()

const scroller = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)
const observeScrollEnd = computed(() => skin.value === 'mobile' && !props.error && hasMore.value)

useRevealOnScrollEnd({
  scroller,
  sentinel,
  enabled: observeScrollEnd,
  onReach: revealMore,
})

const rowColumns = computed(() => (skin.value === 'desktop' ? 2 : 1))

useEqualRowHeights({
  container: scroller,
  columns: rowColumns,
  cardHeight: computed(() => props.spec.cardHeight),
  enabled: computed(() => !props.error),
  watchKeys: [computed(() => reserved.value), computed(() => ready.value)],
})

const slots = computed(() =>
  Array.from({ length: reserved.value }, (_, index) => ({
    card: props.items[index],
    loading: index >= ready.value,
  })),
)

/*
 * The row is always rendered so the sections below never move; only the control
 * inside it comes and goes. While the feed is still loading we can't yet know
 * whether a section has more, so it shows as disabled rather than hidden.
 */
const isEmpty = computed(() => !props.loading && !props.error && props.items.length === 0)

const canShowMore = computed(() => props.loading || hasMore.value)
const showMoreDisabled = computed(() => props.loading || revealing.value)

const selection = ref<string | number | null>(null)
const menuItems = computed(() => [
  {
    value: 'pin',
    label: props.pinned ? 'Unpin from top' : 'Pin to top',
    icon: cdxIconPushPin,
  },
])
const footerItem = computed(() => ({
  value: 'about',
  label: `About ${props.spec.heading}`,
  icon: cdxIconHelpNotice,
}))

watch(selection, (value) => {
  if (value === 'pin') emit('toggle-pin')
  if (value !== null) selection.value = null
})
</script>

<template>
  <section class="wikitab-section" :style="{ '--wikitab-card-height': `${spec.cardHeight}px` }">
    <div class="wikitab-section__head">
      <div class="wikitab-section__title">
        <CdxIcon
          v-if="pinned"
          class="wikitab-section__pin"
          :icon="cdxIconPushPin"
          icon-label="Pinned to top"
        />
        <h2 class="wikitab-section__heading">{{ spec.heading }}</h2>
      </div>
      <CdxMenuButton
        v-model:selected="selection"
        class="wikitab-section__menu"
        weight="quiet"
        :menu-items="menuItems"
        :footer="footerItem"
        :aria-label="`${spec.heading} options`"
      >
        <CdxIcon :icon="cdxIconEllipsis" />
      </CdxMenuButton>
    </div>

    <p v-if="error" class="wikitab-section__error"><small>{{ error }}</small></p>

    <p v-else-if="isEmpty" class="wikitab-section__empty"><small>Nothing to show right now.</small></p>

    <div v-else ref="scroller" class="wikitab-section__cards">
      <WikitabCard
        v-for="(slot, index) in slots"
        :key="index"
        class="wikitab-section__card"
        :variant="spec.variant"
        :height="spec.cardHeight"
        :thumbnail-size="spec.thumbnailSize"
        :card="slot.card"
        :supporting-icon="spec.supportingIcon"
        :full-hook="spec.fullHook"
        :loading="slot.loading"
      />
      <div ref="sentinel" class="wikitab-section__sentinel" aria-hidden="true" />
    </div>

    <div class="wikitab-section__more">
      <CdxButton
        v-if="canShowMore"
        class="wikitab-section__more-button"
        action="progressive"
        weight="quiet"
        :disabled="showMoreDisabled"
        @click="revealMore"
      >
        Show more
      </CdxButton>
    </div>
  </section>
</template>

<style scoped>
.wikitab-section {
  display: flex;
  flex-direction: column;
}

.wikitab-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-50);
  margin-bottom: var(--spacing-50);
}

.wikitab-section__title {
  display: flex;
  align-items: center;
  gap: var(--spacing-25);
  min-width: 0;
}

.wikitab-section__pin {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.wikitab-section__heading {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
  color: var(--color-base);
}

/* Codex has no "subtle" button action, and the design's ellipsis is quieter than
   the heading beside it. */
.wikitab-section__menu :deep(.cdx-icon) {
  color: var(--color-subtle);
}

/* Holds the reserved height rather than collapsing the section. */
.wikitab-section__error,
.wikitab-section__empty {
  display: flex;
  align-items: center;
  margin: 0;
  min-height: var(--wikitab-card-height);
  color: var(--color-subtle);
}

/*
 * Home feed cards use a compact type scale (14px body / 12px small). Codex tokens
 * are rem-based, so shadow them on the card scroller — not on `.wikitab` — so the
 * search results page keeps Codex defaults (16px body).
 */
.wikitab-section__cards {
  --font-size-small: 0.75rem;
  --font-size-medium: 0.875rem;
  --line-height-small: 1.25rem;
  --line-height-medium: 1.375rem;
}

.wikitab-section__sentinel {
  flex: 0 0 1px;
  width: 1px;
}

.wikitab-section__more {
  display: flex;
  justify-content: center;
  /* Reserved even when empty, so revealing or exhausting a section shifts nothing. */
  min-height: var(--line-height-small);
  margin-top: var(--spacing-50);
}

/* Desktop: a two-column grid inside the centred column. */
[data-skin='desktop'] .wikitab-section__cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  gap: var(--spacing-100);
}

/* Grid items default to min-height: auto; row heights come from useEqualRowHeights. */
[data-skin='desktop'] .wikitab-section__card {
  min-height: 0;
}

[data-skin='desktop'] .wikitab-section__sentinel {
  display: none;
}

/*
 * Mobile: one horizontally scrolling row that deliberately bleeds past the right
 * edge, so it reads as continuable rather than complete.
 */
[data-skin='mobile'] .wikitab-section__cards {
  display: flex;
  align-items: stretch;
  gap: var(--spacing-100);
  /* Cancel the page gutter so the row scrolls edge to edge, then reinstate it
     as padding so the first card still lines up with the heading. */
  margin-inline: calc(var(--wikitab-page-gutter) * -1);
  padding-inline: var(--wikitab-page-gutter);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  /* Without this, snapping to a card's start edge scrolls straight past the
     row's start padding and the first card sits flush to the viewport edge. */
  scroll-padding-inline-start: var(--wikitab-page-gutter);
  scrollbar-width: none;
}

[data-skin='mobile'] .wikitab-section__cards::-webkit-scrollbar {
  display: none;
}

[data-skin='mobile'] .wikitab-section__card {
  flex: 0 0 320px;
  align-self: stretch;
  min-height: var(--wikitab-card-height);
  scroll-snap-align: start;
}

/* Mobile reveals on scroll, so the button would be redundant. */
[data-skin='mobile'] .wikitab-section__more {
  display: none;
}
</style>
