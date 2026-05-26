<script setup lang="ts">
import {
  CdxButton,
  CdxCheckbox,
  CdxField,
  CdxMessage,
  CdxProgressIndicator,
  CdxTextInput,
} from '@wikimedia/codex'

import TopicArticleCard from './TopicArticleCard.vue'
import { useTopicPicker } from './useTopicPicker'

definePage({
  meta: {
    title: 'Topic picker',
    description:
      'Type a topic, pick subtopics from Microtask Generator, browse related articles.',
  },
})

const {
  topic,
  categorySuggestions,
  selectedCategories,
  previewsByTitle,
  loadingCategories,
  loadingArticles,
  loadingMore,
  categoryError,
  articlesError,
  hasCategoryResults,
  hasLoadedArticles,
  mixedArticleTitles,
  articlesEmpty,
  canFindSubtopics,
  canShowArticles,
  canShowMore,
  articleUrl,
  onFindSubtopics,
  onShowArticles,
  onShowMore,
  selectAllCategories,
  clearCategories,
} = useTopicPicker()
</script>

<template>
  <main class="topic-picker-page">
    <h1 class="mw-first-heading">Topic picker</h1>

    <div class="topic-picker">
      <section class="topic-picker__section">
        <form class="topic-picker__topic-form" @submit.prevent="onFindSubtopics">
          <CdxField label="Topic">
            <CdxTextInput
              v-model="topic"
              autocomplete="off"
              :disabled="loadingCategories || loadingArticles"
            />
          </CdxField>
          <div class="topic-picker__actions">
            <CdxButton type="submit" action="progressive" :disabled="!canFindSubtopics">
              {{ loadingCategories ? 'Finding subtopics…' : 'Find subtopics' }}
            </CdxButton>
            <CdxProgressIndicator
              v-if="loadingCategories"
              aria-label="Loading subtopic suggestions"
            />
          </div>
        </form>
        <CdxMessage v-if="categoryError" type="error">
          {{ categoryError }}
        </CdxMessage>
      </section>

      <section v-if="hasCategoryResults" class="topic-picker__section">
        <CdxField>
          <template #label>Subtopics ({{ categorySuggestions.length }})</template>
          <template #description>Pick the subtopics you want.</template>
          <ul class="topic-picker__checkbox-list">
            <li v-for="category in categorySuggestions" :key="category">
              <CdxCheckbox v-model="selectedCategories" :input-value="category">
                {{ category }}
              </CdxCheckbox>
            </li>
          </ul>
        </CdxField>

        <div class="topic-picker__actions">
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
        class="topic-picker__section"
        aria-labelledby="topic-picker-articles-heading"
      >
        <h2 id="topic-picker-articles-heading">
          Articles
          <span v-if="mixedArticleTitles.length"> ({{ mixedArticleTitles.length }})</span>
        </h2>

        <CdxMessage v-if="articlesEmpty" type="notice">
          No articles were found for the selected subtopics.
        </CdxMessage>

        <ul v-else class="topic-picker__card-list">
          <li v-for="title in mixedArticleTitles" :key="title">
            <TopicArticleCard
              :title="title"
              :href="articleUrl(title)"
              :thumbnail-src="previewsByTitle[title]?.thumbnailSrc"
              :short-description="previewsByTitle[title]?.shortDescription"
            />
          </li>
        </ul>

        <div v-if="canShowMore || loadingMore" class="topic-picker__show-more">
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
.topic-picker-page {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: var(--spacing-250) var(--spacing-150);
  background-color: var(--background-color-base);
}

.topic-picker {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-200, 32px);
}

.topic-picker__section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
}

.topic-picker__topic-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
  max-width: 32rem;
}

.topic-picker__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-75, 12px);
}

.topic-picker__checkbox-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
}

.topic-picker__card-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: var(--spacing-75, 12px);
  grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
}

.topic-picker__show-more {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-75, 12px);
  padding-top: var(--spacing-100, 16px);
}
</style>
