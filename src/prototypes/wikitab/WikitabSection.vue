<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { CdxButton, CdxIcon, CdxMenuButton } from '@wikimedia/codex'
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
import { useEqualRowHeights } from './useEqualRowHeights'
import { useInfiniteScroll } from './useInfiniteScroll'
import { usePreventHorizontalSwipeNavigation } from './usePreventHorizontalSwipeNavigation'
import { useRestoreReservedOnScreenClose } from './useRestoreReservedOnScreenClose'
import { useRevealOnScrollEnd } from './useRevealOnScrollEnd'
import { useSectionReveal } from './useSectionReveal'
import { wikitabShowMoreDisabled } from './wikitabShowMoreDisabled'
import {
  wikitabCardSaveArticleMenuOption,
  type SaveItemPayload,
  type WikitabSaveArticleMenuLookup,
} from './data/savedCardHelpers'
import { snippetSavedId } from './data/savedItemIds'
import { wikitabCardDescriptionText } from './data/wikitabCardDescription'
import type { WikitabSavedSnippetSource } from './data/wikitabSavedItems'
import { wikitabModuleAboutFooter } from './data/wikitabModuleAbout'
import type { WikitabCardData, WikitabSectionId, WikitabSectionSpec } from './sections'

const ARTICLE_SECTION_IDS = new Set<WikitabSectionId>(['trending', 'births'])
const SNIPPET_SECTION_IDS = new Set<WikitabSectionId>(['dyk', 'otd', 'news'])

/** Hook sections saved as the snippet itself (Save article saves the bold link). */
function snippetSourceForSection(id: WikitabSectionId): WikitabSavedSnippetSource | null {
  if (id === 'dyk' || id === 'news' || id === 'otd') return id
  return null
}

const SAVE_SECTION_IDS = new Set<WikitabSectionId>([
  ...ARTICLE_SECTION_IDS,
  ...SNIPPET_SECTION_IDS,
])

const props = withDefaults(
  defineProps<{
    spec: WikitabSectionSpec
    items: WikitabCardData[]
    loading: boolean
    error: string | null
    pinned: boolean
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
  'open-screen': []
  'close-screen': []
}>()

const isScreen = computed(() => props.variant === 'screen')

function savedIdForCard(card: WikitabCardData): string {
  const snippetSource = snippetSourceForSection(props.spec.id)
  if (snippetSource) {
    return snippetSavedId(snippetSource, wikitabCardDescriptionText(card) ?? '')
  }
  return card.key
}

function savePayloadForCard(card: WikitabCardData): SaveItemPayload {
  const snippetSource = snippetSourceForSection(props.spec.id)
  if (snippetSource) {
    return { primitive: 'snippet', card, source: snippetSource }
  }
  return { primitive: 'article', card }
}

const items = computed(() => props.items)
const loading = toRef(props, 'loading')
const { reserved, revealing, hasMore, revealMore, slotCard, slotLoading, pendingCount } =
  useSectionReveal(props.spec, items, loading)

useRestoreReservedOnScreenClose(
  isScreen,
  reserved,
  computed(() => props.items.length),
)

const skin = useSkin()

const scroller = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)
const panelRoot = computed(() => scroller.value?.closest('.wikitab-panel') ?? null)

const observeScrollEnd = computed(
  () =>
    !isScreen.value &&
    skin.value === 'mobile' &&
    !props.error &&
    (props.items.length > 0 || hasMore.value) &&
    !(props.items.length === 0 && props.loading),
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
  cardHeight: computed(() => props.spec.cardHeight),
  enabled: computed(() => !props.error),
  watchKeys: [
    computed(() => reserved.value),
    pendingCount,
    computed(() => props.items.length),
    computed(() => props.loading),
  ],
})

const slots = computed(() => {
  // Keep initial skeleton slots while the section is still loading with no cards
  // (reserved can briefly clamp to 0 if `loading` lags an empty items update).
  const count =
    props.loading && props.items.length === 0
      ? Math.max(reserved.value, props.spec.initialCount)
      : reserved.value
  return Array.from({ length: count }, (_, index) => ({
    card: slotCard(index),
    loading: slotLoading(index),
  }))
})

/*
 * The row is always rendered so the sections below never move; only the control
 * inside it comes and goes. While the feed is still loading we can't yet know
 * whether a section has more, so it shows as disabled rather than hidden.
 */
const isEmpty = computed(() => !props.loading && !props.error && props.items.length === 0)

const canShowMore = computed(() => props.loading || hasMore.value)
const showMoreDisabled = computed(() =>
  wikitabShowMoreDisabled({
    itemCount: props.items.length,
    loading: props.loading,
    revealing: revealing.value,
  }),
)

