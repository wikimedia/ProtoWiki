<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  CdxButton,
  CdxCard,
  CdxField,
  CdxMessage,
  CdxSelect,
  CdxTextArea,
  CdxToggleSwitch,
} from '@wikimedia/codex'

import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'

import {
  buildMorelikeApiRequestUrl,
  buildSrsearchPreview,
  fetchMorelikeResults,
  MorelikeFetchError,
  parseSeedTitles,
  sortMorelikeHits,
  type MorelikeSearchHit,
} from './fetchMorelike'
import {
  CIRRUS_MLT_EXTENSION_DEFAULTS,
  DEFAULT_MLT_CUSTOM,
  MLT_PRESET_LABELS,
  SORT_ORDER_LABELS,
  type MorelikeMltCustomSettings,
  type MorelikeMltPreset,
  type MorelikeSortOrder,
} from './morelikeMlt'
import {
  DEFAULT_MORELIKE_PLAYGROUND_STATE,
  loadMorelikePlaygroundState,
  persistMorelikePlaygroundState,
} from './morelikeStorage'
import EditAttributionLine from './EditAttributionLine.vue'
import { formatEditComment, parseEditComment } from './formatEditComment'

definePage({
  meta: {
    title: 'Morelike playground',
    description: 'Try CirrusSearch morelike with many seed pages.',
  },
})

const seedText = ref('')
const resultLimit = ref(20)
const sortOrder = ref<MorelikeSortOrder>('relevance')
const mltPreset = ref<MorelikeMltPreset>('default')
const mltCustom = ref<MorelikeMltCustomSettings>({
  ...DEFAULT_MORELIKE_PLAYGROUND_STATE.mltCustom,
})
const classicNoboostlinks = ref(DEFAULT_MORELIKE_PLAYGROUND_STATE.classicNoboostlinks)
const interleave = ref(DEFAULT_MORELIKE_PLAYGROUND_STATE.interleave)

const results = ref<MorelikeSearchHit[]>([])
const sortedResults = computed(() => sortMorelikeHits(results.value, sortOrder.value))
const isSearching = ref(false)
const errorMessage = ref('')
const hasSearched = ref(false)

let abortController: AbortController | null = null
let persistDebounce: ReturnType<typeof setTimeout> | null = null

const seedTitles = computed(() => parseSeedTitles(seedText.value))

const canSearch = computed(() => seedTitles.value.length > 0 && !isSearching.value)

const sortOrderMenuItems = computed(() =>
  (Object.keys(SORT_ORDER_LABELS) as MorelikeSortOrder[]).map((value) => ({
    value,
    label: SORT_ORDER_LABELS[value],
  })),
)

const mltPresetMenuItems = computed(() =>
  (Object.keys(MLT_PRESET_LABELS) as MorelikeMltPreset[]).map((value) => ({
    value,
    label: MLT_PRESET_LABELS[value],
  })),
)

const mltFieldsMenuItems = [
  { value: 'text', label: 'text (default)' },
  { value: 'title', label: 'title' },
  { value: 'opening_text', label: 'opening_text' },
]

const gsrsearch = computed(() => buildSrsearchPreview(seedText.value, interleave.value) ?? '')

const showMultipleRequestUrls = computed(
  () => interleave.value && seedTitles.value.length > 1,
)

const requestUrl = computed(
  () =>
    buildMorelikeApiRequestUrl(
      seedText.value,
      resultLimit.value,
      mltPreset.value,
      mltCustom.value,
      classicNoboostlinks.value,
      interleave.value,
    ) ?? '',
)

const showCustomMlt = computed(() => mltPreset.value === 'custom')

function formatRevisionCommentLine(hit: MorelikeSearchHit): string {
  if (!hit.revisionComment?.trim()) return ''
  return formatEditComment(hit.revisionComment)
}

