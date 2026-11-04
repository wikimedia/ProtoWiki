<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { CdxButton, CdxIcon, CdxMenuButton } from '@wikimedia/codex'
import {
  cdxIconEllipsis,
  cdxIconEyeClosed,
  cdxIconHelpNotice,
  cdxIconPushPin,
  cdxIconReload,
} from '@wikimedia/codex-icons'

import { useSkin } from '@/composables/useSkin'
import WikitabModuleHead from './WikitabModuleHead.vue'
import WikitabNothingSavedYet from './WikitabNothingSavedYet.vue'
import WikitabSavedItemSlot from './WikitabSavedItemSlot.vue'
import WikitabSavedItemTabs from './WikitabSavedItemTabs.vue'
import { savedItemRevealCard, type WikitabSaveArticleMenuLookup } from './data/savedCardHelpers'
import type { WikitabSavedItem } from './data/wikitabConfig'
import { WIKITAB_SAVED_MODULE_SPEC, type WikitabCardLoading } from './sections'
import { useEqualRowHeights } from './useEqualRowHeights'
import { usePreventHorizontalSwipeNavigation } from './usePreventHorizontalSwipeNavigation'
import { useRevealOnScrollEnd } from './useRevealOnScrollEnd'
import { useSectionReveal } from './useSectionReveal'
import { wikitabShowMoreDisabled } from './wikitabShowMoreDisabled'
import { useWikitabSavedItemTabFilter } from './useWikitabSavedItemTabFilter'

const spec = WIKITAB_SAVED_MODULE_SPEC

const props = defineProps<{
  savedItems: WikitabSavedItem[]
  /** Saved id → fields still being enriched (description / thumbnail). */
  itemLoading?: Map<string, WikitabCardLoading>
  loading: boolean
  pinned: boolean
  isCardSaved: (id: string) => boolean
  saveArticleMenuLookup: WikitabSaveArticleMenuLookup
}>()

const emit = defineEmits<{
  'toggle-pin': []
  'refresh-section': []
  'hide-section': []
  'toggle-save': [id: string]
  'toggle-save-article': [id: string]
  'open-screen': []
}>()

const savedItems = toRef(props, 'savedItems')
const { activeTab, showTabs, tabs, filteredItems } = useWikitabSavedItemTabFilter(savedItems)

const revealItems = computed(() => filteredItems.value.map(savedItemRevealCard))

const loading = toRef(props, 'loading')
const { reserved, revealing, hasMore, revealMore, slotLoading, pendingCount } = useSectionReveal(
  spec,
  revealItems,
  loading,
)

const skin = useSkin()
const scroller = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)
const observeScrollEnd = computed(
  () =>
    skin.value === 'mobile' &&
    (filteredItems.value.length > 0 || hasMore.value) &&
    !(filteredItems.value.length === 0 && props.loading),
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
  enabled: computed(() => !props.loading || filteredItems.value.length > 0),
  floorResolvedRows: false,
  watchKeys: [
    computed(() => reserved.value),
    pendingCount,
    computed(() => filteredItems.value.length),
    computed(() => props.loading),
    computed(() => props.itemLoading),
    activeTab,
  ],
})

watch([activeTab, filteredItems], () => {
  const count = filteredItems.value.length
  if (count === 0) return
  reserved.value = Math.min(spec.initialCount, count)
})

const visibleSlotCount = computed(() =>
  Math.min(reserved.value, filteredItems.value.length),
)

const slots = computed(() =>
  Array.from({ length: visibleSlotCount.value }, (_, index) => {
    const saved = filteredItems.value[index]!
    const revealLoading = slotLoading(index)
    const loading: WikitabCardLoading =
      revealLoading === true ? true : (props.itemLoading?.get(saved.id) ?? revealLoading)
    return { saved, loading }
  }),
)

const isEmpty = computed(() => !props.loading && props.savedItems.length === 0)

