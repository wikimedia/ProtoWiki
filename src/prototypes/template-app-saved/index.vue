<script setup lang="ts">
definePage({
  meta: {
    title: 'Saved',
    description: 'Template for an in-app saved-articles screen with collections.',
    category: 'template',
    platform: 'app',
  },
})

import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CdxInfoChip, CdxProgressBar, CdxSearchInput, CdxTab, CdxTabs } from '@wikimedia/codex'
import { cdxIconBookmark } from '@wikimedia/codex-icons'

import type { AppHeaderItem } from '@/components/app/AppChromeHeader.vue'
import AppChromeWrapper from '@/components/app/AppChromeWrapper.vue'
import {
  ANDROID_MAIN_BOTTOM_NAV_ITEMS,
  IOS_MAIN_BOTTOM_NAV_ITEMS,
  type AppBottomNavItem,
} from '@/components/app/appBottomNavItems'
import { useIsIos } from '@/composables/useAppPlatform'

import { SAVED_COLLECTIONS } from './collections'
import { fetchSavedArticles, getCachedSavedArticles, type SavedArticle } from './fetchSavedArticles'

const router = useRouter()
const isIos = useIsIos()

const savedArticles = ref<SavedArticle[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const activeTab = ref<'all' | 'collections'>('all')
/** iOS-only inline filter — Android uses the header search icon instead. */
const searchQuery = ref('')

async function load(): Promise<void> {
  error.value = null

  const cached = getCachedSavedArticles()
  if (cached) {
    savedArticles.value = cached
    return
  }

  loading.value = true

  try {
    savedArticles.value = await fetchSavedArticles()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load saved articles.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})

function goToSearch(): void {
  router.push('/template-app-search')
}

function goToArticle(article: SavedArticle): void {
  router.push({ path: '/template-app-article', query: { article: article.title, lang: 'en' } })
}

function onBottomNav(item: AppBottomNavItem): void {
  if (item === 'search') goToSearch()
}

const bottomNavItems = computed(() =>
  isIos.value ? IOS_MAIN_BOTTOM_NAV_ITEMS : ANDROID_MAIN_BOTTOM_NAV_ITEMS,
)

const headerLeft: AppHeaderItem[] = [{ type: 'title', text: 'Saved' }]

/** Android keeps a search icon in the header; iOS gets a persistent input below it instead. */
const headerRight = computed(
  (): AppHeaderItem[] =>
    isIos.value
      ? [
          { type: 'button', icon: 'vertical-ellipsis', label: 'More' },
          { type: 'button', icon: 'tabs', label: 'Tabs' },
          { type: 'button', icon: 'user-avatar-outline', label: 'Account' },
        ]
      : [
          { type: 'button', icon: 'filter', label: 'Filter' },
          { type: 'button', icon: 'search', label: 'Search' },
          { type: 'button', icon: 'bell-outline', label: 'Notifications' },
          { type: 'button', icon: 'vertical-ellipsis', label: 'Menu' },
        ],
)

const filteredArticles = computed(() => {
  const trimmed = searchQuery.value.trim().toLowerCase()
  if (!trimmed) return savedArticles.value
  return savedArticles.value.filter((article) => article.title.toLowerCase().includes(trimmed))
})

function collectionLabel(id: string): string {
  return SAVED_COLLECTIONS.find((collection) => collection.id === id)?.name ?? id
}

const collectionsWithArticles = computed(() =>
  SAVED_COLLECTIONS.map((collection) => ({
    ...collection,
    articles: savedArticles.value.filter((article) =>
      article.collectionIds.includes(collection.id),
    ),
  })).filter((collection) => collection.articles.length > 0),
)

/** One thumb when the collection is small; first four for the 2×2 collage. */
function collectionPreviewArticles(articles: SavedArticle[]): SavedArticle[] {
  return articles.length < 4 ? articles.slice(0, 1) : articles.slice(0, 4)
}
</script>

<template>
  <AppChromeWrapper
    :left="headerLeft"
    :right="headerRight"
    :bottom-nav-items="bottomNavItems"
    @navigate="onBottomNav"
  >
    <div class="template-app-saved">
      <CdxSearchInput
        v-if="isIos"
        v-model="searchQuery"
        class="template-app-saved__search"
        placeholder="Search saved articles"
        clearable
      />

      <CdxTabs v-model:active="activeTab" class="template-app-saved__tabs">
        <CdxTab name="all" label="All articles">
          <div v-if="loading" class="template-app-saved__progress">
            <CdxProgressBar inline aria-label="Loading" />
          </div>
          <p v-else-if="error" class="template-app-saved__status">{{ error }}</p>
          <p v-else-if="!filteredArticles.length" class="template-app-saved__status">
            No saved articles.
          </p>

          <ul v-else class="template-app-saved__list">
            <li v-for="article in filteredArticles" :key="article.pageid">
              <button type="button" class="template-app-saved__row" @click="goToArticle(article)">
                <div class="template-app-saved__row-text">
                  <span class="template-app-saved__row-title">{{ article.title }}</span>
                  <span v-if="article.description" class="template-app-saved__row-description">
                    {{ article.description }}
                  </span>
                  <div v-if="article.collectionIds.length" class="template-app-saved__chips">
                    <CdxInfoChip
                      v-for="collectionId in article.collectionIds"
                      :key="collectionId"
                      :icon="cdxIconBookmark"
                    >
                      {{ collectionLabel(collectionId) }}
                    </CdxInfoChip>
                  </div>
                </div>

                <div
                  class="template-app-saved__row-thumb"
                  :class="{ 'template-app-saved__row-thumb--placeholder': !article.thumbnailUrl }"
                >
                  <img
                    v-if="article.thumbnailUrl"
                    class="template-app-saved__row-thumb-img"
                    :src="article.thumbnailUrl"
                    :alt="article.title"
                  />
                </div>
              </button>
            </li>
          </ul>
        </CdxTab>

        <CdxTab name="collections" label="Collections">
          <div v-if="loading" class="template-app-saved__progress">
            <CdxProgressBar inline aria-label="Loading" />
          </div>
          <p v-else-if="!collectionsWithArticles.length" class="template-app-saved__status">
            No collections yet.
          </p>

          <ul v-else class="template-app-saved__collections">
            <li v-for="collection in collectionsWithArticles" :key="collection.id">
              <div class="template-app-saved__collection-row">
                <div class="template-app-saved__collection-text">
                  <span class="template-app-saved__collection-name">{{ collection.name }}</span>
                  <span class="template-app-saved__collection-description">
                    {{ collection.description }}
                  </span>
                  <span class="template-app-saved__collection-count">
                    {{ collection.articles.length }}
                    {{ collection.articles.length === 1 ? 'article' : 'articles' }}
                  </span>
                </div>

                <div
                  class="template-app-saved__collage"
                  :class="{
                    'template-app-saved__collage--single': collection.articles.length < 4,
                  }"
                >
                  <div
                    v-for="(article, index) in collectionPreviewArticles(collection.articles)"
                    :key="index"
                    class="template-app-saved__collage-tile"
                    :class="{
                      'template-app-saved__collage-tile--placeholder': !article.thumbnailUrl,
                    }"
                  >
                    <img
                      v-if="article.thumbnailUrl"
                      class="template-app-saved__collage-img"
                      :src="article.thumbnailUrl"
                      alt=""
                    />
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </CdxTab>
      </CdxTabs>
    </div>
  </AppChromeWrapper>
