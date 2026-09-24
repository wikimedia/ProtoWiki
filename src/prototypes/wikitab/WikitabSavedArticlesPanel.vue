<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconClose } from '@wikimedia/codex-icons'

import { useSkin } from '@/composables/useSkin'
import WikitabCard from './WikitabCard.vue'
import { articleUrl } from './data/wikitabHtml'
import type { WikitabSavedArticle } from './data/wikitabConfig'
import type { WikitabCardData } from './sections'
import { useEqualRowHeights } from './useEqualRowHeights'

const INITIAL_COUNT = 6
const PAGE_SIZE = 6
const CARD_HEIGHT = 122
const THUMBNAIL_SIZE = 96

const props = defineProps<{
  savedArticles: WikitabSavedArticle[]
  isArticleSaved: (title: string) => boolean
}>()

const emit = defineEmits<{
  close: []
  'toggle-save': [card: WikitabCardData]
}>()

const skin = useSkin()
const scroller = ref<HTMLElement | null>(null)
const reserved = ref(INITIAL_COUNT)

const visibleArticles = computed(() => props.savedArticles.slice(0, reserved.value))
const hasMore = computed(() => props.savedArticles.length > reserved.value)

const cards = computed(() =>
  visibleArticles.value.map(
    (article): WikitabCardData => ({
      key: article.titleKey,
      href: articleUrl(article.title),
      linkTitle: article.title,
      title: article.title,
      description: article.description,
      thumbnailUrl: article.thumbnailUrl,
    }),
  ),
)

const rowColumns = computed(() => (skin.value === 'desktop' ? 2 : 1))

useEqualRowHeights({
  container: scroller,
  columns: rowColumns,
  cardHeight: computed(() => CARD_HEIGHT),
  enabled: computed(() => cards.value.length > 0),
  watchKeys: [computed(() => cards.value.length), computed(() => reserved.value)],
})

function revealMore(): void {
  if (!hasMore.value) return
  reserved.value = Math.min(props.savedArticles.length, reserved.value + PAGE_SIZE)
}

function cardArticleTitle(card: WikitabCardData): string {
  return card.linkTitle ?? card.title ?? ''
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close')
}

const SCROLL_LOCK_CLASS = 'wikitab-saved-panel-open'

onMounted(() => {
  document.documentElement.classList.add(SCROLL_LOCK_CLASS)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.documentElement.classList.remove(SCROLL_LOCK_CLASS)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    class="wikitab-saved-articles-panel"
    role="dialog"
    aria-modal="true"
    aria-label="Saved"
    :style="{ '--wikitab-card-height': `${CARD_HEIGHT}px` }"
  >
    <div class="wikitab-saved-articles-panel__column">
      <header class="wikitab-saved-articles-panel__head">
        <h2 class="wikitab-saved-articles-panel__title">Saved</h2>
        <CdxButton
          class="wikitab-saved-articles-panel__close"
          weight="quiet"
          :icon-only="true"
          aria-label="Close"
          @click="emit('close')"
        >
          <CdxIcon :icon="cdxIconClose" />
        </CdxButton>
      </header>

      <p v-if="savedArticles.length === 0" class="wikitab-saved-articles-panel__empty">
        Nothing saved yet.
      </p>

      <template v-else>
        <div ref="scroller" class="wikitab-saved-articles-panel__cards">
          <WikitabCard
            v-for="card in cards"
            :key="card.key"
            class="wikitab-saved-articles-panel__card"
            variant="thumbnail"
            :height="CARD_HEIGHT"
            :thumbnail-size="THUMBNAIL_SIZE"
            :card="card"
            :show-article-menu="true"
            :is-saved="isArticleSaved(cardArticleTitle(card))"
            @toggle-save="emit('toggle-save', card)"
          />
        </div>

        <div class="wikitab-saved-articles-panel__more">
          <CdxButton
            v-if="hasMore"
            class="wikitab-saved-articles-panel__more-button"
            action="progressive"
            weight="quiet"
            @click="revealMore"
          >
            Show more
          </CdxButton>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
:global(html.wikitab-saved-panel-open) {
  overflow: hidden;
  scrollbar-gutter: auto;
}

.wikitab-saved-articles-panel {
  --wikitab-page-gutter: var(--spacing-100);

  position: fixed;
  inset: 0;
  z-index: 20;
  box-sizing: border-box;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-inline: var(--wikitab-page-gutter);
  padding-block: var(--spacing-100);
  background-color: var(--wikitab-theme-bg, var(--background-color-base));
  color: var(--wikitab-theme-fg, var(--color-base));
}

.wikitab-saved-articles-panel__column {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  width: 100%;
  max-width: 640px;
  margin-inline: auto;
}

.wikitab-saved-articles-panel__head {
  display: flex;
  align-items: center;
  gap: var(--spacing-50);
  width: 100%;
  padding-top: var(--spacing-200);
}

.wikitab-saved-articles-panel__title {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
  color: var(--wikitab-theme-fg, var(--color-base));
}

.wikitab-saved-articles-panel__close {
  flex-shrink: 0;
  width: 2.75rem;
  min-width: 2.75rem;
  height: 2.75rem;
  min-height: 2.75rem;
}

.wikitab-saved-articles-panel__empty {
  margin: 0;
  padding-bottom: var(--spacing-400);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
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

.wikitab-saved-articles-panel__card:has(.wikitab-card--has-menu [aria-expanded='true']) {
  overflow: visible;
  z-index: 3;
}

.wikitab-saved-articles-panel__more {
  display: flex;
  justify-content: center;
  min-height: var(--line-height-small);
  padding-bottom: var(--spacing-400);
}

@media (min-width: 768px) {
  [data-skin='desktop'] .wikitab-saved-articles-panel {
    --wikitab-page-gutter: var(--spacing-400);
  }
}
</style>
