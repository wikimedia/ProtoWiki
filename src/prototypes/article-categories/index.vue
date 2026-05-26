<script setup lang="ts">
import {
  CdxButton,
  CdxCheckbox,
  CdxField,
  CdxMessage,
  CdxProgressIndicator,
  CdxTextInput,
} from '@wikimedia/codex'

import TopicArticleCard from '../topic-picker/TopicArticleCard.vue'
import { useArticleCategories } from './useArticleCategories'

definePage({
  meta: {
    title: 'Article categories',
    description:
      'Enter an article to see its Wikipedia categories, then browse other pages in those categories.',
  },
})

const {
  article,
  categories,
  selectedCategories,
  previewsByTitle,
  loadingCategories,
  loadingArticles,
  loadingMore,
  categoryError,
  articlesError,
  hasCategoryResults,
  hasLoadedArticles,
  rankedArticleTitles,
  articlesEmpty,
  canLoadCategories,
  canShowArticles,
  canShowMore,
  articleUrl,
  onLoadCategories,
  onShowArticles,
  onShowMore,
  selectAllCategories,
  clearCategories,
} = useArticleCategories()
</script>

<template>
  <main class="article-categories-page">
    <h1 class="mw-first-heading">Article categories</h1>

    <div class="article-categories">
      <section class="article-categories__section">
        <form class="article-categories__article-form" @submit.prevent="onLoadCategories">
          <CdxField label="Article">
            <CdxTextInput
              v-model="article"
              autocomplete="off"
              :disabled="loadingCategories || loadingArticles"
            />
          </CdxField>
          <div class="article-categories__actions">
            <CdxButton type="submit" action="progressive" :disabled="!canLoadCategories">
              {{ loadingCategories ? 'Loading categories…' : 'Load categories' }}
            </CdxButton>
            <CdxProgressIndicator
              v-if="loadingCategories"
              aria-label="Loading categories"
            />
          </div>
        </form>
        <CdxMessage v-if="categoryError" type="error">
          {{ categoryError }}
        </CdxMessage>
      </section>

      <section v-if="hasCategoryResults" class="article-categories__section">
        <CdxField>
          <template #label>Categories ({{ categories.length }})</template>
          <template #description>Pick the categories you want to explore.</template>
          <ul class="article-categories__checkbox-list">
            <li v-for="category in categories" :key="category">
              <CdxCheckbox v-model="selectedCategories" :input-value="category">
                {{ category }}
              </CdxCheckbox>
            </li>
          </ul>
        </CdxField>

        <div class="article-categories__actions">
          <CdxButton weight="quiet" :disabled="loadingArticles" @click="selectAllCategories">
            Select all
          </CdxButton>
          <CdxButton weight="quiet" :disabled="loadingArticles" @click="clearCategories">
            Clear
          </CdxButton>
          <CdxButton
            action="progressive"
            :disabled="!canShowArticles"
            @click="onShowArticles"
          >
            {{ loadingArticles ? 'Loading articles…' : 'Show articles' }}
          </CdxButton>
          <CdxProgressIndicator v-if="loadingArticles" aria-label="Loading articles" />
        </div>
        <CdxMessage v-if="articlesError" type="error">
          {{ articlesError }}
        </CdxMessage>
      </section>

      <section
        v-if="hasLoadedArticles"
        class="article-categories__section"
        aria-labelledby="article-categories-articles-heading"
      >
        <h2 id="article-categories-articles-heading">
          Other articles
          <span v-if="rankedArticleTitles.length"> ({{ rankedArticleTitles.length }})</span>
        </h2>

        <CdxMessage v-if="articlesEmpty" type="notice">
          No other articles were found in the selected categories.
        </CdxMessage>

        <ul v-else class="article-categories__card-list">
          <li v-for="title in rankedArticleTitles" :key="title">
            <TopicArticleCard
              :title="title"
              :href="articleUrl(title)"
              :thumbnail-src="previewsByTitle[title]?.thumbnailSrc"
              :short-description="previewsByTitle[title]?.shortDescription"
            />
          </li>
        </ul>

        <div v-if="canShowMore || loadingMore" class="article-categories__show-more">
          <CdxButton :disabled="loadingMore" @click="onShowMore">
            {{ loadingMore ? 'Loading more…' : 'Show more' }}
          </CdxButton>
          <CdxProgressIndicator v-if="loadingMore" aria-label="Loading more articles" />
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.article-categories-page {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: var(--spacing-250) var(--spacing-150);
  background-color: var(--background-color-base);
}

.article-categories {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-200, 32px);
}

.article-categories__section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
}

.article-categories__article-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
  max-width: 32rem;
}

.article-categories__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-75, 12px);
}

.article-categories__checkbox-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
}

.article-categories__card-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: var(--spacing-75, 12px);
  grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
}

.article-categories__show-more {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-75, 12px);
  padding-top: var(--spacing-100, 16px);
}
</style>