</template>

<style scoped>
.template-app-saved {
  padding-block: var(--spacing-100, 16px);
}

.template-app-saved__search {
  margin-bottom: var(--spacing-100, 16px);
}

.template-app-saved__progress {
  margin-top: var(--spacing-100, 16px);
}

.template-app-saved__status {
  color: var(--color-subtle, #54595d);
}

.template-app-saved__list,
.template-app-saved__collections {
  list-style: none;
  margin: 0;
  padding: 0;
}

.template-app-saved__row,
.template-app-saved__collection-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-100, 16px);
  padding: var(--spacing-100, 16px) 0;
  border-bottom: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
}

.template-app-saved__row {
  width: 100%;
  border-inline: 0;
  border-top: 0;
  background: none;
  text-align: start;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.template-app-saved__row-text,
.template-app-saved__collection-text {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  flex-direction: column;
  gap: var(--spacing-25, 4px);
}

.template-app-saved__row-title,
.template-app-saved__collection-name {
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
}

.template-app-saved__row-description,
.template-app-saved__collection-description {
  overflow: hidden;
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 0.875rem);
  line-height: var(--line-height-small, 1.4);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.template-app-saved__collection-count {
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 0.875rem);
}

.template-app-saved__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-50, 8px);
  margin-top: var(--spacing-25, 4px);
}

.template-app-saved__row-thumb,
.template-app-saved__collage {
  flex-shrink: 0;
  width: 4rem;
  height: 4rem;
  border-radius: var(--border-radius-base, 2px);
  overflow: hidden;
}

.template-app-saved__row-thumb-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.template-app-saved__collage {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 2px;
}

.template-app-saved__collage--single {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
  gap: 0;
}

.template-app-saved__collage-tile {
  /* Without this, a grid item's minimum size defaults to its content's intrinsic
     size, so images with different natural dimensions blow out the "fr" tracks
     unevenly instead of every tile filling its cell equally. */
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.template-app-saved__collage-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.template-app-saved__row-thumb--placeholder,
.template-app-saved__collage-tile--placeholder {
  background-color: var(--background-color-neutral, #eaecf0);
  background-image:
    linear-gradient(45deg, var(--border-color-subtle, #c8ccd1) 25%, transparent 25%),
    linear-gradient(-45deg, var(--border-color-subtle, #c8ccd1) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--border-color-subtle, #c8ccd1) 75%),
    linear-gradient(-45deg, transparent 75%, var(--border-color-subtle, #c8ccd1) 75%);
  background-size: 12px 12px;
  background-position:
    0 0,
    0 6px,
    6px -6px,
    -6px 0;
}
</style>
