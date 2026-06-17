<script setup lang="ts">
import { ref } from 'vue'
import {
  CdxCard,
  CdxSearchResultTitle,
  CdxTab,
  CdxTable,
  CdxTabs,
  CdxTypeaheadSearch,
} from '@wikimedia/codex'
import { cdxIconBook } from '@wikimedia/codex-icons'

import { searchResults, tableColumns, tableRows, thumbnailUrl } from '../lib/fixtures'
import PlaygroundSection from '../playground/PlaygroundSection.vue'
import PlaygroundGrid from '../playground/PlaygroundGrid.vue'
import PlaygroundCell from '../playground/PlaygroundCell.vue'

const activeTab = ref('article')
const activeTabFramed = ref('article')
const tableSort = ref({ column: 'title', direction: 'asc' as const })
</script>

<template>
  <PlaygroundSection title="CdxCard">
    <PlaygroundGrid min="240px">
      <PlaygroundCell label="default">
        <CdxCard>
          <template #title>Title</template>
          <template #description>Description</template>
        </CdxCard>
      </PlaygroundCell>
      <PlaygroundCell label="url">
        <CdxCard url="#">
          <template #title>Title</template>
          <template #description>Description</template>
        </CdxCard>
      </PlaygroundCell>
      <PlaygroundCell label="icon">
        <CdxCard :icon="cdxIconBook">
          <template #title>Title</template>
        </CdxCard>
      </PlaygroundCell>
      <PlaygroundCell label="thumbnail">
        <CdxCard :thumbnail="{ url: thumbnailUrl, width: 40, height: 40 }">
          <template #title>Title</template>
        </CdxCard>
      </PlaygroundCell>
    </PlaygroundGrid>
  </PlaygroundSection>

  <PlaygroundSection title="CdxTable">
    <PlaygroundGrid min="100%">
      <PlaygroundCell label="default">
        <CdxTable
          caption="Table"
          :columns="tableColumns"
          :data="tableRows"
          v-model:sort="tableSort"
        />
      </PlaygroundCell>
      <PlaygroundCell label="paginate">
        <CdxTable
          caption="Table"
          :columns="tableColumns"
          :data="tableRows"
          paginate
          :pagination-size-default="2"
        />
      </PlaygroundCell>
      <PlaygroundCell label="vertical-borders">
        <CdxTable caption="Table" :columns="tableColumns" :data="tableRows" show-vertical-borders />
      </PlaygroundCell>
    </PlaygroundGrid>
  </PlaygroundSection>

  <PlaygroundSection title="CdxTabs / CdxTab">
    <PlaygroundGrid min="280px">
      <PlaygroundCell label="default">
        <CdxTabs v-model:active="activeTab">
          <CdxTab name="article" label="Article">
            <p>Article</p>
          </CdxTab>
          <CdxTab name="talk" label="Talk">
            <p>Talk</p>
          </CdxTab>
          <CdxTab name="history" label="History" disabled>
            <p>History</p>
          </CdxTab>
        </CdxTabs>
      </PlaygroundCell>
      <PlaygroundCell label="framed">
        <CdxTabs v-model:active="activeTabFramed" framed>
          <CdxTab name="article" label="Article">
            <p>Article</p>
          </CdxTab>
          <CdxTab name="talk" label="Talk">
            <p>Talk</p>
          </CdxTab>
        </CdxTabs>
      </PlaygroundCell>
    </PlaygroundGrid>
  </PlaygroundSection>

  <PlaygroundSection title="CdxSearchResultTitle">
    <PlaygroundGrid min="240px">
      <PlaygroundCell label="with query">
        <CdxSearchResultTitle title="Albert Einstein" search-query="Albert" />
      </PlaygroundCell>
      <PlaygroundCell label="no query">
        <CdxSearchResultTitle title="Albert Einstein" />
      </PlaygroundCell>
    </PlaygroundGrid>
  </PlaygroundSection>

  <PlaygroundSection title="CdxTypeaheadSearch">
    <PlaygroundGrid min="320px">
      <PlaygroundCell label="default">
        <CdxTypeaheadSearch
          id="playground-search"
          form-action="/"
          :search-results="searchResults"
        />
      </PlaygroundCell>
      <PlaygroundCell label="use-button">
        <CdxTypeaheadSearch
          id="playground-search-button"
          form-action="/"
          :search-results="searchResults"
          use-button
        />
      </PlaygroundCell>
    </PlaygroundGrid>
  </PlaygroundSection>
</template>

<style scoped></style>
