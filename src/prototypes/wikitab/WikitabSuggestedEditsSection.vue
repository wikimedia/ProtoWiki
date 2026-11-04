<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CdxIcon, CdxMenuButton } from '@wikimedia/codex'
import {
  cdxIconEllipsis,
  cdxIconEyeClosed,
  cdxIconPushPin,
  cdxIconReload,
} from '@wikimedia/codex-icons'

import { useSkin } from '@/composables/useSkin'
import { wikitabCardBindProps } from './data/wikitabCardPresentation'
import { wikitabCardFeedMenuItems } from './data/wikitabCardMenuItems'
import WikitabCard from './WikitabCard.vue'
import WikitabModuleHead from './WikitabModuleHead.vue'
import WikitabNothingSavedYet from './WikitabNothingSavedYet.vue'
import WikitabModuleMore from './WikitabModuleMore.vue'
import WikitabModuleRefreshCard from './WikitabModuleRefreshCard.vue'
import {
  suggestionSavedId,
  wikitabCardSaveArticleMenuOption,
  type WikitabSaveArticleMenuLookup,
} from './data/savedCardHelpers'
import {
  WIKITAB_SUGGESTED_EDITS_MODULE_SPEC,
  type WikitabCardData,
  type WikitabCardLoading,
} from './sections'
import type { SaveItemPayload } from './data/savedCardHelpers'
import { useEqualRowHeights } from './useEqualRowHeights'
import { useInfiniteScroll } from './useInfiniteScroll'
import { usePreventHorizontalSwipeNavigation } from './usePreventHorizontalSwipeNavigation'
import { useRestoreReservedOnScreenClose } from './useRestoreReservedOnScreenClose'
import { useRevealOnScrollEnd } from './useRevealOnScrollEnd'
import { wikitabShowMoreDisabled } from './wikitabShowMoreDisabled'

const spec = WIKITAB_SUGGESTED_EDITS_MODULE_SPEC

const props = withDefaults(
  defineProps<{
    items: WikitabCardData[]
    /** Card key → fields whose backfill is still in flight. */
    pendingByKey?: Map<string, WikitabCardLoading>
    loading: boolean
    fillingInitial: boolean
    pending: boolean
    loadingMore: boolean
    hasMore: boolean
    error: string | null
    pinned: boolean
    /**
     * When false, show the seed-prompt empty placeholder immediately — no skeleton
     * or fetch wait (Suggested edits needs saved seed articles).
     */
    hasSeedArticles: boolean
    /** Live saved-articles fingerprint differs from the last fetch. */
    showSavedRefresh?: boolean
    isCardSaved: (id: string) => boolean
    saveArticleMenuLookup: WikitabSaveArticleMenuLookup
    /** Home feed vs fullscreen module screen (`?screen=`). */
    variant?: 'home' | 'screen'
  }>(),
  { variant: 'home' },
)

const emit = defineEmits<{
  'toggle-pin': []
  'refresh-section': []
  'hide-section': []
  'hide-article': [title: string]
  'toggle-save': [payload: SaveItemPayload]
  'toggle-save-article': [card: WikitabCardData]
  'load-more': []
  'open-screen': []
  'close-screen': []
}>()

const isScreen = computed(() => props.variant === 'screen')

const skin = useSkin()
const scroller = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)
const panelRoot = computed(() => scroller.value?.closest('.wikitab-panel') ?? null)

/** Slots on screen — grows with Show more / scroll-end, not tied to fetch batching. */
const reserved = ref(spec.initialCount)

useRestoreReservedOnScreenClose(
  isScreen,
  reserved,
  computed(() => props.items.length),
)

const bufferedHasMore = computed(() => props.items.length > reserved.value)

const isInitialLoading = computed(
  () =>
    props.hasSeedArticles &&
    props.items.length === 0 &&
    (props.loading || props.pending || props.fillingInitial),
)

/** Seed prompt only — never an empty copy while loading or after a seeded fetch. */
const isEmpty = computed(() => {
  if (props.loading || props.pending || props.fillingInitial) return false
  return !props.hasSeedArticles
})

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
    !isScreen.value &&
    skin.value === 'mobile' &&
    !props.showSavedRefresh &&
    !props.error &&
    !props.loadingMore &&
    (props.items.length > 0 ||
      (!isInitialLoading.value && !props.pending && bufferedHasMore.value)),
)

useRevealOnScrollEnd({
  scroller,
  sentinel,
  enabled: observeScrollEnd,
  onReach: revealMore,
})

usePreventHorizontalSwipeNavigation({
  scroller,
  enabled: computed(() => !isScreen.value && skin.value === 'mobile'),
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
      : props.fillingInitial || props.loadingMore
    return { card, loading }
  })
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

const showMoreDisabled = computed(() =>
  wikitabShowMoreDisabled({
    itemCount: props.items.length,
    loading: props.loading,
    pending: props.pending,
    fillingInitial: props.fillingInitial,
    loadingMore: props.loadingMore,
  }),
)

const observeScreenInfinite = computed(
  () =>
    isScreen.value &&
    canShowMore.value &&
    !showMoreDisabled.value &&
    !props.showSavedRefresh,
)

