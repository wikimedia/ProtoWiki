<script setup lang="ts">
import {
  CdxButton,
  CdxCard,
  CdxField,
  CdxMessage,
  CdxProgressIndicator,
  CdxTextInput,
} from '@wikimedia/codex'
import { cdxIconArticle } from '@wikimedia/codex-icons'

import PlainWrapper from '@/components/PlainWrapper.vue'
import { useMorelikeSearch } from './useMorelikeSearch'

definePage({
  meta: {
    title: 'Morelike search',
    description:
      'Type anything; Wikipedia search picks seed articles, then browse Cirrus “more like this” results.',
  },
})

const {
  searchQuery,
  matchedPages,
  matchedPagesNotice,
  results,
  thumbnailsByTitle,
  loadingResolve,
  loading,
  loadingMore,
  error,
  hasSearched,
  resultsEmpty,
  canSubmit,
  canShowMore,
  loadingLabel,
  wikiArticleUrl,
  onSubmit,
  onShowMore,
} = useMorelikeSearch()

function resultThumbnail(
  title: string,
): { url: string; width: number; height: number } | undefined {
  const url = thumbnailsByTitle.value[title]
  return url ? { url, width: 70, height: 70 } : undefined
}
</script>

<template>
  <PlainWrapper heading="Morelike search">
    <section aria-label="Search input">
      <form class="morelike-search__form" @submit.prevent="onSubmit">
        <CdxField label="Search for anything">
          <template #description>
            Wikipedia full-text search picks seed article(s), then finds similar pages.
          </template>
          <CdxTextInput
            v-model="searchQuery"
            autocomplete="off"
            :disabled="loadingResolve || loading || loadingMore"
          />
        </CdxField>

        <CdxButton type="submit" action="progressive" :disabled="!canSubmit">
          {{ loadingResolve ? 'Finding pages…' : loading ? 'Finding similar pages…' : 'Search' }}
        </CdxButton>

        <CdxProgressIndicator
          v-if="loadingResolve || loading || loadingMore"
          :aria-label="loadingLabel"
        />
      </form>

      <CdxMessage v-if="error" type="error">
        {{ error }}
      </CdxMessage>
    </section>

    <section
      v-if="matchedPages.length"
      aria-labelledby="morelike-search-matched-heading"
      class="morelike-search__matched"
    >
      <h2 id="morelike-search-matched-heading">Matched pages</h2>
      <p v-if="matchedPagesNotice" class="morelike-search__matched-notice">
        {{ matchedPagesNotice }}
      </p>
      <div class="morelike-search__matched-feed">
        <CdxCard
          v-for="page in matchedPages"
          :key="page.pageid || page.title"
          :url="wikiArticleUrl(page.title)"
          :icon="cdxIconArticle"
        >
          <template #title>{{ page.title }}</template>
          <template v-if="page.snippet" #description>{{ page.snippet }}</template>
        </CdxCard>
      </div>
    </section>

    <section
      v-if="hasSearched"
      aria-labelledby="morelike-search-similar-heading"
      class="morelike-search__similar"
    >
      <h2 id="morelike-search-similar-heading">Similar pages</h2>

      <CdxMessage v-if="resultsEmpty" type="notice"> No similar pages were found. </CdxMessage>

      <div v-else class="morelike-search__feed">
        <CdxCard
          v-for="result in results"
          :key="result.pageid || result.title"
          :url="wikiArticleUrl(result.title)"
          :thumbnail="resultThumbnail(result.title)"
          :icon="resultThumbnail(result.title) ? undefined : cdxIconArticle"
          :force-thumbnail="true"
        >
          <template #title>{{ result.title }}</template>
          <template v-if="result.snippet" #description>{{ result.snippet }}</template>
        </CdxCard>
      </div>

      <div v-if="canShowMore || loadingMore" class="morelike-search__show-more">
        <CdxButton :disabled="loadingMore" @click="onShowMore">
          {{ loadingMore ? 'Loading more…' : 'Show more' }}
        </CdxButton>
        <CdxProgressIndicator v-if="loadingMore" aria-label="Loading more results" />
      </div>
    </section>
  </PlainWrapper>
</template>

<style scoped>
.morelike-search__form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
  margin-bottom: var(--spacing-100);
}

.morelike-search__matched,
.morelike-search__similar {
  margin-bottom: var(--spacing-150);
}

.morelike-search__matched-notice {
  margin: 0 0 var(--spacing-75);
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 0.875rem);
}

.morelike-search__matched-feed,
.morelike-search__feed {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
}

.morelike-search__show-more {
  margin-top: var(--spacing-100);
}
</style>
