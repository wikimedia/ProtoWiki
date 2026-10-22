<script setup lang="ts">
/**
 * The Suggested edits module's body: articles with something to improve, each
 * labelled with its task. Grows from the Mock user's saved pages, edited pages
 * and watchlist; a reader with none gets one random suggestion. Cards open the
 * article template. Desktop and mobile both reveal more cards in place.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { CdxButton, CdxCard, CdxIcon } from '@wikimedia/codex'
import { cdxIconCollapse, cdxIconLightbulb } from '@wikimedia/codex-icons'

import { useConfig } from '@/composables/useConfig'
import { ARTICLE_TEMPLATE_PATH } from '@/composables/webTemplatePaths'
import { useWikiPrototypeNavigation } from '@/composables/useWikiPrototypeNavigation'

import {
  loadSuggestedEdits,
  RANDOM_SUGGESTION_COUNT,
  titleKey,
  type SuggestedEdit,
} from './loadSuggestedEdits'

/** Cards shown at first, and revealed by each "Show more". */
const PAGE_SIZE = 3

const { currentUserPageLists } = useConfig()
const { navigateToWikiPrototype, resolveWikiPrototypeUrl } = useWikiPrototypeNavigation()

/** The reader's saved pages, edited pages and watchlist, deduplicated, in that order. */
const seeds = computed(() => {
  const { readingList, editedPages, watchlist } = currentUserPageLists.value
  const seen = new Set<string>()
  return [...readingList, ...editedPages, ...watchlist].filter((title) => {
    const key = titleKey(title)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
})

const personal = computed(() => seeds.value.length > 0)
const firstCount = computed(() => (personal.value ? PAGE_SIZE : RANDOM_SUGGESTION_COUNT))

const edits = ref<SuggestedEdit[]>([])
const loading = ref(false)
const error = ref(false)
const shown = ref(PAGE_SIZE)

let controller: AbortController | null = null

async function load(): Promise<void> {
  controller?.abort()
  const current = new AbortController()
  controller = current
  loading.value = true
  error.value = false
  shown.value = firstCount.value
  try {
    edits.value = await loadSuggestedEdits(seeds.value, current.signal)
  } catch (err) {
    if (current.signal.aborted) return
    console.error(err)
    edits.value = []
    error.value = true
  } finally {
    if (controller === current) loading.value = false
  }
}

watch(() => seeds.value.join('\n'), load, { immediate: true })
onBeforeUnmount(() => controller?.abort())

const visible = computed(() => edits.value.slice(0, shown.value))
const hasMore = computed(() => shown.value < edits.value.length)
const expanded = computed(() => shown.value > firstCount.value)

function revealMore(): void {
  shown.value += PAGE_SIZE
}

const root = ref<HTMLElement | null>(null)

/** Fold back, and bring the module into view if the reader had scrolled past it. */
function collapse(): void {
  shown.value = firstCount.value
  const el = root.value
  if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' })
}

function thumbnail(edit: SuggestedEdit) {
  return edit.thumbnailUrl ? { url: edit.thumbnailUrl } : null
}

/** Cards open the article template; modified clicks still open a new tab. */
function onClick(event: MouseEvent, edit: SuggestedEdit): void {
  if (event.defaultPrevented || event.button !== 0) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  navigateToWikiPrototype(ARTICLE_TEMPLATE_PATH, edit.title)
}
</script>

<template>
  <div ref="root" class="home-suggested-edits">
    <div v-if="error" class="home-suggested-edits__error">
      <p>Couldn't load this section.</p>
      <CdxButton weight="quiet" @click="load">Try again</CdxButton>
    </div>

    <p v-else-if="!loading && !edits.length" class="home-suggested-edits__empty">
      Nothing here right now.
    </p>

    <template v-else>
      <div class="home-suggested-edits__cards" :aria-busy="loading">
        <!-- Skeletons hold the first cards' place, so they don't move the page when they land. -->
        <template v-if="loading">
          <div
            v-for="index in firstCount"
            :key="index"
            class="home-card-skeleton"
            aria-hidden="true"
          >
            <div class="home-card-skeleton__image" />
          </div>
        </template>

        <CdxCard
          v-for="edit in visible"
          v-else
          :key="edit.title"
          class="home-suggested-edits__card"
          :url="resolveWikiPrototypeUrl(ARTICLE_TEMPLATE_PATH, edit.title) ?? undefined"
          :thumbnail="thumbnail(edit)"
          thumbnail-size="large"
          force-thumbnail
          @click="onClick($event, edit)"
        >
          <template #title>{{ edit.title }}</template>
          <template v-if="edit.description" #description>{{ edit.description }}</template>
          <template #supporting-text>
            <span class="home-suggested-edits__task">
              <span class="home-suggested-edits__task-icon">
                <CdxIcon :icon="cdxIconLightbulb" size="small" />
              </span>
              <span>{{ edit.task }}</span>
            </span>
          </template>
        </CdxCard>
      </div>

      <div v-if="hasMore || expanded" class="home-suggested-edits__more-row">
        <CdxButton v-if="hasMore" :disabled="loading" @click="revealMore">Show more</CdxButton>
        <CdxButton
          v-if="expanded"
          class="home-suggested-edits__collapse"
          weight="quiet"
          aria-label="Show fewer"
          @click="collapse"
        >
          <CdxIcon :icon="cdxIconCollapse" />
        </CdxButton>
      </div>
    </template>
  </div>
</template>

<style scoped>
.home-suggested-edits__cards {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}

.home-suggested-edits__error,
.home-suggested-edits__empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-50);
  margin: 0;
  color: var(--color-subtle);
}

.home-suggested-edits__error p {
  margin: 0;
}

/*
 * CODEX+ CdxCard: no option to pin the supporting text to the bottom. The text
 * block fills the card's height and the supporting line sits on its bottom edge,
 * so beside a taller thumbnail every card's task line sits at the bottom.
 */
.home-suggested-edits__card :deep(.cdx-card__text) {
  flex-grow: 1;
  align-self: stretch;
}

.home-suggested-edits__card :deep(.cdx-card__text__supporting-text) {
  margin-top: auto;
  padding-top: var(--spacing-50);
}

/* CODEX+ CdxCard: no progressive supporting text. A suggestion's task reads as a call to action. */
.home-suggested-edits__card :deep(.cdx-card__text__supporting-text),
.home-suggested-edits__task-icon .cdx-icon {
  color: var(--color-progressive);
}

/* When the label wraps, the icon stays with its first line. */
.home-suggested-edits__task {
  display: inline-flex;
  align-items: flex-start;
  gap: var(--spacing-25);
}

/* One line box tall, so the icon centres on the first line of text. */
.home-suggested-edits__task-icon {
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

/* "Show more" hugs its label at the start, the collapse button sits at the end. */
.home-suggested-edits__more-row {
  display: flex;
  align-items: center;
  margin-top: var(--spacing-50);
}

.home-suggested-edits__collapse {
  margin-inline-start: auto;
}
</style>
