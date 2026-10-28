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
import { wikitabCardBindProps } from './data/wikitabCardPresentation'
import { wikitabCardFeedMenuItems } from './data/wikitabCardMenuItems'
import WikitabCard from './WikitabCard.vue'
import type { SaveItemPayload } from './data/savedCardHelpers'
import {
  WIKITAB_DAILY_READS_MODULE_SPEC,
  type WikitabCardData,
  type WikitabCardLoading,
} from './sections'
import { useEqualRowHeights } from './useEqualRowHeights'
import { usePreventHorizontalSwipeNavigation } from './usePreventHorizontalSwipeNavigation'
import { useRevealOnScrollEnd } from './useRevealOnScrollEnd'

const spec = WIKITAB_DAILY_READS_MODULE_SPEC

const props = defineProps<{
  items: WikitabCardData[]
  /** Card key → fields whose summary backfill is still in flight. */
  pendingByKey?: Map<string, WikitabCardLoading>
  loading: boolean
  fillingInitial: boolean
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
  'hide-article': [title: string]
  'toggle-save': [payload: SaveItemPayload]
  'load-more': []
}>()

const skin = useSkin()
const scroller = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)

/** Slots on screen — grows with Show more / scroll-end, not tied to fetch batching. */
const reserved = ref(spec.initialCount)

const bufferedHasMore = computed(() => props.items.length > reserved.value)

const isInitialLoading = computed(
  () => props.items.length === 0 && (props.loading || props.fillingInitial),
)

const needsInitialTopUp = computed(
  () => props.hasMore && props.items.length > 0 && props.items.length < spec.initialCount,
)

const isEmpty = computed(
  () =>
    !props.loading && !props.fillingInitial && !props.error && props.items.length === 0,
)

function shouldClampReserved(): boolean {
  return (
    !props.loading &&
    !props.fillingInitial &&
    !props.loadingMore &&
    (!props.hasMore || props.items.length >= spec.initialCount)
  )
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
    computed(() => props.pendingByKey),
  ],
})

const slots = computed(() => {
  if (isInitialLoading.value) {
    return Array.from({ length: spec.initialCount }, () => ({
      card: undefined as WikitabCardData | undefined,
      loading: true as WikitabCardLoading,
    }))
  }

  return Array.from({ length: reserved.value }, (_, index) => {
    const card = props.items[index]
    const loading: WikitabCardLoading = card
      ? (props.pendingByKey?.get(card.key) ?? false)
      : props.fillingInitial || props.loadingMore || needsInitialTopUp.value
    return { card, loading }
  })
})