const canShowMore = computed(() => props.loading || hasMore.value)
const showMoreDisabled = computed(() =>
  wikitabShowMoreDisabled({
    itemCount: filteredItems.value.length,
    loading: props.loading,
    revealing: revealing.value,
  }),
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
</script>

<template>
  <section
    :id="`wikitab-module-${spec.id}`"
    class="wikitab-saved-section"
    :style="{ '--wikitab-card-height': `${spec.cardHeight}px` }"
  >
    <WikitabModuleHead
      :title="spec.heading"
      :pinned="pinned"
      @open-screen="emit('open-screen')"
    >
      <template #action>
        <CdxMenuButton
          v-model:selected="selection"
          class="wikitab-saved-section__menu"
          weight="quiet"
          :menu-items="menuItems"
          :footer="footerItem"
          :aria-label="`${spec.heading} options`"
        >
          <CdxIcon :icon="cdxIconEllipsis" />
        </CdxMenuButton>
      </template>
    </WikitabModuleHead>

    <WikitabSavedItemTabs
      v-if="showTabs && !isEmpty"
      v-model:active="activeTab"
      :tabs="tabs"
    />

    <WikitabNothingSavedYet v-if="isEmpty" />

    <div v-else ref="scroller" class="wikitab-saved-section__cards">
      <WikitabSavedItemSlot
        v-for="slot in slots"
        :key="slot.saved.id"
        class="wikitab-saved-section__card wikitab-section__card"
        :saved="slot.saved"
        :loading="slot.loading"
        :show-article-menu="slot.loading !== true"
        :is-saved="isCardSaved(slot.saved.id)"
        :is-card-saved="isCardSaved"
        :save-article-menu-lookup="saveArticleMenuLookup"
        @toggle-save="emit('toggle-save', slot.saved.id)"
        @toggle-save-article="emit('toggle-save-article', slot.saved.id)"
      />
      <div ref="sentinel" class="wikitab-saved-section__sentinel" aria-hidden="true" />
    </div>

    <div class="wikitab-saved-section__more">
      <CdxButton
        v-if="canShowMore"
        class="wikitab-saved-section__more-button"
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
.wikitab-saved-section {
  display: flex;
  flex-direction: column;
}

.wikitab-saved-section__sentinel {
  flex: 0 0 1px;
  width: 1px;
}

.wikitab-saved-section__more {
  display: flex;
  justify-content: center;
  min-height: var(--line-height-small);
  margin-top: var(--spacing-100);
}

.wikitab-saved-section__cards {
  --font-size-small: 0.75rem;
  --font-size-medium: 0.875rem;
  --font-size-large: 1rem;
  --line-height-small: 1.25rem;
  --line-height-medium: 1.375rem;
  --line-height-large: 1.375rem;
}

[data-skin='desktop'] .wikitab-saved-section__cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  gap: var(--spacing-100);
}

[data-skin='desktop'] .wikitab-saved-section__card {
  min-height: 0;
}

.wikitab-saved-section__card:has(.wikitab-card--has-menu [aria-expanded='true']),
.wikitab-saved-section__card:has(.wikitab-card__menu [aria-expanded='true']),
.wikitab-saved-section__card:has(.wikitab-search-contribute-card__menu [aria-expanded='true']) {
  overflow: visible;
  z-index: 3;
}

[data-skin='desktop'] .wikitab-saved-section__sentinel {
  display: none;
}

[data-skin='mobile'] .wikitab-saved-section__cards {
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

[data-skin='mobile'] .wikitab-saved-section__cards::-webkit-scrollbar {
  display: none;
}

[data-skin='mobile'] .wikitab-saved-section__card {
  flex: 0 0 320px;
  align-self: stretch;
  min-height: var(--wikitab-card-height);
  scroll-snap-align: start;
}

[data-skin='mobile'] .wikitab-saved-section__more {
  display: none;
}
</style>
