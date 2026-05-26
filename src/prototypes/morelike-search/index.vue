<script setup lang="ts">
import {
  CdxButton,
  CdxCard,
  CdxField,
  CdxMessage,
  CdxProgressIndicator,
  CdxSelect,
  CdxTextInput,
} from '@wikimedia/codex'
import { cdxIconArticle } from '@wikimedia/codex-icons'

import PlainWrapper from '@/components/PlainWrapper.vue'
import { useMorelikeSearch } from './useMorelikeSearch'

definePage({
  meta: {
    title: 'Morelike search',
    description:
      'Enter seed pages or a user edit history, then browse Cirrus Search “more like this” results.',
  },
})

const {
  inputMode,
  inputModeOptions,
  seedPagesInput,
  username,
  resolvedSeeds,
  results,
  thumbnailsByTitle,
  loadingHistory,
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

function resultThumbnail(title: string): { url: string; width: number; height: number } | undefined {
  const url = thumbnailsByTitle.value[title]
  return url ? { url, width: 70, height: 70 } : undefined
}
</script>

<template>
  <PlainWrapper heading="Morelike search">
    <section aria-label="Search input">
      <form class="morelike-search__form" @submit.prevent="onSubmit">
        <CdxField label="Input source">
          <CdxSelect
            v-model:selected="inputMode"
            :menu-items="inputModeOptions"
            :disabled="loadingHistory || loading || loadingMore"
          />
        </CdxField>

        <CdxField v-if="inputMode === 'manual'" label="Seed pages">
          <template #description>Comma-separated article titles.</template>
          <CdxTextInput
            v-model="seedPagesInput"
            autocomplete="off"
            :disabled="loadingHistory || loading || loadingMore"
          />
        </CdxField>

        <CdxField v-else label="Wikipedia username">
          <template #description>
            Uses up to 20 most recently edited articles as seeds.
          </template>
          <CdxTextInput
            v-model="username"
            autocomplete="off"
            :disabled="loadingHistory || loading || loadingMore"
          />
        </CdxField>

        <CdxButton type="submit" action="progressive" :disabled="!canSubmit">
          {{
            loadingHistory ? 'Loading edit history…' : loading ? 'Searching…' : 'Search'
          }}
        </CdxButton>
        <CdxProgressIndicator
          v-if="loadingHistory || loading || loadingMore"
          :aria-label="loadingLabel"
        />
      </form>

      <CdxMessage v-if="error" type="error">
        {{ error }}
      </CdxMessage>
    </section>

    <section
      v-if="inputMode === 'userEdits' && resolvedSeeds.length"
      aria-labelledby="morelike-search-seeds-heading"
    >
      <h2 id="morelike-search-seeds-heading">Seed pages</h2>
      <p>Searching for pages like: {{ resolvedSeeds.join(', ') }}</p>
    </section>

    <section v-if="hasSearched" aria-label="Search results">
      <CdxMessage v-if="resultsEmpty" type="notice">
        No similar pages were found.
      </CdxMessage>

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
.morelike-search__feed {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
}

.morelike-search__form {
  margin-bottom: var(--spacing-100);
}

.morelike-search__show-more {
  margin-top: var(--spacing-100);
}
</style>
