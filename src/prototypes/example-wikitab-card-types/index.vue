<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CdxField, CdxInfoChip, CdxTab, CdxTable, CdxTabs, CdxTextInput } from '@wikimedia/codex'

import PlainWrapper from '@/components/PlainWrapper.vue'

import '../wikitab/wikitab-surface.css'
import {
  catalogEntryById,
  schemaForCatalogId,
  WIKITAB_CARD_PRIMITIVE_CATALOG,
  type WikitabCardCatalogEntry,
  type WikitabCardPrimitiveEntry,
} from '../wikitab/data/wikitabCardTypeLinks'
import WikitabCacheStatusPanel from './WikitabCacheStatusPanel.vue'
import WikitabCardComponentPreview from './WikitabCardComponentPreview.vue'
import WikitabCardSeedInlinePreview from './WikitabCardSeedInlinePreview.vue'
import WikitabCardTypePreview from './WikitabCardTypePreview.vue'
import {
  formatSeedArticleDisplay,
  wikitabCardTypeSeedArticleRows,
  type WikitabCardTypeSeedArticleRow,
} from '../wikitab/data/wikitabCardTypeSeedArticle'

definePage({
  meta: {
    title: 'Wikitab card playground',
    platform: 'web',
    order: 90,
  },
})

type TabId = 'card' | 'primitives' | 'loading' | 'seed-articles' | 'caches'

const DEFAULT_TAB: TabId = 'primitives'
const VALID_TABS = new Set<TabId>(['card', 'primitives', 'loading', 'seed-articles', 'caches'])

interface LoadingCase {
  id: string
  label: string
  fields: Record<string, string>
}

const LOADING_CASES: LoadingCase[] = [
  { id: 'whole', label: 'Whole card', fields: { loading: 'true' } },
  { id: 'title', label: 'Title', fields: { loading: '{title: true}' } },
  { id: 'description', label: 'Description', fields: { loading: '{description: true}' } },
  { id: 'supporting', label: 'Supporting text', fields: { loading: '{supporting: true}' } },
  {
    id: 'supporting-end',
    label: 'Supporting end text',
    fields: { loading: '{supportingEnd: true}', supportingTextEnd: '2 hours ago' },
  },
  { id: 'thumbnail', label: 'Thumbnail', fields: { loading: '{thumbnail: true}' } },
  { id: 'chips', label: 'Chips', fields: { loading: '{chips: true}' } },
  {
    id: 'text',
    label: 'Title and description',
    fields: { loading: '{title: true, description: true}' },
  },
  {
    id: 'all-but-title',
    label: 'Everything but the title',
    fields: { loading: '{description: true, supporting: true, thumbnail: true}' },
  },
  {
    id: 'every-field',
    label: 'Every field (granular)',
    fields: {
      loading: '{title: true, description: true, supporting: true, thumbnail: true, chips: true}',
    },
  },
  {
    id: 'thumbnail-small',
    label: 'Thumbnail (40px)',
    fields: { loading: '{thumbnail: true}', thumbnailSize: '40' },
  },
  {
    id: 'thumbnail-end',
    label: 'Thumbnail (inline-end)',
    fields: { loading: '{thumbnail: true}', thumbnailLayout: 'inline-end' },
  },
  {
    id: 'thumbnail-block',
    label: 'Thumbnail (block-start)',
    fields: { loading: '{thumbnail: true}', thumbnailLayout: 'block-start' },
  },
  {
    id: 'optional-known',
    label: 'Optional thumbnail, URL known',
    fields: { loading: '{thumbnail: true}', thumbnailType: 'optional' },
  },
  {
    id: 'optional-unknown',
    label: 'Optional thumbnail, URL not known yet (whole card)',
    fields: { loading: '{thumbnail: true}', thumbnailType: 'optional', thumbnailUrl: '' },
  },
  {
    id: 'no-thumbnail',
    label: 'No thumbnail',
    fields: { loading: '{description: true}', thumbnailType: 'none' },
  },
  {
    id: 'custom-height',
    label: 'Whole card, custom height',
    fields: { loading: 'true', loadingHeight: '200' },
  },
]

const route = useRoute()
const router = useRouter()

function tabFromQuery(tab: unknown): TabId {
  if (typeof tab === 'string' && VALID_TABS.has(tab as TabId)) {
    return tab as TabId
  }
  return DEFAULT_TAB
}

const activeTab = ref<TabId>(tabFromQuery(route.query.tab))
const filterText = ref('')

function applyQueryToTab(): void {
  const fromQuery = tabFromQuery(route.query.tab)
  if (activeTab.value !== fromQuery) {
    activeTab.value = fromQuery
  }
}

