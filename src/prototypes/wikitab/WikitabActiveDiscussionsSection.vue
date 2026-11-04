<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
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
  cdxIconHelpNotice,
  cdxIconPushPin,
  cdxIconReload,
} from '@wikimedia/codex-icons'
import { useSkin } from '@/composables/useSkin'
import { wikitabCardBindProps } from './data/wikitabCardPresentation'
import { wikitabCardFeedMenuItems } from './data/wikitabCardMenuItems'
import {
  discussionSavedIdFromUrl,
  wikitabCardSaveArticleMenuOption,
  type SaveItemPayload,
  type WikitabSaveArticleMenuLookup,
} from './data/savedCardHelpers'
import WikitabCard from './WikitabCard.vue'
import WikitabModuleHead from './WikitabModuleHead.vue'
import WikitabModuleMore from './WikitabModuleMore.vue'
import WikitabModuleRefreshCard from './WikitabModuleRefreshCard.vue'
import WikitabSavedItemTabs from './WikitabSavedItemTabs.vue'
import { useEqualRowHeights } from './useEqualRowHeights'
import { useInfiniteScroll } from './useInfiniteScroll'
import { usePreventHorizontalSwipeNavigation } from './usePreventHorizontalSwipeNavigation'
import { useRestoreReservedOnScreenClose } from './useRestoreReservedOnScreenClose'
import { useRevealOnScrollEnd } from './useRevealOnScrollEnd'
import { useSectionReveal } from './useSectionReveal'
import { wikitabShowMoreDisabled } from './wikitabShowMoreDisabled'
import { useWikitabActiveDiscussionsTabFilter } from './useWikitabActiveDiscussionsTabFilter'
import {
  WIKITAB_DISCUSSIONS_MODULE_SPEC,
  type WikitabCardData,
} from './sections'

const spec = WIKITAB_DISCUSSIONS_MODULE_SPEC

const props = withDefaults(
  defineProps<{
    noticeboardItems: WikitabCardData[]
    articleItems: WikitabCardData[]
    loading: boolean
    pending: boolean
    /** Next saved-talk seed batch in flight. */
    loadingMore?: boolean
    /** More saved-talk seed batches available. */
    hasMore?: boolean
    error: string | null
    pinned: boolean
    /** At least one Configure source is on. */
    sourcesEnabled: boolean
    showNoticeboards: boolean
    showSavedTalk: boolean
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
  'toggle-save': [payload: SaveItemPayload]
  'toggle-save-article': [card: WikitabCardData]
  'load-more': []
  'open-screen': []
  'close-screen': []
}>()

const isScreen = computed(() => props.variant === 'screen')

const noticeboardItems = toRef(props, 'noticeboardItems')
const articleItems = toRef(props, 'articleItems')
const showNoticeboards = toRef(props, 'showNoticeboards')
const showSavedTalk = toRef(props, 'showSavedTalk')
const { activeTab, showTabs, tabs, filteredItems } = useWikitabActiveDiscussionsTabFilter(
  noticeboardItems,
  articleItems,
  { showNoticeboards, showSavedTalk },
)

const loading = computed(() => props.loading || props.pending)

const {
  reserved,
  revealing,
  hasMore: revealHasMore,
  revealMore,
  slotCard,
  slotLoading,
  pendingCount,
} = useSectionReveal(
  {
    id: spec.id,
    initialCount: spec.initialCount,
    pageSize: spec.pageSize,
  },
  filteredItems,
  loading,
)

useRestoreReservedOnScreenClose(
  isScreen,
  reserved,
  computed(() => filteredItems.value.length),
)

watch(activeTab, () => {
  const count = filteredItems.value.length
  if (count === 0) {
    reserved.value = loading.value ? spec.initialCount : 0
    return
  }
  reserved.value = Math.min(spec.initialCount, count)
})

watch(loading, (isLoading) => {
  if (!isLoading) return
  if (filteredItems.value.length === 0) {
    reserved.value = spec.initialCount
  }
})

const skin = useSkin()
const scroller = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)
const panelRoot = computed(() => scroller.value?.closest('.wikitab-panel') ?? null)

const showSourcesOffPanel = computed(() => !props.sourcesEnabled)

