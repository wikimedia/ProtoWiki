<script setup lang="ts">
import { savedItemKey } from './data/wikitabSavedItems'
import { computed, ref, toRef, watch } from 'vue'

import { useSkin } from '@/composables/useSkin'
import WikitabModuleHead from './WikitabModuleHead.vue'
import WikitabNothingSavedYet from './WikitabNothingSavedYet.vue'
import WikitabSavedItemSlot from './WikitabSavedItemSlot.vue'
import WikitabSavedItemTabs from './WikitabSavedItemTabs.vue'
import type { WikitabSavedItem } from './data/wikitabConfig'
import type { WikitabSaveArticleMenuLookup } from './data/savedCardHelpers'
import { useEqualRowHeights } from './useEqualRowHeights'
import { useInfiniteScroll } from './useInfiniteScroll'
import { useWikitabOverlayScrollLock } from './useWikitabOverlayScrollLock'
import { useWikitabSavedItemTabFilter } from './useWikitabSavedItemTabFilter'

const INITIAL_COUNT = 6
const PAGE_SIZE = 6
const CARD_HEIGHT = 122

const props = defineProps<{
  savedItems: WikitabSavedItem[]
  isCardSaved: (id: string, lang?: string) => boolean
  saveArticleMenuLookup: WikitabSaveArticleMenuLookup
}>()

const emit = defineEmits<{
  close: []
  /** Saved identity is `lang` + id — ids are only unique within one wiki. */
  'toggle-save': [id: string, lang: string]
  'toggle-save-article': [id: string, lang: string]
}>()

const skin = useSkin()
const panelRoot = ref<HTMLElement | null>(null)
const scroller = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)
const reserved = ref(INITIAL_COUNT)

const savedItems = toRef(props, 'savedItems')
const { activeTab, showTabs, tabs, filteredItems } = useWikitabSavedItemTabFilter(savedItems)

const visibleItems = computed(() => filteredItems.value.slice(0, reserved.value))
const hasMore = computed(() => filteredItems.value.length > reserved.value)

watch([activeTab, filteredItems], () => {
  reserved.value = INITIAL_COUNT
})

const rowColumns = computed(() => (skin.value === 'desktop' ? 2 : 1))

useEqualRowHeights({
  container: scroller,
  columns: rowColumns,
  cardHeight: computed(() => CARD_HEIGHT),
  enabled: computed(() => visibleItems.value.length > 0),
  floorResolvedRows: false,
  watchKeys: [
    computed(() => visibleItems.value.length),
    computed(() => reserved.value),
    activeTab,
  ],
})

function revealMore(): void {
  if (!hasMore.value) return
  reserved.value = Math.min(filteredItems.value.length, reserved.value + PAGE_SIZE)
}

useInfiniteScroll({
  sentinel,
  root: panelRoot,
  enabled: hasMore,
  onReach: revealMore,
})

useWikitabOverlayScrollLock('wikitab-saved-panel-open', ref(true))
</script>

<template>
  <div
    ref="panelRoot"
    class="wikitab-saved-articles-panel wikitab-panel"
    role="dialog"
    aria-modal="true"
    aria-label="Saved"
    :style="{ '--wikitab-card-height': `${CARD_HEIGHT}px` }"
  >
    <div class="wikitab-saved-articles-panel__column">
      <WikitabModuleHead title="Saved" variant="screen" @close="emit('close')" />

      <WikitabSavedItemTabs
        v-if="showTabs && savedItems.length > 0"
        v-model:active="activeTab"
        :tabs="tabs"
      />

      <WikitabNothingSavedYet v-if="savedItems.length === 0" />

      <template v-else>
        <div ref="scroller" class="wikitab-saved-articles-panel__cards">
          <WikitabSavedItemSlot
            v-for="saved in visibleItems"
            :key="savedItemKey(saved)"
            class="wikitab-saved-articles-panel__card wikitab-section__card"
            :saved="saved"
            :show-article-menu="true"
            :is-saved="isCardSaved(saved.id, saved.lang)"
            :is-card-saved="isCardSaved"
            :save-article-menu-lookup="saveArticleMenuLookup"
            @toggle-save="emit('toggle-save', saved.id, saved.lang)"
            @toggle-save-article="emit('toggle-save-article', saved.id, saved.lang)"
          />
        </div>

        <div
          ref="sentinel"
          class="wikitab-saved-articles-panel__sentinel"
          aria-hidden="true"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
:global(html.wikitab-saved-panel-open) {
  overflow: hidden;
  scrollbar-gutter: auto;
}

.wikitab-saved-articles-panel__column {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  margin-inline: auto;
}

.wikitab-saved-articles-panel__cards {
  --font-size-small: 0.75rem;
  --font-size-medium: 0.875rem;
  --font-size-large: 1rem;
  --line-height-small: 1.25rem;
  --line-height-medium: 1.375rem;
  --line-height-large: 1.375rem;
}

.wikitab-saved-articles-panel__cards {
  display: grid;
  align-items: stretch;
  gap: var(--spacing-100);
}

[data-skin='desktop'] .wikitab-saved-articles-panel__cards {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

[data-skin='mobile'] .wikitab-saved-articles-panel__cards {
  grid-template-columns: minmax(0, 1fr);
}

[data-skin='desktop'] .wikitab-saved-articles-panel__card {
  min-height: 0;
}

.wikitab-saved-articles-panel__card:has(.wikitab-card--has-menu [aria-expanded='true']),
.wikitab-saved-articles-panel__card:has(.wikitab-card__menu [aria-expanded='true']),
.wikitab-saved-articles-panel__card:has(.wikitab-search-contribute-card__menu [aria-expanded='true']) {
  overflow: visible;
  z-index: 3;
}

.wikitab-saved-articles-panel__sentinel {
  width: 100%;
  height: 1px;
  margin-bottom: var(--spacing-400);
}

@media (max-width: 767px) {
  .wikitab-saved-articles-panel {
    padding: 0;
  }

  .wikitab-saved-articles-panel__column {
    padding-top: var(--wikitab-chrome-inset);
    padding-inline: var(--spacing-100);
  }
}

@media (min-width: 768px) {
  [data-skin='desktop'] .wikitab-saved-articles-panel {
    --wikitab-page-gutter: var(--spacing-400);
  }

  [data-skin='desktop'] .wikitab-saved-articles-panel__column {
    max-width: 640px;
  }
}
</style>
