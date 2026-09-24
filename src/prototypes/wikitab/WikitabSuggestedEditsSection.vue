<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CdxButton, CdxIcon, CdxMenuButton } from '@wikimedia/codex'
import { cdxIconEllipsis, cdxIconEyeClosed, cdxIconHelpNotice, cdxIconPushPin } from '@wikimedia/codex-icons'

import { useSkin } from '@/composables/useSkin'
import WikitabCard from './WikitabCard.vue'
import { WIKITAB_SUGGESTED_EDITS_MODULE_SPEC, type WikitabCardData } from './sections'
import { useEqualRowHeights } from './useEqualRowHeights'
import { usePreventHorizontalSwipeNavigation } from './usePreventHorizontalSwipeNavigation'
import { useRevealOnScrollEnd } from './useRevealOnScrollEnd'

const spec = WIKITAB_SUGGESTED_EDITS_MODULE_SPEC

const props = defineProps<{
  items: WikitabCardData[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  error: string | null
  pinned: boolean
  isArticleSaved: (title: string) => boolean
}>()

const emit = defineEmits<{
  'toggle-pin': []
  'hide-section': []
  'hide-article': [title: string]
  'toggle-save': [card: WikitabCardData]
  'load-more': []
}>()

function cardArticleTitle(card: WikitabCardData): string {
  return card.title ?? card.linkTitle ?? ''
}

const skin = useSkin()
const scroller = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)

/** Slots on screen — grows with Show more / scroll-end, not tied to fetch batching. */
const reserved = ref(spec.initialCount)

const bufferedHasMore = computed(() => props.items.length > reserved.value)
const fetchHasMore = computed(() => props.hasMore)

const isInitialLoading = computed(() => props.loading && props.items.length === 0)

const canFetchMore = computed(
  () => fetchHasMore.value && !props.loading && reserved.value >= props.items.length,
)

const observeScrollEnd = computed(
  () =>
    skin.value === 'mobile' &&
    !props.error &&
    !isInitialLoading.value &&
    (bufferedHasMore.value || canFetchMore.value),
)

useRevealOnScrollEnd({
  scroller,
  sentinel,
  enabled: observeScrollEnd,
  onReach: revealMore,
})

usePreventHorizontalSwipeNavigation({
  scroller,
  enabled: computed(() => skin.value === 'mobile'),
})

const rowColumns = computed(() => (skin.value === 'desktop' ? 2 : 1))

useEqualRowHeights({
  container: scroller,
  columns: rowColumns,
  cardHeight: computed(() => spec.cardHeight),
  enabled: computed(() => !props.error && !isInitialLoading.value),
  watchKeys: [
    computed(() => reserved.value),
    computed(() => props.items.length),
    computed(() => props.loading),
  ],
})

const slots = computed(() => {
  if (isInitialLoading.value) {
    return Array.from({ length: spec.initialCount }, () => ({
      card: undefined as WikitabCardData | undefined,
      loading: true,
    }))
  }

  return Array.from({ length: reserved.value }, (_, index) => ({
    card: props.items[index],
    loading: (props.loading || props.loadingMore) && index >= props.items.length,
  }))
})

watch(
  () => props.loadingMore,
  (loadingMore, wasLoadingMore) => {
    if (wasLoadingMore && !loadingMore) {
      reserved.value = Math.min(reserved.value, props.items.length)
    }
  },
)

const canShowMore = computed(
  () =>
    props.loading ||
    isInitialLoading.value ||
    bufferedHasMore.value ||
    canFetchMore.value ||
    props.loadingMore,
)

const showMoreDisabled = computed(
  () => props.loading || isInitialLoading.value || props.loadingMore,
)

const selection = ref<string | number | null>(null)
const menuItems = computed(() => [
  {
    value: 'pin',
    label: props.pinned ? 'Unpin from top' : 'Pin to top',
    icon: cdxIconPushPin,
  },
  {
    value: 'hide',
    label: 'Hide',
    icon: cdxIconEyeClosed,
  },
])
const footerItem = computed(() => ({
  value: 'about',
  label: `About ${spec.heading}`,
  icon: cdxIconHelpNotice,
}))

watch(selection, (value) => {
  if (value === 'pin') emit('toggle-pin')
  if (value === 'hide') emit('hide-section')
  if (value !== null) selection.value = null
})

function revealMore(): void {
  if (showMoreDisabled.value) return

  if (bufferedHasMore.value) {
    reserved.value = Math.min(reserved.value + spec.pageSize, props.items.length)
    return
  }

  if (canFetchMore.value) {
    reserved.value += spec.pageSize
    emit('load-more')
  }
}
</script>