function syncTabToQuery(mode: 'push' | 'replace' = 'push'): void {
  if (route.query.tab === activeTab.value) return

  const query = { ...route.query, tab: activeTab.value }
  const navigate = mode === 'replace' ? router.replace : router.push
  void navigate({ path: route.path, query })
}

onMounted(() => {
  applyQueryToTab()
  // Ensure every tab (including Primitives) is in the URL; replace so HMR /
  // first paint doesn't add a history entry.
  syncTabToQuery('replace')
})

watch(() => route.query.tab, applyQueryToTab)
watch(activeTab, () => {
  syncTabToQuery('push')
})

function matchesFilter(haystack: string): boolean {
  const q = filterText.value.trim().toLowerCase()
  if (!q) return true
  return haystack.toLowerCase().includes(q)
}

const filteredPrimitives = computed(() =>
  WIKITAB_CARD_PRIMITIVE_CATALOG.filter((primitive) =>
    matchesFilter([primitive.label, primitive.componentPath, primitive.id].join(' ')),
  ),
)

const filteredLoadingCases = computed(() =>
  LOADING_CASES.filter((loadingCase) =>
    matchesFilter([loadingCase.label, loadingCase.fields.loading].join(' ')),
  ),
)

const seedArticleRows = computed(() => wikitabCardTypeSeedArticleRows())

const seedMetaColumns = [
  { id: 'label', label: 'Property', width: '11.5rem' },
  { id: 'value', label: 'Value' },
]

function seedMetaTableData(row: WikitabCardTypeSeedArticleRow) {
  return [
    {
      id: `${row.catalogId}-examples`,
      label: 'Examples',
      kind: 'text' as const,
      text: row.productionContext,
    },
    {
      id: `${row.catalogId}-seed`,
      label: 'Seed article',
      kind: 'seed' as const,
      seedDisplay: row.seed ? formatSeedArticleDisplay(row.seed) : null,
    },
    {
      id: `${row.catalogId}-save-menu`,
      label: 'Save article menu',
      kind: 'flag' as const,
      flag: row.saveArticleMenu,
    },
  ]
}

const filteredSeedArticleRows = computed(() =>
  seedArticleRows.value.filter((row) =>
    matchesFilter(
      [row.label, row.catalogId, row.productionContext, formatSeedArticleDisplay(row.seed)].join(
        ' ',
      ),
    ),
  ),
)

function demoEntryForPrimitive(primitive: WikitabCardPrimitiveEntry): WikitabCardCatalogEntry | undefined {
  return catalogEntryById(primitive.demoCatalogId)
}

function primitiveAnchor(id: string): string {
  return `primitive-${id}`
}
</script>

