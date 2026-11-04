<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  CdxButton,
  CdxIcon,
  CdxMenuButton,
  type MenuButtonItemData,
  type MenuGroupData,
} from '@wikimedia/codex'
import {
  cdxIconConfigure,
  cdxIconEllipsis,
  cdxIconEyeClosed,
  cdxIconPushPin,
  cdxIconReload,
} from '@wikimedia/codex-icons'

import { useSkin } from '@/composables/useSkin'
import {
  changeSavedId,
  wikitabCardSaveArticleMenuOption,
  type WikitabSaveArticleMenuLookup,
} from './data/savedCardHelpers'
import type { WikitabSearchActivityItem } from './data/fetchWikitabSearchActivity'
import { wikitabCardBindProps } from './data/wikitabCardPresentation'
import { wikitabCardPropsForSearchActivityItem } from './data/wikitabSearchActivityWikitabCard'
import { wikitabReservedSlotHeight } from './data/wikitabCardSlotHeights'
import { WIKITAB_REVIEW_CHANGES_MODULE_SPEC } from './sections'
import WikitabCard from './WikitabCard.vue'
import WikitabModuleHead from './WikitabModuleHead.vue'
import WikitabModuleMore from './WikitabModuleMore.vue'
import WikitabModuleRefreshCard from './WikitabModuleRefreshCard.vue'
import { useInfiniteScroll } from './useInfiniteScroll'
import { usePreventHorizontalSwipeNavigation } from './usePreventHorizontalSwipeNavigation'
import { useRestoreReservedOnScreenClose } from './useRestoreReservedOnScreenClose'
import { useRevealOnScrollEnd } from './useRevealOnScrollEnd'
import { wikitabShowMoreDisabled } from './wikitabShowMoreDisabled'

const spec = WIKITAB_REVIEW_CHANGES_MODULE_SPEC