<template>
  <section
    class="wikitab-suggested-edits-section"
    :style="{ '--wikitab-card-height': `${spec.cardHeight}px` }"
  >
    <div class="wikitab-suggested-edits-section__head">
      <div class="wikitab-suggested-edits-section__title">
        <CdxIcon
          v-if="pinned"
          class="wikitab-suggested-edits-section__pin"
          :icon="cdxIconPushPin"
          icon-label="Pinned to top"
        />
        <h2 class="wikitab-suggested-edits-section__heading">{{ spec.heading }}</h2>
      </div>
      <CdxMenuButton
        v-model:selected="selection"
        class="wikitab-suggested-edits-section__menu"
        weight="quiet"
        :menu-items="menuItems"
        :footer="footerItem"
        :aria-label="`${spec.heading} options`"
      >
        <CdxIcon :icon="cdxIconEllipsis" />
      </CdxMenuButton>
    </div>

    <p v-if="error" class="wikitab-suggested-edits-section__error">
      <small>{{ error }}</small>
    </p>

    <div v-else ref="scroller" class="wikitab-suggested-edits-section__cards">
      <WikitabCard
        v-for="(slot, index) in slots"
        :key="slot.card?.key ?? index"
        class="wikitab-suggested-edits-section__card"
        :variant="spec.variant"
        :height="spec.cardHeight"
        :thumbnail-size="spec.thumbnailSize"
        :card="slot.card"
        :loading="slot.loading"
        :show-article-menu="!slot.loading && !!slot.card"
        :hide-menu-section-heading="!slot.loading && slot.card ? spec.heading : undefined"
        :is-saved="slot.card ? isArticleSaved(cardArticleTitle(slot.card)) : false"
        @hide-article="emit('hide-article', $event)"
        @toggle-save="slot.card && emit('toggle-save', slot.card)"
      />
      <div ref="sentinel" class="wikitab-suggested-edits-section__sentinel" aria-hidden="true" />
    </div>

    <div class="wikitab-suggested-edits-section__more">
      <CdxButton
        v-if="canShowMore"
        class="wikitab-suggested-edits-section__more-button"
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
.wikitab-suggested-edits-section {
  display: flex;
  flex-direction: column;
}

.wikitab-suggested-edits-section__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-50);
  margin-bottom: var(--spacing-50);
}

.wikitab-suggested-edits-section__title {
  display: flex;
  align-items: center;
  gap: var(--spacing-25);
  min-width: 0;
}

.wikitab-suggested-edits-section__pin {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.wikitab-suggested-edits-section__heading {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
  color: var(--color-base);
}

.wikitab-suggested-edits-section__menu :deep(.cdx-menu) {
  width: max-content !important;
  min-width: 12rem;
}

.wikitab-suggested-edits-section__menu :deep(.cdx-menu-item__text__label) {
  white-space: nowrap;
}

.wikitab-suggested-edits-section__error {
  display: flex;
  align-items: center;
  margin: 0;
  min-height: var(--wikitab-card-height);
  color: var(--color-subtle);
}

.wikitab-suggested-edits-section__sentinel {
  flex: 0 0 1px;
  width: 1px;
}

.wikitab-suggested-edits-section__more {
  display: flex;
  justify-content: center;
  min-height: var(--line-height-small);
  margin-top: var(--spacing-100);
}

.wikitab-suggested-edits-section__cards {
  --font-size-small: 0.75rem;
  --font-size-medium: 0.875rem;
  --font-size-large: 1rem;
  --line-height-small: 1.25rem;
  --line-height-medium: 1.375rem;
  --line-height-large: 1.375rem;
}

[data-skin='desktop'] .wikitab-suggested-edits-section__cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  gap: var(--spacing-100);
}

[data-skin='desktop'] .wikitab-suggested-edits-section__card {
  min-height: 0;
}

[data-skin='mobile'] .wikitab-suggested-edits-section__cards {
  display: flex;
  align-items: stretch;
  gap: var(--spacing-100);
  margin-inline: calc(var(--wikitab-page-gutter) * -1);
  padding-inline: var(--wikitab-page-gutter);
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scroll-padding-inline-start: var(--wikitab-page-gutter);
  scrollbar-width: none;
}

[data-skin='mobile'] .wikitab-suggested-edits-section__cards::-webkit-scrollbar {
  display: none;
}

[data-skin='mobile'] .wikitab-suggested-edits-section__card {
  flex: 0 0 320px;
  align-self: stretch;
  min-height: var(--wikitab-card-height);
  scroll-snap-align: start;
}

[data-skin='desktop'] .wikitab-suggested-edits-section__sentinel {
  display: none;
}

[data-skin='mobile'] .wikitab-suggested-edits-section__more {
  display: none;
}

.wikitab-suggested-edits-section__card:has(.wikitab-card--has-menu [aria-expanded='true']) {
  overflow: visible;
  z-index: 3;
}
</style>
