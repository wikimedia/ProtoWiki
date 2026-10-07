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
import { changeSavedId } from './data/savedCardHelpers'
import type { WikitabSearchActivityItem } from './data/fetchWikitabSearchActivity'
import { WIKITAB_REVIEW_CHANGES_MODULE_SPEC } from './sections'
import WikitabSearchActivityCard from './WikitabSearchActivityCard.vue'
import WikitabSearchLoadingCard from './WikitabSearchLoadingCard.vue'
import { usePreventHorizontalSwipeNavigation } from './usePreventHorizontalSwipeNavigation'
import { useRevealOnScrollEnd } from './useRevealOnScrollEnd'

const spec = WIKITAB_REVIEW_CHANGES_MODULE_SPEC

const props = defineProps<{
  items: WikitabSearchActivityItem[]
  loading: boolean
  fillingInitial: boolean
  pending: boolean
  loadingMore: boolean
  hasMore: boolean
  error: string | null
  pinned: boolean
  isCardSaved: (id: string) => boolean
}>()

const emit = defineEmits<{
  'toggle-pin': []
  'refresh-section': []
  'hide-section': []
  'load-more': []
  dismiss: [revid: number]
  'toggle-save': [item: WikitabSearchActivityItem]
}>()

const skin = useSkin()
const scroller = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)

/** Slots on screen — grows with Show more / scroll-end, not tied to fetch batching. */
const reserved = ref(spec.initialCount)

const bufferedHasMore = computed(() => props.items.length > reserved.value)

const isInitialLoading = computed(
  () =>
    props.items.length === 0 &&
    (props.loading || props.pending || props.fillingInitial),
)

const isEmpty = computed(
  () =>
    !props.loading &&
    !props.pending &&
    !props.fillingInitial &&
    !props.error &&
    props.items.length === 0,
)

function shouldClampReserved(): boolean {
  return (
    !props.loading &&
    !props.pending &&
    !props.fillingInitial &&
    !props.loadingMore &&
    (!props.hasMore || props.items.length >= spec.initialCount)
  )
}

function syncReservedToItems(length: number): void {
  if (length > 0 && reserved.value === 0) {
    reserved.value = Math.min(length, spec.initialCount)
    return
  }
  if (!shouldClampReserved()) return
  if (length < reserved.value) {
    reserved.value = length
  }
}

const observeScrollEnd = computed(
  () =>
    skin.value === 'mobile' &&
    !props.error &&
    !isInitialLoading.value &&
    !props.pending &&
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

const slots = computed(() => {
  if (isInitialLoading.value) {
    return Array.from({ length: spec.initialCount }, (_, index) => ({
      item: undefined as WikitabSearchActivityItem | undefined,
      loading: true,
      key: `loading-${index}`,
    }))
  }

  return Array.from({ length: reserved.value }, (_, index) => ({
    item: props.items[index],
    loading:
      (props.fillingInitial || props.loadingMore) && index >= props.items.length,
    key: props.items[index]?.revid ?? `slot-${index}`,
  }))
})

watch(() => props.items.length, syncReservedToItems, { immediate: true })

watch(
  () => props.loadingMore,
  (loadingMore, wasLoadingMore) => {
    if (wasLoadingMore && !loadingMore) {
      reserved.value = Math.min(reserved.value, props.items.length)
    }
  },
)

watch(
  () => props.hasMore,
  () => {
    if (shouldClampReserved() && props.items.length < reserved.value) {
      reserved.value = props.items.length
    }
  },
)

watch(
  () =>
    props.items.length === 0 &&
    (props.loading || props.pending || props.fillingInitial),
  (isRefreshing) => {
    if (isRefreshing) reserved.value = spec.initialCount
  },
)

const canShowMore = computed(
  () =>
    !props.error &&
    !isEmpty.value &&
    (props.items.length > 0 || props.loadingMore),
)

const showMoreDisabled = computed(
  () =>
    props.loading ||
    props.fillingInitial ||
    props.pending ||
    isInitialLoading.value ||
    props.loadingMore,
)

const selection = ref<string | number | null>(null)
const menuItems = computed(() => [
  {
    value: 'refresh',
    label: 'Refresh',
    icon: cdxIconReload,
  },
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
  if (value === 'refresh') emit('refresh-section')
  if (value === 'hide') emit('hide-section')
  if (value !== null) selection.value = null
})

function revealMore(): void {
  if (showMoreDisabled.value) return

  const targetReserved = reserved.value + spec.pageSize
  reserved.value = Math.min(targetReserved, props.items.length)

  if (reserved.value < targetReserved) {
    reserved.value = targetReserved
    if (props.hasMore) {
      emit('load-more')
      return
    }
    reserved.value = props.items.length
  }
}
</script>

<template>
  <section class="wikitab-review-changes-section">
    <div class="wikitab-review-changes-section__head">
      <div class="wikitab-review-changes-section__title">
        <CdxIcon
          v-if="pinned"
          class="wikitab-review-changes-section__pin"
          :icon="cdxIconPushPin"
          icon-label="Pinned to top"
        />
        <h2 class="wikitab-review-changes-section__heading">{{ spec.heading }}</h2>
      </div>
      <CdxMenuButton
        v-model:selected="selection"
        class="wikitab-review-changes-section__menu"
        weight="quiet"
        :menu-items="menuItems"
        :footer="footerItem"
        :aria-label="`${spec.heading} options`"
      >
        <CdxIcon :icon="cdxIconEllipsis" />
      </CdxMenuButton>
    </div>

    <p v-if="error" class="wikitab-review-changes-section__error">
      <small>{{ error }}</small>
    </p>

    <p v-else-if="isEmpty" class="wikitab-review-changes-section__empty">
      <small>Nothing to show right now.</small>
    </p>

    <div v-else ref="scroller" class="wikitab-review-changes-section__cards">
      <template v-for="slot in slots" :key="slot.key">
        <WikitabSearchLoadingCard
          v-if="slot.loading"
          class="wikitab-review-changes-section__card"
          variant="activity"
        />
        <WikitabSearchActivityCard
          v-else-if="slot.item"
          class="wikitab-review-changes-section__card"
          :item="slot.item"
          :show-thumbnail="false"
          show-save-menu
          :is-saved="isCardSaved(changeSavedId(slot.item.revid))"
          @dismiss="emit('dismiss', $event)"
          @toggle-save="emit('toggle-save', slot.item)"
        />
      </template>
      <div ref="sentinel" class="wikitab-review-changes-section__sentinel" aria-hidden="true" />
    </div>

    <div class="wikitab-review-changes-section__more">
      <CdxButton
        v-if="canShowMore"
        class="wikitab-review-changes-section__more-button"
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
.wikitab-review-changes-section {
  display: flex;
  flex-direction: column;
}

.wikitab-review-changes-section__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-50);
  margin-bottom: var(--spacing-50);
}