/** Off while busy so reconnect re-checks the sentinel after load/reveal settles. */
const observeScreenInfinite = computed(
  () =>
    isScreen.value &&
    !props.error &&
    !isEmpty.value &&
    canShowMore.value &&
    !showMoreDisabled.value,
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
const footerItem = computed(() =>
  wikitabModuleAboutFooter(props.spec.id, props.spec.heading),
)

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
    class="wikitab-section"
    :class="{
      'wikitab-section--screen': isScreen,
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
          class="wikitab-section__menu"
          weight="quiet"
          :menu-items="menuItems"
          :footer="footerItem ?? undefined"
          :aria-label="`${spec.heading} options`"
        >
          <CdxIcon :icon="cdxIconEllipsis" />
        </CdxMenuButton>
      </template>
    </WikitabModuleHead>

    <p v-if="error" class="wikitab-section__error">
      <small>{{ error }}</small>
    </p>

    <!-- Feed modules never show an empty copy prompt — skeletons until cards land. -->
    <div v-else ref="scroller" class="wikitab-section__cards">
      <WikitabCard
        v-for="(slot, index) in slots"
        :key="index"
        class="wikitab-section__card"
        v-bind="
          wikitabCardBindProps(spec.primitive, {
            supportingIcon: spec.supportingIcon,
            card: slot.card,
            loading: slot.loading,
            menu: slot.card
              ? wikitabCardFeedMenuItems({
                  save: SAVE_SECTION_IDS.has(spec.id)
                    ? {
                        isSaved: isCardSaved(savedIdForCard(slot.card)),
                        primitiveId: spec.primitive,
                      }
                    : false,
                  saveArticle:
                    snippetSourceForSection(spec.id) && slot.card
                      ? wikitabCardSaveArticleMenuOption(
                          slot.card.seedArticle,
                          saveArticleMenuLookup,
                        )
                      : false,
                  hideFromHeading: spec.heading,
                })
              : undefined,
          })
        "
        @hide-article="emit('hide-article', $event)"
        @toggle-save="slot.card && emit('toggle-save', savePayloadForCard(slot.card))"
        @toggle-save-article="slot.card && emit('toggle-save-article', slot.card)"
      />
      <div
        v-if="!isScreen"
        ref="sentinel"
        class="wikitab-section__sentinel"
        aria-hidden="true"
      />
    </div>

    <div
      v-if="isScreen && !error && !isEmpty"
      ref="sentinel"
      class="wikitab-section__sentinel wikitab-section__sentinel--screen"
      aria-hidden="true"
    />

    <div v-if="!isScreen" class="wikitab-section__more">
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

/* Holds the reserved height rather than collapsing the section. */
.wikitab-section__error {
  display: flex;
  align-items: center;
  margin: 0;
  min-height: var(--wikitab-card-height);
  color: var(--color-subtle);
}

.wikitab-section__empty {
  margin: 0;
  color: var(--color-subtle);
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
  margin-top: var(--spacing-100);
}

/*
 * Home feed card compact type (14px body / 12px small). Codex tokens are rem-based, so
 * shadow them on the card grid only — hero search and section headings keep defaults.
 */
.wikitab-section__cards {
  --font-size-small: 0.75rem;
  --font-size-medium: 0.875rem;
  --font-size-large: 1rem;
  --line-height-small: 1.25rem;
  --line-height-medium: 1.375rem;
  --line-height-large: 1.375rem;
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

.wikitab-section__card:has(.wikitab-card--has-menu [aria-expanded='true']) {
  overflow: visible;
  z-index: 3;
}

/* Home mobile uses the in-scroller sentinel; desktop home uses Show more. */
[data-skin='desktop'] .wikitab-section__sentinel:not(.wikitab-section__sentinel--screen) {
  display: none;
}

/*
 * Mobile: one horizontally scrolling row that deliberately bleeds past the right
 * edge, so it reads as continuable rather than complete. No end padding — flex
 * overflow drops padding-inline-end anyway; the row gap before the load-more
 * sentinel leaves the last card’s end roughly on the section ⋯ column.
 */
[data-skin='mobile'] .wikitab-section:not(.wikitab-section--screen) .wikitab-section__cards {
  display: flex;
  align-items: stretch;
  gap: var(--spacing-100);
  /* Cancel the page gutter so the row scrolls edge to edge, then reinstate
     start padding so the first card still lines up with the heading. */
  margin-inline: calc(var(--wikitab-page-gutter) * -1);
  padding-inline: var(--wikitab-page-gutter) 0;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  /* Without this, snapping to a card's start edge scrolls straight past the
     row's start padding and the first card sits flush to the viewport edge. */
  scroll-padding-inline-start: var(--wikitab-page-gutter);
  scrollbar-width: none;
}

[data-skin='mobile'] .wikitab-section:not(.wikitab-section--screen) .wikitab-section__cards::-webkit-scrollbar {
  display: none;
}

[data-skin='mobile'] .wikitab-section:not(.wikitab-section--screen) .wikitab-section__card {
  flex: 0 0 320px;
  align-self: stretch;
  min-height: var(--wikitab-card-height);
  scroll-snap-align: start;
}

/* Mobile home reveals on scroll, so the button would be redundant. */
[data-skin='mobile'] .wikitab-section:not(.wikitab-section--screen) .wikitab-section__more {
  display: none;
}

/* Fullscreen screen: vertical grid on both skins (Saved-panel layout). */
[data-skin='mobile'] .wikitab-section--screen .wikitab-section__cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: stretch;
  gap: var(--spacing-100);
}

[data-skin='mobile'] .wikitab-section--screen .wikitab-section__card {
  min-height: 0;
}

.wikitab-section__sentinel--screen {
  flex: none;
  width: 100%;
  height: 1px;
}
</style>
