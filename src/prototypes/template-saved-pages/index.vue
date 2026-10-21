<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { CdxCard, CdxIcon, CdxProgressBar } from '@wikimedia/codex'
import { cdxIconBookmark, cdxIconLock } from '@wikimedia/codex-icons'

import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import { useConfig } from '@/composables/useConfig'
import { useSkin } from '@/composables/useSkin'
import { useWikiPrototypeNavigation } from '@/composables/useWikiPrototypeNavigation'
import { ARTICLE_TEMPLATE_PATH, SAVED_PAGES_TEMPLATE_PATH } from '@/composables/webTemplatePaths'

import {
  fetchReadingListPages,
  savedPageNotFoundMessage,
  type SavedPageListItem,
} from './fetchReadingListPages'
import SavedPagesEmptyState from './SavedPagesEmptyState.vue'

definePage({
  meta: {
    title: 'Saved',
    description: 'Template for the Saved special page',
    category: 'template',
    platform: 'web',
    order: 5.5,
    icon: cdxIconBookmark,
  },
})

const { currentUserPageLists, lang } = useConfig()
const skin = useSkin()
const { resolveWikiPrototypeUrl } = useWikiPrototypeNavigation()

const isDesktop = computed(() => skin.value === 'desktop')

const entries = ref<SavedPageListItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

let fetchController: AbortController | undefined

const savedTitles = computed(() => currentUserPageLists.value.readingList)

const isReadingListEmpty = computed(() => savedTitles.value.length === 0)

async function loadSavedPages(): Promise<void> {
  fetchController?.abort()
  fetchController = new AbortController()

  if (isReadingListEmpty.value) {
    entries.value = []
    loading.value = false
    error.value = null
    return
  }

  loading.value = true
  error.value = null

  try {
    entries.value = await fetchReadingListPages(savedTitles.value, {
      signal: fetchController.signal,
      lang: lang.value,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    error.value = err instanceof Error ? err.message : 'Failed to load saved pages.'
    entries.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadSavedPages()
})

watch([savedTitles, lang], () => {
  void loadSavedPages()
})

function articleUrl(title: string): string | undefined {
  return resolveWikiPrototypeUrl(ARTICLE_TEMPLATE_PATH, title) ?? undefined
}

function cardThumbnail(entry: SavedPageListItem) {
  if (entry.kind !== 'page' || !entry.thumbnailUrl) return null
  return { url: entry.thumbnailUrl }
}

function entryKey(entry: SavedPageListItem): string | number {
  return entry.kind === 'page' ? entry.pageid : entry.requestedTitle
}
</script>

<template>
  <ChromeWrapper :last-edited-notice="false" :saved-pages-route="SAVED_PAGES_TEMPLATE_PATH">
    <SpecialPageWrapper class="template-saved-pages">
      <template #title>
        <span class="template-saved-pages__title-text">Saved</span>
        <CdxIcon
          class="template-saved-pages__lock"
          :icon="cdxIconLock"
          size="small"
          aria-hidden="true"
        />
      </template>

      <p v-if="!isReadingListEmpty" class="template-saved-pages__sort-label">
        Sorted by most recent.
      </p>

      <CdxProgressBar
        v-if="loading"
        inline
        class="template-saved-pages__progress"
        aria-label="Loading saved pages"
      />

      <p v-else-if="error" class="template-saved-pages__status">{{ error }}</p>
      <SavedPagesEmptyState v-else-if="isReadingListEmpty" />

      <div
        v-else-if="entries.length"
        class="template-saved-pages__cards"
        :class="{
          'template-saved-pages__cards--grid': isDesktop,
          'template-saved-pages__cards--list': !isDesktop,
        }"
      >
        <CdxCard
          v-for="entry in entries"
          :key="entryKey(entry)"
          :url="entry.kind === 'page' ? articleUrl(entry.title) : undefined"
          class="template-saved-pages__card"
          :class="{ 'template-saved-pages__card--placeholder': entry.kind === 'placeholder' }"
          :thumbnail="cardThumbnail(entry)"
          force-thumbnail
          :thumbnail-position="isDesktop ? 'block-start' : 'inline-start'"
          :thumbnail-size="isDesktop ? undefined : 'large'"
          :separation="isDesktop ? 'outline' : 'divider'"
        >
          <template #title>{{
            entry.kind === 'placeholder' ? entry.requestedTitle : entry.title
          }}</template>
          <template v-if="entry.kind === 'placeholder'" #description>
            <span class="template-saved-pages__not-found" role="alert">{{
              savedPageNotFoundMessage(entry.requestedTitle)
            }}</span>
          </template>
          <template v-else-if="entry.description" #description>{{ entry.description }}</template>
        </CdxCard>
      </div>
    </SpecialPageWrapper>
  </ChromeWrapper>
</template>

<style scoped>
.template-saved-pages :deep(.special-page-wrapper__title) {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
}

.template-saved-pages__lock {
  color: var(--color-subtle, #54595d);
}

.template-saved-pages__sort-label {
  margin: 0 0 var(--spacing-100, 16px);
  font-size: var(--font-size-small, 0.875rem);
  line-height: var(--line-height-small, 1.4);
  color: var(--color-subtle, #54595d);
}

.template-saved-pages__progress {
  margin-block: var(--spacing-100, 16px);
}

.template-saved-pages__status {
  margin: 0;
  color: var(--color-subtle, #54595d);
}

.template-saved-pages__cards--grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: var(--spacing-100, 16px);
}

/* Codex block-start thumbs default to 16∶9 — square reads closer to saved-pages mocks. */
.template-saved-pages__cards--grid
  .template-saved-pages__card
  :deep(.cdx-card__thumbnail.cdx-thumbnail) {
  width: 100%;
}

.template-saved-pages__cards--grid
  .template-saved-pages__card
  :deep(.cdx-card__thumbnail .cdx-thumbnail__image),
.template-saved-pages__cards--grid
  .template-saved-pages__card
  :deep(.cdx-card__thumbnail .cdx-thumbnail__placeholder) {
  aspect-ratio: 1 / 1;
}

.template-saved-pages__cards--grid .template-saved-pages__card :deep(.cdx-card__text) {
  padding-block-end: var(--spacing-50, 8px);
}

.template-saved-pages__card :deep(.cdx-thumbnail__image) {
  background-position-x: center;
  background-position-y: 0;
}

.template-saved-pages__cards--list {
  display: flex;
  flex-direction: column;
}

.template-saved-pages__cards--list .template-saved-pages__card :deep(.cdx-card) {
  min-height: 6.5rem;
  align-items: stretch;
}

.template-saved-pages__card :deep(.cdx-card__text__description) {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.template-saved-pages__cards--list .template-saved-pages__card :deep(.cdx-card__text__description) {
  -webkit-line-clamp: 2;
}

.template-saved-pages__card--placeholder :deep(.cdx-card__text__description) {
  -webkit-line-clamp: unset;
}

.template-saved-pages__not-found {
  color: var(--color-error, #bf311a);
}
</style>