function schedulePersist(immediate = false): void {
  if (persistDebounce) {
    clearTimeout(persistDebounce)
    persistDebounce = null
  }

  const persist = () => {
    persistMorelikePlaygroundState({
      seedText: seedText.value,
      resultLimit: resultLimit.value,
      sortOrder: sortOrder.value,
      mltPreset: mltPreset.value,
      mltCustom: mltCustom.value,
      classicNoboostlinks: classicNoboostlinks.value,
      interleave: interleave.value,
    })
  }

  if (immediate) {
    persist()
    return
  }

  persistDebounce = setTimeout(persist, 300)
}

async function onSearch(): Promise<void> {
  if (!canSearch.value) return

  abortController?.abort()
  abortController = new AbortController()

  isSearching.value = true
  errorMessage.value = ''
  hasSearched.value = true

  try {
    results.value = await fetchMorelikeResults(seedText.value, {
      limit: resultLimit.value,
      mltPreset: mltPreset.value,
      mltCustom: mltCustom.value,
      classicNoboostlinks: classicNoboostlinks.value,
      interleave: interleave.value,
      signal: abortController.signal,
    })

    console.log(
      '[morelike] revision fields',
      results.value.map((hit) => ({
        title: hit.title,
        author: hit.revisionAuthor,
        comment: hit.revisionComment,
        content: hit.revisionContent,
        timestamp: hit.timestamp,
      })),
    )
  } catch (error) {
    if (error instanceof MorelikeFetchError && error.code === 'aborted') {
      return
    }

    results.value = []
    errorMessage.value =
      error instanceof MorelikeFetchError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Search failed'
  } finally {
    isSearching.value = false
  }
}

onMounted(() => {
  const stored = loadMorelikePlaygroundState()
  seedText.value = stored.seedText
  resultLimit.value = stored.resultLimit
  sortOrder.value = stored.sortOrder
  mltPreset.value = stored.mltPreset
  mltCustom.value = { ...stored.mltCustom }
  classicNoboostlinks.value = stored.classicNoboostlinks
  interleave.value = stored.interleave
})

watch(seedText, () => schedulePersist(false))
watch(
  [resultLimit, sortOrder, mltPreset, mltCustom, classicNoboostlinks, interleave],
  () => schedulePersist(true),
  { deep: true },
)
</script>