/** No cards for the active tab (or the whole module) after load. */
const isEmpty = computed(
  () =>
    !showSourcesOffPanel.value &&
    !props.loading &&
    !props.pending &&
    !props.loadingMore &&
    !props.error &&
    filteredItems.value.length === 0 &&
    !props.hasMore,
)

const canFetchMore = computed(() => Boolean(props.hasMore))

const observeScrollEnd = computed(
  () =>
    !isScreen.value &&
    skin.value === 'mobile' &&
    !props.showSavedRefresh &&
    !showSourcesOffPanel.value &&
    !props.error &&
    !props.loadingMore &&
    (filteredItems.value.length > 0 || revealHasMore.value || canFetchMore.value) &&
    !(filteredItems.value.length === 0 && loading.value),
)

useRevealOnScrollEnd({
  scroller,
  sentinel,
  enabled: observeScrollEnd,
  onReach: onShowMore,
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
  enabled: computed(() => !props.error && !showSourcesOffPanel.value),
  watchKeys: [
    computed(() => reserved.value),
    pendingCount,
    computed(() => filteredItems.value.length),
    computed(() => props.loading),
    computed(() => props.pending),
    computed(() => props.loadingMore),
    activeTab,
  ],
})

const slots = computed(() =>
  Array.from({ length: reserved.value }, (_, index) => ({
    card: slotCard(index),
    loading:
      slotLoading(index) ||
      (Boolean(props.loadingMore) && index >= filteredItems.value.length),
  })),
)

const canShowMore = computed(
  () =>
    !showSourcesOffPanel.value &&
    !props.error &&
    !isEmpty.value &&
    (props.loading ||
      props.pending ||
      props.loadingMore ||
      revealHasMore.value ||
      canFetchMore.value),
)

