<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { CdxButton, CdxIcon, CdxMenuButton } from '@wikimedia/codex'
import { cdxIconEllipsis, cdxIconEyeClosed, cdxIconHelpNotice, cdxIconPushPin } from '@wikimedia/codex-icons'

import { useSkin } from '@/composables/useSkin'
import WikitabCard from './WikitabCard.vue'
import { articleUrl } from './data/wikitabHtml'
import type { WikitabSavedArticle } from './data/wikitabConfig'
import { WIKITAB_SAVED_MODULE_SPEC, type WikitabCardData } from './sections'
import { useEqualRowHeights } from './useEqualRowHeights'
import { usePreventHorizontalSwipeNavigation } from './usePreventHorizontalSwipeNavigation'
import { useRevealOnScrollEnd } from './useRevealOnScrollEnd'
import { useSectionReveal } from './useSectionReveal'

const spec = WIKITAB_SAVED_MODULE_SPEC

const props = defineProps<{
  savedArticles: WikitabSavedArticle[]
  loading: boolean
  pinned: boolean
  isArticleSaved: (title: string) => boolean
}>()

const emit = defineEmits<{
  'toggle-pin': []
  'hide-section': []
  'toggle-save': [card: WikitabCardData]
}>()

function cardArticleTitle(card: WikitabCardData): string {
  return card.linkTitle ?? card.title ?? ''
}

const items = computed((): WikitabCardData[] =>
  props.savedArticles.map((article) => ({
    key: article.titleKey,
    href: articleUrl(article.title),
    linkTitle: article.title,
    title: article.title,
    description: article.description,
    thumbnailUrl: article.thumbnailUrl,
  })),
)

const loading = toRef(props, 'loading')
const { reserved, ready, revealing, hasMore, revealMore } = useSectionReveal(spec, items, loading)

const skin = useSkin()
const scroller = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)
const observeScrollEnd = computed(() => skin.value === 'mobile' && hasMore.value)

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
  enabled: computed(() => !props.loading || items.value.length > 0),
  watchKeys: [
    computed(() => reserved.value),
    computed(() => ready.value),
    computed(() => items.value.length),
    computed(() => props.loading),
  ],
})

const slots = computed(() =>
  Array.from({ length: reserved.value }, (_, index) => ({
    card: items.value[index],
    loading: index >= ready.value,
  })),
)

const isEmpty = computed(() => !props.loading && items.value.length === 0)

const canShowMore = computed(() => props.loading || hasMore.value)
const showMoreDisabled = computed(() => props.loading || revealing.value)

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
</script>

<template>
  <section class="wikitab-saved-section" :style="{ '--wikitab-card-height': `${spec.cardHeight}px` }">
    <div class="wikitab-saved-section__head">
      <div class="wikitab-saved-section__title">
        <CdxIcon
          v-if="pinned"
          class="wikitab-saved-section__pin"
          :icon="cdxIconPushPin"
          icon-label="Pinned to top"
        />
        <h2 class="wikitab-saved-section__heading">{{ spec.heading }}</h2>
      </div>
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
    </div>

    <p v-if="isEmpty" class="wikitab-saved-section__empty">
      <small>Nothing to show right now.</small>
    </p>

    <div v-else ref="scroller" class="wikitab-saved-section__cards">
      <WikitabCard
        v-for="(slot, index) in slots"
        :key="slot.card?.key ?? index"
        class="wikitab-saved-section__card"
        :variant="spec.variant"
        :height="spec.cardHeight"
        :thumbnail-size="spec.thumbnailSize"
        :card="slot.card"
        :loading="slot.loading"
        :show-article-menu="!slot.loading && !!slot.card"
        :is-saved="slot.card ? isArticleSaved(cardArticleTitle(slot.card)) : false"
        @toggle-save="slot.card && emit('toggle-save', slot.card)"
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

.wikitab-saved-section__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-50);
  margin-bottom: var(--spacing-50);
}

.wikitab-saved-section__title {
  display: flex;
  align-items: center;
  gap: var(--spacing-25);
  min-width: 0;
}

.wikitab-saved-section__pin {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.wikitab-saved-section__heading {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
  color: var(--color-base);
}

.wikitab-saved-section__empty {
  display: flex;
  align-items: center;
  margin: 0;
  min-height: var(--wikitab-card-height);
  color: var(--color-subtle);
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

.wikitab-saved-section__card:has(.wikitab-card--has-menu [aria-expanded='true']) {
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
  padding-inline: var(--wikitab-page-gutter);
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