<template>
  <PlainWrapper layout="wide">
    <div class="wikitab-card-types">
      <header class="wikitab-card-types__header">
        <h3 class="wikitab-card-types__title">Wikitab card playground</h3>
      </header>

      <div class="wikitab-card-types__toolbar">
        <CdxField class="wikitab-card-types__filter">
          <template #label>Filter</template>
          <CdxTextInput
            v-model="filterText"
            name="wikitab-card-types-filter"
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            :placeholder="
              activeTab === 'caches'
                ? 'Module, key, freshness…'
                : 'Type, primitive, component…'
            "
          />
        </CdxField>
      </div>

      <CdxTabs v-model:active="activeTab" class="wikitab-card-types__tabs">
        <CdxTab name="card" label="Card">
          <div class="wikitab-card-types__list">
            <article class="wikitab-card-types__entry">
              <h4 class="wikitab-card-types__entry-title">Card</h4>
              <WikitabCardComponentPreview />
            </article>
          </div>
        </CdxTab>

        <CdxTab name="primitives" label="Primitives">
          <div class="wikitab-card-types__list">
            <article
              v-for="primitive in filteredPrimitives"
              :key="primitive.id"
              class="wikitab-card-types__entry"
              :id="primitiveAnchor(primitive.id)"
            >
              <h4 class="wikitab-card-types__entry-title">{{ primitive.label }}</h4>

              <template
                v-if="
                  demoEntryForPrimitive(primitive) &&
                  schemaForCatalogId(primitive.demoCatalogId)?.schemas.length
                "
              >
                <WikitabCardTypePreview
                  v-for="(schema, schemaIndex) in schemaForCatalogId(primitive.demoCatalogId)!
                    .schemas"
                  :key="`${primitive.id}-${schema.typeName}-${schemaIndex}`"
                  class="wikitab-card-types__schema"
                  :entry="demoEntryForPrimitive(primitive)!"
                  :schema="schema"
                  :schema-index="schemaIndex"
                />
              </template>
            </article>
            <p v-if="!filteredPrimitives.length" class="wikitab-card-types__empty">No matches.</p>
          </div>
        </CdxTab>

        <CdxTab name="seed-articles" label="Seed articles">
          <div class="wikitab-card-types__list">
            <article
              v-for="row in filteredSeedArticleRows"
              :key="row.catalogId"
              class="wikitab-card-types__entry wikitab-card-types__seed-entry"
            >
              <h4 class="wikitab-card-types__entry-title">{{ row.label }}</h4>
              <WikitabCardSeedInlinePreview
                class="wikitab-card-types__seed-preview"
                :catalog-id="row.catalogId"
              />
              <CdxTable
                class="wikitab-card-types__seed-meta"
                caption="Seed article details"
                hide-caption
                :columns="seedMetaColumns"
                :data="seedMetaTableData(row)"
                :show-vertical-borders="false"
              >
                <template #item-value="{ row: meta }">
                  <template v-if="meta.kind === 'text'">{{ meta.text }}</template>
                  <template v-else-if="meta.kind === 'seed'">
                    <code v-if="meta.seedDisplay">{{ meta.seedDisplay }}</code>
                    <span v-else class="wikitab-card-types__seed-none">—</span>
                  </template>
                  <template v-else>
                    <CdxInfoChip
                      v-if="meta.flag"
                      status="success"
                      class="wikitab-card-types__seed-flag-chip"
                    >
                      Yes
                    </CdxInfoChip>
                    <CdxInfoChip
                      v-else
                      status="subtle"
                      class="wikitab-card-types__seed-flag-chip"
                    >
                      No
                    </CdxInfoChip>
                  </template>
                </template>
              </CdxTable>
            </article>
          </div>
          <p v-if="!filteredSeedArticleRows.length" class="wikitab-card-types__empty">
            No matches.
          </p>
        </CdxTab>

        <CdxTab name="loading" label="Loading">
          <div class="wikitab-card-types__list">
            <article
              v-for="loadingCase in filteredLoadingCases"
              :key="loadingCase.id"
              class="wikitab-card-types__entry"
              :id="`loading-${loadingCase.id}`"
            >
              <h4 class="wikitab-card-types__entry-title">{{ loadingCase.label }}</h4>
              <WikitabCardComponentPreview
                :initial-fields="loadingCase.fields"
                :default-open="false"
              />
            </article>
            <p v-if="!filteredLoadingCases.length" class="wikitab-card-types__empty">
              No matches.
            </p>
          </div>
        </CdxTab>

        <CdxTab name="caches" label="Caches">
          <WikitabCacheStatusPanel :filter-text="filterText" />
        </CdxTab>
      </CdxTabs>
    </div>
  </PlainWrapper>
</template>

<style scoped>
.wikitab-card-types {
  box-sizing: border-box;
  width: 100%;
}

.wikitab-card-types__header {
  margin-bottom: var(--spacing-150);
}

.wikitab-card-types__title {
  margin: 0 0 var(--spacing-50);
}

.wikitab-card-types__toolbar {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  margin-bottom: var(--spacing-150);
}

.wikitab-card-types__filter {
  max-width: 20rem;
}

.wikitab-card-types__tabs {
  margin-top: var(--spacing-50);
}

.wikitab-card-types__tabs :deep(.cdx-tabs__content) {
  overflow: visible;
}

.wikitab-card-types__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-200);
  padding-top: var(--spacing-150);
}

.wikitab-card-types__entry {
  padding-bottom: var(--spacing-150);
  border-bottom: var(--border-width-base) solid var(--border-color-subtle);
}

.wikitab-card-types__entry-title {
  margin: 0 0 var(--spacing-25);
}

.wikitab-card-types__schema + .wikitab-card-types__schema {
  margin-top: var(--spacing-150);
}

.wikitab-card-types__empty {
  margin: var(--spacing-150) 0;
  color: var(--color-subtle);
}

.wikitab-card-types__seed-entry {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-100);
}

.wikitab-card-types__seed-meta {
  width: 100%;
  max-width: 36rem;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
}

.wikitab-card-types__seed-meta :deep(thead) {
  display: none;
}

.wikitab-card-types__seed-meta :deep(th),
.wikitab-card-types__seed-meta :deep(td) {
  padding: var(--spacing-50) var(--spacing-75);
  vertical-align: middle;
}

.wikitab-card-types__seed-flag-chip {
  vertical-align: middle;
}

.wikitab-card-types__seed-none {
  color: var(--color-subtle);
}

</style>

<style>
/* CdxDialog teleports to body; match Wikitab search result menu styling. */
html:not([data-codex-patched]):has(.wikitab-card-types) .cdx-dialog {
  box-shadow: none;
}
</style>