useInfiniteScroll({
  sentinel,
  root: panelRoot,
  enabled: observeScreenInfinite,
  onReach: revealMore,
})

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
  <section
    :id="`wikitab-module-${spec.id}`"
    class="wikitab-suggested-edits-section"
    :class="{
      'wikitab-suggested-edits-section--screen': isScreen,
      'wikitab-panel': isScreen,
      'wikitab-module-screen': isScreen,
    }"
    :style="{ '--wikitab-card-height': `${spec.cardHeight}px` }"
  >
    <WikitabModuleHead
      :title="spec.heading"
      :pinned="pinned"
      :variant="isScreen ? 'screen' : 'home'"
      @open-screen="emit('open-screen')"
      @close="emit('close-screen')"
    >
      <template v-if="!isScreen" #action>
        <CdxMenuButton
          v-model:selected="selection"
          class="wikitab-suggested-edits-section__menu"
          weight="quiet"
          :menu-items="menuItems"
          :aria-label="`${spec.heading} options`"
        >
          <CdxIcon :icon="cdxIconEllipsis" />
        </CdxMenuButton>
      </template>
    </WikitabModuleHead>

    <p v-if="error" class="wikitab-suggested-edits-section__error">
      <small>{{ error }}</small>
    </p>

    <WikitabNothingSavedYet
      v-else-if="isEmpty"
      message="Save an article to get daily edit suggestions."
      reserve-card-height
    />

    <div v-else ref="scroller" class="wikitab-suggested-edits-section__cards">
      <WikitabCard
        v-for="(slot, index) in slots"
        :key="slot.card?.key ?? index"
        class="wikitab-suggested-edits-section__card wikitab-section__card"
        v-bind="
          wikitabCardBindProps(spec.primitive, {
            card: slot.card,
            loading: slot.loading,
            menu:
              slot.loading !== true && slot.card
                ? wikitabCardFeedMenuItems({
                    save: {
                      isSaved:
                        slot.card.pageid !== undefined && slot.card.task
                          ? isCardSaved(suggestionSavedId(slot.card.pageid, slot.card.task))
                          : false,
                      primitiveId: 'suggestion',
                    },
                    saveArticle: wikitabCardSaveArticleMenuOption(
                      slot.card.seedArticle,
                      saveArticleMenuLookup,
                    ),
                    hideFromHeading: spec.heading,
                  })
                : undefined,
          })
        "
        @hide-article="emit('hide-article', $event)"
        @toggle-save="slot.card && emit('toggle-save', { primitive: 'suggestion', card: slot.card })"
        @toggle-save-article="slot.card && emit('toggle-save-article', slot.card)"
      />
      <WikitabModuleRefreshCard
        v-if="showSavedRefresh && skin === 'mobile' && !isScreen"
        class="wikitab-suggested-edits-section__card"
        @refresh="emit('refresh-section')"
      />
      <div
        v-if="!isScreen"
        ref="sentinel"
        class="wikitab-suggested-edits-section__sentinel"
        aria-hidden="true"
      />
    </div>

    <div
      v-if="isScreen && !error && !isEmpty"
      ref="sentinel"
      class="wikitab-suggested-edits-section__sentinel wikitab-suggested-edits-section__sentinel--screen"
      aria-hidden="true"
    />

    <WikitabModuleMore
      :can-show-more="canShowMore"
      :show-more-disabled="showMoreDisabled"
      :show-refresh="showSavedRefresh"
      :screen="isScreen"
      @show-more="revealMore"
      @refresh="emit('refresh-section')"
    />
  </section>
</template>

<style scoped>
.wikitab-suggested-edits-section {
  display: flex;
  flex-direction: column;
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

[data-skin='mobile'] .wikitab-suggested-edits-section:not(.wikitab-suggested-edits-section--screen) .wikitab-suggested-edits-section__cards {
  display: flex;
  align-items: stretch;
  gap: var(--spacing-100);
  margin-inline: calc(var(--wikitab-page-gutter) * -1);
  padding-inline: var(--wikitab-page-gutter) 0;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scroll-padding-inline-start: var(--wikitab-page-gutter);
  scrollbar-width: none;
}

[data-skin='mobile'] .wikitab-suggested-edits-section:not(.wikitab-suggested-edits-section--screen) .wikitab-suggested-edits-section__cards::-webkit-scrollbar {
  display: none;
}

[data-skin='mobile'] .wikitab-suggested-edits-section:not(.wikitab-suggested-edits-section--screen) .wikitab-suggested-edits-section__card {
  flex: 0 0 320px;
  align-self: stretch;
  min-height: var(--wikitab-card-height);
  scroll-snap-align: start;
}

[data-skin='desktop']
  .wikitab-suggested-edits-section__sentinel:not(
    .wikitab-suggested-edits-section__sentinel--screen
  ) {
  display: none;
}

[data-skin='mobile'] .wikitab-suggested-edits-section--screen .wikitab-suggested-edits-section__cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: stretch;
  gap: var(--spacing-100);
}

[data-skin='mobile'] .wikitab-suggested-edits-section--screen .wikitab-suggested-edits-section__card {
  min-height: 0;
}

.wikitab-suggested-edits-section__sentinel--screen {
  flex: none;
  width: 100%;
  height: 1px;
}

.wikitab-suggested-edits-section__card:has(.wikitab-card--has-menu [aria-expanded='true']) {
  overflow: visible;
  z-index: 3;
}

</style>