watch(
  () => props.loadingMore,
  (loadingMore, wasLoadingMore) => {
    if (wasLoadingMore && !loadingMore) {
      reserved.value = props.items.length
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
  () => props.fillingInitial,
  (filling, wasFilling) => {
    if (wasFilling && !filling && shouldClampReserved()) {
      reserved.value = Math.min(reserved.value, props.items.length)
    }
  },
)

watch(
  () => props.items.length,
  (length) => {
    if (!shouldClampReserved()) return
    if (length < reserved.value) {
      reserved.value = length
    }
  },
  { immediate: true },
)

watch(
  () => props.items.length === 0 && (props.loading || props.fillingInitial),
  (isRefreshing) => {
    if (isRefreshing) reserved.value = spec.initialCount
  },
)

const canShowMore = computed(() => !props.error && !isEmpty.value)

const showMoreDisabled = computed(
  () =>
    props.loading ||
    props.fillingInitial ||
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

  if (bufferedHasMore.value) {
    reserved.value = Math.min(reserved.value + spec.pageSize, props.items.length)
    return
  }

  reserved.value += spec.pageSize
  emit('load-more')
}
</script>

<template>
  <section
    class="wikitab-daily-reads-section"
    :style="{ '--wikitab-card-height': `${spec.cardHeight}px` }"
  >
    <div class="wikitab-daily-reads-section__head">
      <div class="wikitab-daily-reads-section__title">
        <CdxIcon
          v-if="pinned"
          class="wikitab-daily-reads-section__pin"
          :icon="cdxIconPushPin"
          icon-label="Pinned to top"
        />
        <h2 class="wikitab-daily-reads-section__heading">{{ spec.heading }}</h2>
      </div>
      <CdxMenuButton
        v-model:selected="selection"
        class="wikitab-daily-reads-section__menu"
        weight="quiet"
        :menu-items="menuItems"
        :footer="footerItem"
        :aria-label="`${spec.heading} options`"
      >
        <CdxIcon :icon="cdxIconEllipsis" />
      </CdxMenuButton>
    </div>

    <p v-if="error" class="wikitab-daily-reads-section__error">
      <small>{{ error }}</small>
    </p>

    <p v-else-if="isEmpty" class="wikitab-daily-reads-section__empty">
      <small>Nothing to show right now.</small>
    </p>

    <div v-else ref="scroller" class="wikitab-daily-reads-section__cards">
      <WikitabCard
        v-for="(slot, index) in slots"
        :key="slot.card?.key ?? index"
        class="wikitab-daily-reads-section__card wikitab-section__card"
        v-bind="
          wikitabCardBindProps(spec.primitive, {
            supportingIcon: spec.supportingIcon,
            card: slot.card,
            loading: slot.loading,
            menu:
              slot.loading !== true && slot.card
                ? wikitabCardFeedMenuItems({
                    save: { isSaved: isCardSaved(slot.card.key) },
                    hideFromHeading: spec.heading,
                  })
                : undefined,
          })
        "
        @hide-article="emit('hide-article', $event)"
        @toggle-save="slot.card && emit('toggle-save', { primitive: 'article', card: slot.card })"
      />
      <div ref="sentinel" class="wikitab-daily-reads-section__sentinel" aria-hidden="true" />
    </div>

    <div class="wikitab-daily-reads-section__more">
      <CdxButton
        v-if="canShowMore"
        class="wikitab-daily-reads-section__more-button"
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
.wikitab-daily-reads-section {
  display: flex;
  flex-direction: column;
}

.wikitab-daily-reads-section__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-50);
  margin-bottom: var(--spacing-50);
}

.wikitab-daily-reads-section__title {
  display: flex;
  align-items: center;
  gap: var(--spacing-25);
  min-width: 0;
}

.wikitab-daily-reads-section__pin {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.wikitab-daily-reads-section__heading {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
  color: var(--color-base);
}

.wikitab-daily-reads-section__error,
.wikitab-daily-reads-section__empty {
  display: flex;
  align-items: center;
  margin: 0;
  min-height: var(--wikitab-card-height);
  color: var(--color-subtle);
}

.wikitab-daily-reads-section__sentinel {
  flex: 0 0 1px;
  width: 1px;
}

.wikitab-daily-reads-section__more {
  display: flex;
  justify-content: center;
  min-height: var(--line-height-small);
  margin-top: var(--spacing-100);
}

.wikitab-daily-reads-section__cards {
  --font-size-small: 0.75rem;
  --font-size-medium: 0.875rem;
  --font-size-large: 1rem;
  --line-height-small: 1.25rem;
  --line-height-medium: 1.375rem;
  --line-height-large: 1.375rem;
}

[data-skin='desktop'] .wikitab-daily-reads-section__cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  gap: var(--spacing-100);
}

[data-skin='desktop'] .wikitab-daily-reads-section__card {
  min-height: 0;
}

[data-skin='mobile'] .wikitab-daily-reads-section__cards {
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

[data-skin='mobile'] .wikitab-daily-reads-section__cards::-webkit-scrollbar {
  display: none;
}

[data-skin='mobile'] .wikitab-daily-reads-section__card {
  flex: 0 0 320px;
  align-self: stretch;
  min-height: var(--wikitab-card-height);
  scroll-snap-align: start;
}

[data-skin='desktop'] .wikitab-daily-reads-section__sentinel {
  display: none;
}

[data-skin='mobile'] .wikitab-daily-reads-section__more {
  display: none;
}

.wikitab-daily-reads-section__card:has(.wikitab-card--has-menu [aria-expanded='true']) {
  overflow: visible;
  z-index: 3;
}
</style>