const props = withDefaults(
  defineProps<{
    items: WikitabSearchActivityItem[]
    /** Revids whose editor kind is still being looked up. */
    editorKindPending?: Set<number>
    loading: boolean
    fillingInitial: boolean
    pending: boolean
    loadingMore: boolean
    hasMore: boolean
    error: string | null
    pinned: boolean
    /** At least one Configure source (saved / recent risky) is on. */
    sourcesEnabled: boolean
    /** Configure: edits from saved articles. */
    showSavedEdits: boolean
    /** Configure: recent risky edits. */
    showRecentRiskyEdits: boolean
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
  'open-configure': []
  'enable-sources': []
  'load-more': []
  dismiss: [revid: number]
  'toggle-save': [item: WikitabSearchActivityItem]
  'toggle-save-article': [item: WikitabSearchActivityItem]
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

const showSourcesOffPanel = computed(() => {
  if (!props.sourcesEnabled) return true
  // Saved-only with nothing to show → same CTA as both-off (nudge to enable risky).
  return (
    props.showSavedEdits &&
    !props.showRecentRiskyEdits &&
    !props.loading &&
    !props.pending &&
    !props.fillingInitial &&
    !props.error &&
    props.items.length === 0
  )
})

const isInitialLoading = computed(
  () =>
    !showSourcesOffPanel.value &&
    props.items.length === 0 &&
    (props.loading || props.pending || props.fillingInitial),
)

const isEmpty = computed(
  () =>
    !showSourcesOffPanel.value &&
    !props.loading &&
    !props.pending &&
    !props.fillingInitial &&
    !props.error &&
    props.items.length === 0,
)

function onReviewChangeMenuSelect(value: string, item: WikitabSearchActivityItem) {
  if (value === 'save') emit('toggle-save', item)
  if (value === 'save-article') emit('toggle-save-article', item)
  if (value === 'thank') {
    window.open(item.thankUrl, '_blank', 'noopener,noreferrer')
  }
  if (value === 'dismiss') emit('dismiss', item.revisionId)
}

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
    !showSourcesOffPanel.value &&
    !props.error &&
    !props.loadingMore &&
    (props.items.length > 0 || (!isInitialLoading.value && bufferedHasMore.value)),
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
    key: props.items[index]?.revisionId ?? `slot-${index}`,
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

/*
 * Row always reserved while skeletons or cards are on screen — disabled until we
 * know there is nothing more (same no-jump contract as feed sections).
 */
const canShowMore = computed(
  () =>
    !props.error &&
    !isEmpty.value &&
    (isInitialLoading.value ||
      props.loading ||
      props.pending ||
      props.fillingInitial ||
      props.loadingMore ||
      bufferedHasMore.value ||
      props.hasMore),
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
    !showSourcesOffPanel.value &&
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
const menuItems = computed((): (MenuButtonItemData | MenuGroupData)[] => [
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
  {
    label: '',
    hideLabel: true,
    items: [
      {
        value: 'configure',
        label: 'Configure',
        icon: cdxIconConfigure,
      },
    ],
  },
])
watch(selection, (value) => {
  if (value === 'configure') emit('open-configure')
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
    class="wikitab-review-changes-section"
    :class="{
      'wikitab-review-changes-section--screen': isScreen,
      'wikitab-panel': isScreen,
      'wikitab-module-screen': isScreen,
    }"
    :style="{ '--wikitab-card-height': `${wikitabReservedSlotHeight('edit')}px` }"
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
          class="wikitab-review-changes-section__menu"
          weight="quiet"
          :menu-items="menuItems"
          :aria-label="`${spec.heading} options`"
        >
          <CdxIcon :icon="cdxIconEllipsis" />
        </CdxMenuButton>
      </template>
    </WikitabModuleHead>

    <div v-if="showSourcesOffPanel" class="wikitab-review-changes-section__sources-off">
      <CdxButton
        class="wikitab-review-changes-section__sources-off-button"
        action="progressive"
        weight="primary"
        @click="emit('enable-sources')"
      >
        Show recent edits
      </CdxButton>
    </div>

    <template v-else>
      <p v-if="error" class="wikitab-review-changes-section__error">
        <small>{{ error }}</small>
      </p>

      <div v-else ref="scroller" class="wikitab-review-changes-section__cards">
        <template v-for="slot in slots" :key="slot.key">
          <WikitabCard
            v-if="slot.item"
            class="wikitab-review-changes-section__card"
            v-bind="
              wikitabCardPropsForSearchActivityItem(slot.item, {
                includeSave: true,
                isSaved: isCardSaved(changeSavedId(slot.item.revisionId)),
                saveArticle: wikitabCardSaveArticleMenuOption(
                  slot.item.seedArticle,
                  saveArticleMenuLookup,
                ),
                loading: editorKindPending?.has(slot.item.revisionId)
                  ? { supporting: true }
                  : false,
                showThumbnail: false,
                omitLatestRevisionChip: true,
              })
            "
            @menu-select="onReviewChangeMenuSelect($event, slot.item)"
            @toggle-save-article="emit('toggle-save-article', slot.item)"
          />
          <WikitabCard
            v-else-if="slot.loading"
            class="wikitab-review-changes-section__card"
            v-bind="wikitabCardBindProps('edit', { loading: true })"
          />
        </template>
        <WikitabModuleRefreshCard
          v-if="showSavedRefresh && skin === 'mobile' && !isScreen"
          class="wikitab-review-changes-section__card"
          @refresh="emit('refresh-section')"
        />
        <div
          v-if="!isScreen"
          ref="sentinel"
          class="wikitab-review-changes-section__sentinel"
          aria-hidden="true"
        />
      </div>

      <div
        v-if="isScreen"
        ref="sentinel"
        class="wikitab-review-changes-section__sentinel wikitab-review-changes-section__sentinel--screen"
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
    </template>
  </section>
</template>

<style scoped>
.wikitab-review-changes-section {
  display: flex;
  flex-direction: column;
}

.wikitab-review-changes-section__sources-off {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-100);
  min-height: 140px;
  padding: var(--spacing-150);
  background-color: var(--background-color-neutral-subtle);
  border-radius: var(--border-radius-base);
}

.wikitab-review-changes-section__error {
  display: flex;
  align-items: center;
  margin: 0;
  min-height: 120px;
  color: var(--color-subtle);
}

.wikitab-review-changes-section__empty {
  margin: 0;
  color: var(--color-subtle);
}

.wikitab-review-changes-section__sentinel {
  flex: 0 0 1px;
  width: 1px;
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

/* Resolved cards hug content; skeleton slots keep their inline `loadingHeight` floor. */
[data-skin='desktop'] .wikitab-review-changes-section__card {
  min-height: 0;
}

[data-skin='mobile'] .wikitab-review-changes-section:not(.wikitab-review-changes-section--screen) .wikitab-review-changes-section__cards {
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

[data-skin='mobile'] .wikitab-review-changes-section:not(.wikitab-review-changes-section--screen) .wikitab-review-changes-section__cards::-webkit-scrollbar {
  display: none;
}

[data-skin='mobile'] .wikitab-review-changes-section:not(.wikitab-review-changes-section--screen) .wikitab-review-changes-section__card {
  flex: 0 0 320px;
  align-self: stretch;
  scroll-snap-align: start;
}

[data-skin='desktop']
  .wikitab-review-changes-section__sentinel:not(
    .wikitab-review-changes-section__sentinel--screen
  ) {
  display: none;
}

[data-skin='mobile'] .wikitab-review-changes-section--screen .wikitab-review-changes-section__cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: stretch;
  gap: var(--spacing-100);
}

[data-skin='mobile'] .wikitab-review-changes-section--screen .wikitab-review-changes-section__card {
  min-height: 0;
}

.wikitab-review-changes-section__sentinel--screen {
  flex: none;
  width: 100%;
  height: 1px;
}

.wikitab-review-changes-section__card:has([aria-expanded='true']) {
  overflow: visible;
  z-index: 3;
}
</style>
