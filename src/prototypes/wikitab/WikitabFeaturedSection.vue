<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CdxButton, CdxIcon, CdxMenuButton } from '@wikimedia/codex'
import {
  cdxIconEllipsis,
  cdxIconEyeClosed,
  cdxIconHelpNotice,
  cdxIconPushPin,
  cdxIconReload,
} from '@wikimedia/codex-icons'

import { useSkin } from '@/composables/useSkin'
import type { SaveItemPayload } from './data/savedCardHelpers'
import { savedIdForSpotlight } from './data/savedItemIds'
import WikitabCard from './WikitabCard.vue'
import { featuredSpotlightWikitabCardBindProps } from './data/wikitabFeaturedSpotlightCard'
import { wikitabCardIsLoading } from './data/wikitabCardPresentation'
import {
  WIKITAB_FEATURED_MODULE_SPEC,
  WIKITAB_FEATURED_SPOTLIGHT_KINDS,
  WIKITAB_FEATURED_USE_PORTRAIT_IMAGE_CARDS,
  type WikitabCardLoading,
  type WikitabFeaturedSpotlight,
  type WikitabFeaturedSpotlightKind,
} from './sections'
import { useEqualRowHeights } from './useEqualRowHeights'
import { usePreventHorizontalSwipeNavigation } from './usePreventHorizontalSwipeNavigation'
import { useRevealOnScrollEnd } from './useRevealOnScrollEnd'

const spec = WIKITAB_FEATURED_MODULE_SPEC

/** Fixed v1 spotlight catalog size — reserves skeleton slots during load. */
const SPOTLIGHT_COUNT = 6

const props = defineProps<{
  items: WikitabFeaturedSpotlight[]
  /** Per-spotlight fields still loading — items are pre-fetch shells until their fetch lands. */
  loadingByKind?: Partial<Record<WikitabFeaturedSpotlightKind, WikitabCardLoading>>
  loading: boolean
  error: string | null
  pinned: boolean
  isCardSaved: (id: string) => boolean
}>()

const emit = defineEmits<{
  'toggle-pin': []
  'refresh-section': []
  'hide-section': []
  'hide-article': [title: string]
  'toggle-save': [payload: SaveItemPayload]
}>()

function canShowCardMenu(
  spotlight: WikitabFeaturedSpotlight | undefined,
  loading: WikitabCardLoading,
): boolean {
  return !wikitabCardIsLoading(loading) && !!spotlight && !spotlight.unavailable
}

function savePayloadForSpotlight(spot: WikitabFeaturedSpotlight): SaveItemPayload {
  switch (spot.kind) {
    case 'wotd':
      return { primitive: 'word', spotlight: spot }
    case 'qotd':
      return { primitive: 'quote', spotlight: spot }
    case 'tfl':
      return { primitive: 'list', spotlight: spot }
    case 'tfp':
    case 'potd':
      return { primitive: 'image', spotlight: spot }
    default:
      return { primitive: 'article', card: spot }
  }
}

const skin = useSkin()
const scroller = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)

const reserved = ref(spec.initialCount)

const bufferedHasMore = computed(() => props.items.length > reserved.value)

const isInitialLoading = computed(() => props.items.length === 0 && props.loading)

const isEmpty = computed(
  () => !props.loading && !props.error && props.items.length === 0,
)

function shouldClampReserved(): boolean {
  return !props.loading && (!bufferedHasMore.value || props.items.length >= spec.initialCount)
}

const observeScrollEnd = computed(
  () =>
    skin.value === 'mobile' &&
    !props.error &&
    !isEmpty.value &&
    !isInitialLoading.value &&
    (bufferedHasMore.value || props.items.length > 0),
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
    computed(() => props.loadingByKind),
  ],
})

function slotKindForIndex(index: number): WikitabFeaturedSpotlightKind {
  return WIKITAB_FEATURED_SPOTLIGHT_KINDS[index] ?? WIKITAB_FEATURED_SPOTLIGHT_KINDS[0]
}

const slots = computed(() => {
  if (isInitialLoading.value) {
    return Array.from({ length: SPOTLIGHT_COUNT }, (_, index) => ({
      spotlight: undefined as WikitabFeaturedSpotlight | undefined,
      slotKind: slotKindForIndex(index),
      loading: true as WikitabCardLoading,
    }))
  }

  return Array.from({ length: reserved.value }, (_, index) => {
    const spotlight = props.items[index]
    const slotKind = spotlight?.kind ?? slotKindForIndex(index)
    const loading: WikitabCardLoading = spotlight
      ? (props.loadingByKind?.[slotKind] ?? false)
      : props.loading
    return { spotlight, slotKind, loading }
  })
})

watch(
  () => props.items.length,
  (length) => {
    if (!shouldClampReserved()) return
    if (length > 0 && length < reserved.value) {
      reserved.value = length
    }
  },
  { immediate: true },
)

watch(
  () => props.loading,
  (isRefreshing) => {
    if (isRefreshing) reserved.value = spec.initialCount
  },
)

const canShowMore = computed(
  () => !props.error && !isEmpty.value && !isInitialLoading.value && bufferedHasMore.value,
)

const showMoreDisabled = computed(() => props.loading || isInitialLoading.value)

const selection = ref<string | number | null>(null)
const menuItems = computed(() => [
  { value: 'refresh', label: 'Refresh', icon: cdxIconReload },
  {
    value: 'pin',
    label: props.pinned ? 'Unpin from top' : 'Pin to top',
    icon: cdxIconPushPin,
  },
  { value: 'hide', label: 'Hide', icon: cdxIconEyeClosed },
])
const footerItem = computed(() => ({
  value: 'about',
  label: `About ${spec.heading}`,
  icon: cdxIconHelpNotice,
}))