<template>
  <ChromeWrapper :last-edited-notice="false">
    <SpecialPageWrapper title="Morelike playground">
      <section class="morelike-playground__controls">
        <CdxField>
          <template #label>Seed pages</template>
          <template #description>One Wikipedia article title per line (commas also work)</template>
          <CdxTextArea
            v-model="seedText"
            :rows="8"
            placeholder="Gorillaz&#10;Wet Leg"
          />
        </CdxField>

        <CdxField>
          <template #label>Result limit: {{ resultLimit }}</template>
          <template #description>Number of morelike results to return (1–100)</template>
          <input
            v-model.number="resultLimit"
            class="morelike-playground__range"
            type="range"
            min="1"
            max="100"
            step="1"
          />
        </CdxField>

        <CdxField>
          <template #label>Multiple requests</template>
          <template #description>
            One morelike query per seed, then round-robin merge (~N total, same as the limit
            slider). Off uses a single combined `morelike:A|B|…` query.
          </template>
          <CdxToggleSwitch v-model="interleave" />
        </CdxField>

        <CdxField>
          <template #label>MLT tuning</template>
          <template #description>
            “No overrides” sends no cirrusMlt* params (wiki default). Custom only sends params
            that differ from extension defaults.
          </template>
          <CdxSelect
            v-model:selected="mltPreset"
            :menu-items="mltPresetMenuItems"
            default-label="No overrides (wiki default)"
          />
        </CdxField>

        <div v-if="showCustomMlt" class="morelike-playground__custom-mlt">
          <CdxField>
            <template #label>Max query terms: {{ mltCustom.maxQueryTerms }}</template>
            <template #description>
              Terms extracted from seed articles to build the query (max 100). Extension
              default: {{ CIRRUS_MLT_EXTENSION_DEFAULTS.maxQueryTerms }} (omitted when unchanged).
            </template>
            <input
              v-model.number="mltCustom.maxQueryTerms"
              class="morelike-playground__range"
              type="range"
              min="1"
              max="100"
              step="1"
            />
          </CdxField>

          <CdxField>
            <template #label>Min term frequency: {{ mltCustom.minTermFreq }}</template>
            <template #description>
              How often a term must appear in seed text to be used. Extension default:
              {{ CIRRUS_MLT_EXTENSION_DEFAULTS.minTermFreq }}.
            </template>
            <input
              v-model.number="mltCustom.minTermFreq"
              class="morelike-playground__range"
              type="range"
              min="1"
              max="10"
              step="1"
            />
          </CdxField>

          <CdxField>
            <template #label>Min doc frequency: {{ mltCustom.minDocFreq }}</template>
            <template #description>
              Minimum shard document frequency for a term. Extension default:
              {{ CIRRUS_MLT_EXTENSION_DEFAULTS.minDocFreq }}.
            </template>
            <input
              v-model.number="mltCustom.minDocFreq"
              class="morelike-playground__range"
              type="range"
              min="1"
              max="10"
              step="1"
            />
          </CdxField>

          <CdxField>
            <template #label>Terms to match: {{ mltCustom.minimumShouldMatchPercent }}%</template>
            <template #description>
              Percentage of query terms a result must match. Extension default:
              {{ CIRRUS_MLT_EXTENSION_DEFAULTS.minimumShouldMatchPercent }}%.
            </template>
            <input
              v-model.number="mltCustom.minimumShouldMatchPercent"
              class="morelike-playground__range"
              type="range"
              min="1"
              max="100"
              step="1"
            />
          </CdxField>

          <CdxField>
            <template #label>Min word length: {{ mltCustom.minWordLength }}</template>
            <template #description>
              Minimum character length for a term. Extension default:
              {{ CIRRUS_MLT_EXTENSION_DEFAULTS.minWordLength }}.
            </template>
            <input
              v-model.number="mltCustom.minWordLength"
              class="morelike-playground__range"
              type="range"
              min="0"
              max="10"
              step="1"
            />
          </CdxField>

          <CdxField>
            <template #label>MLT fields</template>
            <template #description>
              Field(s) to extract terms from. Extension default: {{ CIRRUS_MLT_EXTENSION_DEFAULTS.fields }}
              (omitted when unchanged).
            </template>
            <CdxSelect
              v-model:selected="mltCustom.fields"
              :menu-items="mltFieldsMenuItems"
              default-label="text"
            />
          </CdxField>

          <CdxField>
            <template #label>Use fields only</template>
            <template #description>
              When on, only the selected field is used (not full article text extraction).
              Extension default: {{ CIRRUS_MLT_EXTENSION_DEFAULTS.useFieldsOnly ? 'on' : 'off' }}.
            </template>
            <CdxToggleSwitch v-model="mltCustom.useFieldsOnly">
              cirrusMltUseFields
            </CdxToggleSwitch>
          </CdxField>
        </div>

        <CdxField>
          <template #label>Disable link boosting</template>
          <template #description>
            When on, adds `gsrqiprofile=classic_noboostlinks` — ranks by text similarity without
            incoming-link rescore. When off, wiki default applies.
          </template>
          <CdxToggleSwitch v-model="classicNoboostlinks" />
        </CdxField>

        <CdxField>
          <template #label>Search query</template>
          <template #description>
            How seed pages are encoded for morelike — one combined query, or one per seed when
            multiple requests is on.
          </template>
          <CdxTextArea
            class="morelike-playground__wire-value"
            :model-value="gsrsearch"
            disabled
            :rows="interleave && seedTitles.length > 1 ? Math.min(seedTitles.length, 6) : 1"
          />
        </CdxField>

        <CdxField>
          <template #label>{{ showMultipleRequestUrls ? 'Request URLs' : 'Request URL' }}</template>
          <template #description>
            Exact GET on Search. Sort order is applied after the response, not in this URL.
          </template>
          <CdxTextArea
            class="morelike-playground__wire-value"
            :model-value="requestUrl"
            disabled
            :rows="showMultipleRequestUrls ? Math.min(seedTitles.length * 2, 12) : 4"
          />
        </CdxField>

        <div class="morelike-playground__actions">
          <CdxButton action="progressive" :disabled="!canSearch" @click="onSearch">
            {{ isSearching ? 'Searching…' : 'Search' }}
          </CdxButton>
          <p v-if="isSearching" class="morelike-playground__status">Fetching results…</p>
        </div>

        <CdxField>
          <template #label>Sort results by</template>
          <CdxSelect
            v-model:selected="sortOrder"
            :menu-items="sortOrderMenuItems"
            default-label="Most relevant"
          />
        </CdxField>
      </section>

      <section class="morelike-playground__results">
        <CdxMessage v-if="errorMessage" type="error" :allow-user-dismiss="false">
          {{ errorMessage }}
        </CdxMessage>

        <CdxMessage
          v-else-if="hasSearched && !isSearching && results.length === 0"
          type="warning"
          :allow-user-dismiss="false"
        >
          No results — try different seed pages or MLT tuning.
        </CdxMessage>

        <ul v-if="results.length" class="morelike-playground__list">
          <li v-for="hit in sortedResults" :key="hit.title" class="morelike-playground__list-item">
            <CdxCard
              :url="hit.pageUrl"
              :thumbnail="hit.thumbnail"
              force-thumbnail
              class="morelike-playground__card"
            >
              <template #title>{{ hit.title }}</template>
              <template
                v-if="hit.description || hit.timestamp || hit.revisionAuthor || formatRevisionCommentLine(hit)"
                #description
              >
                <span v-if="hit.description" class="morelike-playground__description">
                  {{ hit.description }}
                </span>
                <span
                  v-if="hit.timestamp || hit.revisionAuthor || formatRevisionCommentLine(hit)"
                  class="morelike-playground__edit-block"
                >
                  <span v-if="formatRevisionCommentLine(hit)" class="morelike-playground__edit-meta">
                    <template
                      v-for="(part, partIndex) in parseEditComment(hit.revisionComment ?? '')"
                      :key="partIndex"
                    >{{ part.value }}</template>
                  </span>
                  <EditAttributionLine :timestamp="hit.timestamp" :author="hit.revisionAuthor" />
                </span>
              </template>
            </CdxCard>
          </li>
        </ul>
      </section>
    </SpecialPageWrapper>
  </ChromeWrapper>