.wikitab-review-changes-section__title {
  display: flex;
  align-items: center;
  gap: var(--spacing-25);
  min-width: 0;
}

.wikitab-review-changes-section__pin {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.wikitab-review-changes-section__heading {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
  color: var(--color-base);
}

.wikitab-review-changes-section__error,
.wikitab-review-changes-section__empty {
  display: flex;
  align-items: center;
  margin: 0;
  min-height: 120px;
  color: var(--color-subtle);
}

.wikitab-review-changes-section__sentinel {
  flex: 0 0 1px;
  width: 1px;
}

.wikitab-review-changes-section__more {
  display: flex;
  justify-content: center;
  min-height: var(--line-height-small);
  margin-top: var(--spacing-100);
}

.wikitab-review-changes-section__cards {
  --font-size-small: 0.75rem;
  --font-size-medium: 0.875rem;
  --font-size-large: 1rem;
  --line-height-small: 1.25rem;
  --line-height-medium: 1.375rem;
  --line-height-large: 1.375rem;
}

[data-skin='desktop'] .wikitab-review-changes-section__cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  gap: var(--spacing-100);
}

[data-skin='desktop'] .wikitab-review-changes-section__card:not(.wikitab-search-loading-card) {
  min-height: 0;
}

/*
 * No-thumbnail activity cards: optional chip + title, delta, summary, supporting.
 * Desktop grid used to zero min-height on all slots, collapsing these skeletons.
 */
.wikitab-review-changes-section__cards :deep(.wikitab-search-loading-card--activity) {
  min-height: calc(
    2 * var(--spacing-75) + var(--spacing-50) + 1.5rem + 4 * var(--line-height-small) +
      var(--spacing-25) + var(--spacing-50)
  );
}

[data-skin='mobile'] .wikitab-review-changes-section__cards {
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

[data-skin='mobile'] .wikitab-review-changes-section__cards::-webkit-scrollbar {
  display: none;
}

[data-skin='mobile'] .wikitab-review-changes-section__card {
  flex: 0 0 320px;
  align-self: stretch;
  scroll-snap-align: start;
}

[data-skin='desktop'] .wikitab-review-changes-section__sentinel {
  display: none;
}

[data-skin='mobile'] .wikitab-review-changes-section__more {
  display: none;
}

.wikitab-review-changes-section__card:has([aria-expanded='true']) {
  overflow: visible;
  z-index: 3;
}
</style>