watch(selection, (value) => {
  if (value === 'pin') emit('toggle-pin')
  if (value === 'refresh') emit('refresh-section')
  if (value === 'hide') emit('hide-section')
  if (value !== null) selection.value = null
})

function revealMore(): void {
  if (showMoreDisabled.value) return
  if (bufferedHasMore.value) {
    reserved.value = Math.min(reserved.value + spec.pageSize, props.items.length)
  }
}
</script>

<template>
  <section
    class="wikitab-featured-section"
    :style="{
      '--wikitab-card-height': `${spec.cardHeight}px`,
      '--wikitab-featured-portrait-height': `${spec.portraitCardHeight}px`,
    }"
  >
    <div class="wikitab-featured-section__head">
      <div class="wikitab-featured-section__title">
        <CdxIcon
          v-if="pinned"
          class="wikitab-featured-section__pin"
          :icon="cdxIconPushPin"
          icon-label="Pinned to top"
        />
        <h2 class="wikitab-featured-section__heading">{{ spec.heading }}</h2>
      </div>
      <CdxMenuButton
        v-model:selected="selection"
        class="wikitab-featured-section__menu"
        weight="quiet"
        :menu-items="menuItems"
        :footer="footerItem"
        :aria-label="`${spec.heading} options`"
      >
        <CdxIcon :icon="cdxIconEllipsis" />
      </CdxMenuButton>
    </div>

    <p v-if="error" class="wikitab-featured-section__error">
      <small>{{ error }}</small>
    </p>

    <p v-else-if="isEmpty" class="wikitab-featured-section__empty">
      <small>Nothing to show right now.</small>
    </p>

    <div v-else ref="scroller" class="wikitab-featured-section__cards">
      <WikitabCard
        v-for="(slot, index) in slots"
        :key="slot.spotlight?.key ?? `featured-slot-${index}`"
        class="wikitab-featured-section__card wikitab-section__card"
        :class="{
          'wikitab-featured-section__card--portrait':
            WIKITAB_FEATURED_USE_PORTRAIT_IMAGE_CARDS &&
            (slot.slotKind === 'tfp' || slot.slotKind === 'potd'),
          'wikitab-featured-card--portrait':
            WIKITAB_FEATURED_USE_PORTRAIT_IMAGE_CARDS &&
            (slot.slotKind === 'tfp' || slot.slotKind === 'potd'),
        }"
        v-bind="
          featuredSpotlightWikitabCardBindProps({
            spotlight: slot.spotlight,
            slotKind: slot.slotKind,
            loading: slot.loading,
            showSpotlightLabel: true,
            showCardMenu: canShowCardMenu(slot.spotlight, slot.loading),
            sectionHeading: spec.heading,
            isSaved: slot.spotlight ? isCardSaved(savedIdForSpotlight(slot.spotlight)) : false,
          })
        "
        @hide-article="emit('hide-article', $event)"
        @toggle-save="slot.spotlight && emit('toggle-save', savePayloadForSpotlight(slot.spotlight))"
      />
      <div ref="sentinel" class="wikitab-featured-section__sentinel" aria-hidden="true" />
    </div>

    <div class="wikitab-featured-section__more">
      <CdxButton
        v-if="canShowMore"
        class="wikitab-featured-section__more-button"
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
.wikitab-featured-section {
  display: flex;
  flex-direction: column;
}

.wikitab-featured-section__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-50);
  margin-bottom: var(--spacing-50);
}

.wikitab-featured-section__title {
  display: flex;
  align-items: center;
  gap: var(--spacing-25);
  min-width: 0;
}

.wikitab-featured-section__pin {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.wikitab-featured-section__heading {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
  color: var(--color-base);
}

.wikitab-featured-section__error,
.wikitab-featured-section__empty {
  display: flex;
  align-items: center;
  margin: 0;
  min-height: var(--wikitab-card-height);
  color: var(--color-subtle);
}

.wikitab-featured-section__sentinel {
  flex: 0 0 1px;
  width: 1px;
}

.wikitab-featured-section__more {
  display: flex;
  justify-content: center;
  min-height: var(--line-height-small);
  margin-top: var(--spacing-100);
}

.wikitab-featured-section__cards {
  --font-size-small: 0.75rem;
  --font-size-medium: 0.875rem;
  --font-size-large: 1rem;
  --line-height-small: 1.25rem;
  --line-height-medium: 1.375rem;
  --line-height-large: 1.375rem;
}

[data-skin='desktop'] .wikitab-featured-section__cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  gap: var(--spacing-100);
}

[data-skin='desktop'] .wikitab-featured-section__card {
  min-height: 0;
}

[data-skin='mobile'] .wikitab-featured-section__cards {
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

[data-skin='mobile'] .wikitab-featured-section__cards::-webkit-scrollbar {
  display: none;
}

[data-skin='mobile'] .wikitab-featured-section__card {
  flex: 0 0 320px;
  align-self: stretch;
  min-height: var(--wikitab-card-height);
  scroll-snap-align: start;
}

[data-skin='mobile'] .wikitab-featured-section__card--portrait {
  min-height: var(--wikitab-featured-portrait-height);
}

[data-skin='desktop'] .wikitab-featured-section__sentinel {
  display: none;
}

[data-skin='mobile'] .wikitab-featured-section__more {
  display: none;
}
</style>