</template>

<style scoped>
.morelike-playground__controls {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  margin-bottom: var(--spacing-200);
}

.morelike-playground__custom-mlt {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  padding: var(--spacing-100);
  border: var(--border-width-base) solid var(--border-color-subtle);
  border-radius: var(--border-radius-base);
}

.morelike-playground__range {
  width: 100%;
  margin: 0;
  accent-color: var(--color-progressive);
}

.morelike-playground__wire-value :deep(textarea) {
  font-family: var(--font-family-monospace, monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  overflow-wrap: anywhere;
  word-break: break-all;
}

.morelike-playground__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-100);
}

.morelike-playground__status {
  margin: 0;
  font-size: var(--font-size-medium);
  color: var(--color-subtle);
}

.morelike-playground__results {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
}

.morelike-playground__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  max-width: 45rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.morelike-playground__list-item {
  min-width: 0;
}

.morelike-playground__card {
  width: 100%;
}

@media (hover: hover) and (pointer: fine) {
  .morelike-playground__card.cdx-card--is-link:hover {
    background-color: var(--background-color-interactive-subtle, #f8f9fa);
  }
}

.morelike-playground__card :deep(.morelike-playground__editor) {
  font-weight: var(--font-weight-bold);
  color: var(--color-base);
}

.morelike-playground__description {
  display: block;
  margin: 0;
}

.morelike-playground__edit-block {
  display: block;
  margin-top: var(--spacing-50);
}

.morelike-playground__card :deep(.morelike-playground__edit-meta) {
  display: block;
  margin: 0;
  font-size: var(--font-size-small);
  color: var(--color-subtle);
  line-height: var(--line-height-small);
}

</style>