const showMoreDisabled = computed(() =>
  wikitabShowMoreDisabled({
    itemCount: filteredItems.value.length,
    loading: props.loading,
    pending: props.pending,
    loadingMore: props.loadingMore,
    revealing: revealing.value,
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
  onReach: onShowMore,
})

/** Reveal the next page; fetch another seed batch when the list runs short. */
function onShowMore(): void {
  if (showMoreDisabled.value) return

  const targetReserved = reserved.value + spec.pageSize
  if (filteredItems.value.length >= targetReserved) {
    revealMore()
    return
  }

  reserved.value = targetReserved
  if (canFetchMore.value) {
    emit('load-more')
    return
  }
  reserved.value = filteredItems.value.length
}

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
const footerItem = computed(() => ({
  value: 'about',
  label: `About ${spec.heading}`,
  icon: cdxIconHelpNotice,
}))

watch(selection, (value) => {
  if (value === 'configure') emit('open-configure')
  if (value === 'pin') emit('toggle-pin')
  if (value === 'refresh') emit('refresh-section')
  if (value === 'hide') emit('hide-section')
  if (value !== null) selection.value = null
})

function savedIdForCard(card: WikitabCardData): string {
  return discussionSavedIdFromUrl(card.url) ?? card.key
}

function savePayloadForCard(card: WikitabCardData): SaveItemPayload {
  return { primitive: 'discussion', card }
}
</script>

<template>
  <section
    :id="`wikitab-module-${spec.id}`"
    class="wikitab-active-discussions-section"
    :class="{
      'wikitab-active-discussions-section--screen': isScreen,
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
          class="wikitab-active-discussions-section__menu"
          weight="quiet"
          :menu-items="menuItems"
          :footer="footerItem"
          :aria-label="`${spec.heading} options`"
        >
          <CdxIcon :icon="cdxIconEllipsis" />
        </CdxMenuButton>
      </template>
    </WikitabModuleHead>

    <div v-if="showSourcesOffPanel" class="wikitab-active-discussions-section__sources-off">
      <CdxButton
        class="wikitab-active-discussions-section__sources-off-button"
        action="progressive"
        weight="primary"
        @click="emit('enable-sources')"
      >
        Show active discussions
      </CdxButton>
    </div>

    <template v-else>
      <WikitabSavedItemTabs
        v-if="showTabs"
        v-model:active="activeTab"
        :tabs="tabs"
      />

      <p v-if="error" class="wikitab-active-discussions-section__error">
        <small>{{ error }}</small>
      </p>

      <div v-else ref="scroller" class="wikitab-active-discussions-section__cards">
        <WikitabCard
          v-for="(slot, index) in slots"
          :key="slot.card?.key ?? index"
          class="wikitab-active-discussions-section__card"
          v-bind="
            wikitabCardBindProps(spec.primitive, {
              card: slot.card,
              loading: slot.loading,
              menu: slot.card
                ? wikitabCardFeedMenuItems({
                    save: {
                      isSaved: isCardSaved(savedIdForCard(slot.card)),
                      primitiveId: spec.primitive,
                    },
                    saveArticle: wikitabCardSaveArticleMenuOption(
                      slot.card.seedArticle,
                      props.saveArticleMenuLookup,
                    ),
                    hideFromHeading: spec.heading,
                  })
                : undefined,
            })
          "
          @toggle-save="slot.card && emit('toggle-save', savePayloadForCard(slot.card))"
          @toggle-save-article="slot.card && emit('toggle-save-article', slot.card)"
        />
        <WikitabModuleRefreshCard
          v-if="showSavedRefresh && skin === 'mobile' && !isScreen"
          class="wikitab-active-discussions-section__card"
          @refresh="emit('refresh-section')"
        />
        <div
          v-if="!isScreen"
          ref="sentinel"
          class="wikitab-active-discussions-section__sentinel"
          aria-hidden="true"
        />
      </div>

      <div
        v-if="isScreen"
        ref="sentinel"
        class="wikitab-active-discussions-section__sentinel wikitab-active-discussions-section__sentinel--screen"
        aria-hidden="true"
      />

      <WikitabModuleMore
        :can-show-more="canShowMore"
        :show-more-disabled="showMoreDisabled"
        :show-refresh="showSavedRefresh"
        :screen="isScreen"
        @show-more="onShowMore"
        @refresh="emit('refresh-section')"
      />
    </template>
  </section>
</template>

<style scoped>
.wikitab-active-discussions-section {
  display: flex;
  flex-direction: column;
}

.wikitab-active-discussions-section__sources-off {
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

.wikitab-active-discussions-section__error {
  display: flex;
  align-items: center;
  margin: 0;
  min-height: 120px;
  color: var(--color-subtle);
}

.wikitab-active-discussions-section__empty {
  margin: 0;
  color: var(--color-subtle);
}

.wikitab-active-discussions-section__sentinel {
  flex: 0 0 1px;
  width: 1px;
}

.wikitab-active-discussions-section__cards {
  --font-size-small: 0.75rem;
  --font-size-medium: 0.875rem;
  --font-size-large: 1rem;
  --line-height-small: 1.25rem;
  --line-height-medium: 1.375rem;
  --line-height-large: 1.375rem;
}

[data-skin='desktop'] .wikitab-active-discussions-section__cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  gap: var(--spacing-100);
}

[data-skin='desktop'] .wikitab-active-discussions-section__card {
  min-height: 0;
}

[data-skin='mobile'] .wikitab-active-discussions-section:not(.wikitab-active-discussions-section--screen) .wikitab-active-discussions-section__cards {
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

[data-skin='mobile'] .wikitab-active-discussions-section:not(.wikitab-active-discussions-section--screen) .wikitab-active-discussions-section__cards::-webkit-scrollbar {
  display: none;
}

[data-skin='mobile'] .wikitab-active-discussions-section:not(.wikitab-active-discussions-section--screen) .wikitab-active-discussions-section__card {
  flex: 0 0 320px;
  align-self: stretch;
  scroll-snap-align: start;
}

[data-skin='desktop']
  .wikitab-active-discussions-section__sentinel:not(
    .wikitab-active-discussions-section__sentinel--screen
  ) {
  display: none;
}

[data-skin='mobile'] .wikitab-active-discussions-section--screen .wikitab-active-discussions-section__cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: stretch;
  gap: var(--spacing-100);
}

[data-skin='mobile'] .wikitab-active-discussions-section--screen .wikitab-active-discussions-section__card {
  min-height: 0;
}

.wikitab-active-discussions-section__sentinel--screen {
  flex: none;
  width: 100%;
  height: 1px;
}

.wikitab-active-discussions-section__card:has([aria-expanded='true']) {
  overflow: visible;
  z-index: 3;
}
</style>
