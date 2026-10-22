<script setup lang="ts">
/**
 * A module's list of article cards: Codex `CdxCard`s with a large thumbnail and a
 * supporting line under the text, opening the article template. While loading
 * it shows flat skeletons of the same shape, so the cards land without moving
 * the page.
 */
import { CdxCard, CdxIcon } from '@wikimedia/codex'
import type { Icon } from '@wikimedia/codex-icons'

import { ARTICLE_TEMPLATE_PATH } from '@/composables/webTemplatePaths'
import { useWikiPrototypeNavigation } from '@/composables/useWikiPrototypeNavigation'

export interface HomeArticleCard {
  title: string
  description?: string
  thumbnailUrl?: string
  /** Short line under the text, e.g. the task or why it's suggested. */
  supportingText?: string
}

defineProps<{
  cards: readonly HomeArticleCard[]
  loading?: boolean
  /** Skeletons shown while loading. */
  skeletons: number
  /** Glyph before each card's supporting text. */
  supportingIcon?: Icon
  /** Supporting text (and its icon) in progressive blue: it names a task to do. */
  progressive?: boolean
}>()

const { navigateToWikiPrototype, resolveWikiPrototypeUrl } = useWikiPrototypeNavigation()

function thumbnail(card: HomeArticleCard) {
  return card.thumbnailUrl ? { url: card.thumbnailUrl } : null
}

/** Cards open the article template; modified clicks still open a new tab. */
function onClick(event: MouseEvent, card: HomeArticleCard): void {
  if (event.defaultPrevented || event.button !== 0) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  navigateToWikiPrototype(ARTICLE_TEMPLATE_PATH, card.title)
}
</script>

<template>
  <div
    class="home-article-cards"
    :class="{ 'home-article-cards--progressive': progressive }"
    :aria-busy="loading"
  >
    <template v-if="loading">
      <div v-for="index in skeletons" :key="index" class="home-card-skeleton" aria-hidden="true">
        <div class="home-card-skeleton__image" />
      </div>
    </template>

    <CdxCard
      v-for="card in cards"
      v-else
      :key="card.title"
      class="home-article-cards__card"
      :url="resolveWikiPrototypeUrl(ARTICLE_TEMPLATE_PATH, card.title) ?? undefined"
      :thumbnail="thumbnail(card)"
      thumbnail-size="large"
      force-thumbnail
      @click="onClick($event, card)"
    >
      <template #title>{{ card.title }}</template>
      <template v-if="card.description" #description>{{ card.description }}</template>
      <template v-if="card.supportingText" #supporting-text>
        <span class="home-article-cards__supporting">
          <span v-if="supportingIcon" class="home-article-cards__supporting-icon">
            <CdxIcon :icon="supportingIcon" size="small" />
          </span>
          <span>{{ card.supportingText }}</span>
        </span>
      </template>
    </CdxCard>
  </div>
</template>

<style scoped>
.home-article-cards {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}

/*
 * CODEX+ CdxCard: no option to pin the supporting text to the bottom. The text
 * block fills the card's height and the supporting line sits on its bottom edge,
 * so beside a taller thumbnail every card's supporting line sits at the bottom.
 * Fixed upstream (T436852, Codex `6c422f47`, unreleased after 2.7.0): remove
 * these two rules once the next Codex release ships.
 */
.home-article-cards__card :deep(.cdx-card__text) {
  flex-grow: 1;
  align-self: stretch;
}

.home-article-cards__card :deep(.cdx-card__text__supporting-text) {
  margin-top: auto;
  padding-top: var(--spacing-50);
}

/* CODEX+ CdxCard: no progressive supporting text. A suggestion's task reads as a call to action. */
.home-article-cards--progressive :deep(.cdx-card__text__supporting-text),
.home-article-cards--progressive .home-article-cards__supporting-icon .cdx-icon {
  color: var(--color-progressive);
}

/* When the label wraps, the icon stays with its first line. */
.home-article-cards__supporting {
  display: inline-flex;
  align-items: flex-start;
  gap: var(--spacing-25);
}

/* One line box tall, so the icon centres on the first line of text. */
.home-article-cards__supporting-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  height: 1lh;
}

/*
 * CODEX+ No skeleton / loading-placeholder component in Codex.
 * The card's own outline, empty, with an outlined box where its thumbnail goes.
 * No fill and no motion. The height matches a typical card, so the swap doesn't
 * move the page.
 */
.home-card-skeleton {
  box-sizing: border-box;
  height: 122px;
  padding: var(--spacing-75);
  border: var(--border-width-base) var(--border-style-base) var(--border-color-base);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-base);
}

/* Minerva's narrower column wraps descriptions onto more lines. */
[data-skin='mobile'] .home-card-skeleton {
  height: 129px;
}

/* Codex's large thumbnail: 96px, in the thumbnail's subtle outline. */
.home-card-skeleton__image {
  box-sizing: border-box;
  width: var(--size-600);
  height: var(--size-600);
  border: var(--border-width-base) var(--border-style-base) var(--border-color-subtle);
  border-radius: var(--border-radius-base);
}
</style>
