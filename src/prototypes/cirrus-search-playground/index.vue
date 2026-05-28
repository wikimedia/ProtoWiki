<script setup lang="ts">
import {
  CdxAccordion,
  CdxButton,
  CdxCard,
  CdxCheckbox,
  CdxMessage,
  CdxProgressIndicator,
  CdxRadio,
  CdxSelect,
  CdxTextArea,
  CdxTextInput,
  CdxToggleSwitch,
} from '@wikimedia/codex'
import { cdxIconArticle } from '@wikimedia/codex-icons'
import { computed } from 'vue'

import PlainWrapper from '@/components/PlainWrapper.vue'

import {
  FIELD_DOCS,
  FILTER_DOCS,
  MLT_FIELD_DOCS,
  QUERY_MODE_DOCS,
  SR_INFO_DOCS,
  SRP_PROP_DOCS,
  filterDoc,
} from './fieldDocs'
import PlaygroundField from './PlaygroundField.vue'
import {
  createDateRow,
  createFileMeasureRow,
  createFilterRow,
  type CirrusMltField,
  type DateKeyword,
  type FilterKeyword,
  type FileMeasure,
  type GeoMode,
  type NamespaceDomain,
  type QueryMode,
  type SrInfo,
  type SrProp,
  type SrSort,
  type SrWhat,
} from './types'
import { useCirrusSearchPlayground } from './useCirrusSearchPlayground'

definePage({
  meta: {
    title: 'CirrusSearch playground',
    description: 'Structured form for every CirrusSearch keyword and Action API search parameter.',
  },
})

const {
  form,
  built,
  compatibility,
  results,
  totalHits,
  suggestion,
  rewrittenQuery,
  loading,
  loadingMore,
  error,
  hasSearched,
  resultsEmpty,
  canShowMore,
  wikiArticleUrl,
  runSearch,
  loadMore,
  copyToClipboard,
} = useCirrusSearchPlayground()

const queryModeOptions: { label: string; value: QueryMode; doc: string }[] = [
  { label: 'Normal', value: 'normal', doc: QUERY_MODE_DOCS.normal },
  { label: 'Morelike (greedy)', value: 'morelike', doc: QUERY_MODE_DOCS.morelike },
  { label: 'Morelikethis (composable)', value: 'morelikethis', doc: QUERY_MODE_DOCS.morelikethis },
]

const namespaceOptions: { label: string; value: NamespaceDomain }[] = [
  { label: 'Main (default)', value: 'main' },
  { label: 'File (file:)', value: 'file' },
  { label: 'Talk (talk:)', value: 'talk' },
  { label: 'All namespaces (all:)', value: 'all' },
  { label: 'Main only (:)', value: 'colon' },
]

const srwhatOptions: { label: string; value: SrWhat }[] = [
  { label: 'text', value: 'text' },
  { label: 'title', value: 'title' },
  { label: 'nearmatch', value: 'nearmatch' },
]

const srsortOptions: { label: string; value: SrSort }[] = [
  { label: 'Default (relevance)', value: '' },
  { label: 'relevance', value: 'relevance' },
  { label: 'last_edit_desc', value: 'last_edit_desc' },
  { label: 'last_edit_asc', value: 'last_edit_asc' },
  { label: 'create_timestamp_desc', value: 'create_timestamp_desc' },
  { label: 'create_timestamp_asc', value: 'create_timestamp_asc' },
  { label: 'just_match', value: 'just_match' },
  { label: 'random', value: 'random' },
  { label: 'incoming_links_desc', value: 'incoming_links_desc' },
  { label: 'incoming_links_asc', value: 'incoming_links_asc' },
  { label: 'title_natural_desc', value: 'title_natural_desc' },
  { label: 'title_natural_asc', value: 'title_natural_asc' },
  { label: 'user_random', value: 'user_random' },
  { label: 'none', value: 'none' },
]

const geoModeOptions: { label: string; value: GeoMode }[] = [
  { label: 'None', value: 'none' },
  { label: 'neartitle:', value: 'neartitle' },
  { label: 'nearcoord:', value: 'nearcoord' },
  { label: 'boost-neartitle:', value: 'boost-neartitle' },
  { label: 'boost-nearcoord:', value: 'boost-nearcoord' },
]

const filetypeOptions = [
  { label: '(none)', value: '' },
  { label: 'BITMAP', value: 'BITMAP' },
  { label: 'DRAWING', value: 'DRAWING' },
  { label: 'AUDIO', value: 'AUDIO' },
  { label: 'VIDEO', value: 'VIDEO' },
  { label: 'MULTIMEDIA', value: 'MULTIMEDIA' },
  { label: 'OFFICE', value: 'OFFICE' },
  { label: 'TEXT', value: 'TEXT' },
  { label: 'ARCHIVE', value: 'ARCHIVE' },
  { label: '3D', value: '3D' },
]

const filterKeywordOptions: { label: string; value: FilterKeyword }[] = [
  { label: 'intitle:', value: 'intitle' },
  { label: 'incategory:', value: 'incategory' },
  { label: 'deepcat:', value: 'deepcat' },
  { label: 'linksto:', value: 'linksto' },
  { label: 'hastemplate:', value: 'hastemplate' },
  { label: 'inlanguage:', value: 'inlanguage' },
  { label: 'contentmodel:', value: 'contentmodel' },
  { label: 'subpageof:', value: 'subpageof' },
  { label: 'pageid:', value: 'pageid' },
]

const mltFieldOptions: { label: string; value: CirrusMltField }[] = [
  { label: 'title', value: 'title' },
  { label: 'text', value: 'text' },
  { label: 'auxiliary_text', value: 'auxiliary_text' },
  { label: 'opening_text', value: 'opening_text' },
  { label: 'headings', value: 'headings' },
  { label: 'all', value: 'all' },
]

const srpropOptions: { label: string; value: SrProp }[] = [
  { label: 'snippet', value: 'snippet' },
  { label: 'timestamp', value: 'timestamp' },
  { label: 'size', value: 'size' },
  { label: 'wordcount', value: 'wordcount' },
  { label: 'titlesnippet', value: 'titlesnippet' },
]

const srinfoOptions: { label: string; value: SrInfo }[] = [
  { label: 'totalhits', value: 'totalhits' },
  { label: 'suggestion', value: 'suggestion' },
  { label: 'rewrittenquery', value: 'rewrittenquery' },
]

const showMltTuning = computed(
  () => form.value.queryMode === 'morelike' || form.value.queryMode === 'morelikethis',
)

function fieldDisabled(key: keyof typeof compatibility.value): boolean {
  return compatibility.value[key]?.disabled ?? false
}

function fieldReason(key: keyof typeof compatibility.value): string | undefined {
  return compatibility.value[key]?.reason
}

function addFilter(keyword: FilterKeyword): void {
  form.value.filterRows.push(createFilterRow(keyword))
}

function removeFilter(id: string): void {
  form.value.filterRows = form.value.filterRows.filter((row) => row.id !== id)
}

function addDate(keyword: DateKeyword): void {
  form.value.dateRows.push(createDateRow(keyword))
}

function removeDate(id: string): void {
  form.value.dateRows = form.value.dateRows.filter((row) => row.id !== id)
}

function addFileMeasure(measure: FileMeasure = 'filew'): void {
  form.value.fileMeasures.push(createFileMeasureRow(measure))
}

function removeFileMeasure(id: string): void {
  form.value.fileMeasures = form.value.fileMeasures.filter((row) => row.id !== id)
}

function toggleSrProp(prop: SrProp, checked: boolean): void {
  if (checked) {
    if (!form.value.srprop.includes(prop)) form.value.srprop.push(prop)
  } else {
    form.value.srprop = form.value.srprop.filter((item) => item !== prop)
  }
}

function toggleSrInfo(info: SrInfo, checked: boolean): void {
  if (checked) {
    if (!form.value.srinfo.includes(info)) form.value.srinfo.push(info)
  } else {
    form.value.srinfo = form.value.srinfo.filter((item) => item !== info)
  }
}

function toggleMltField(field: CirrusMltField, checked: boolean): void {
  if (checked) {
    if (!form.value.cirrusMlt.fields.includes(field)) form.value.cirrusMlt.fields.push(field)
  } else {
    form.value.cirrusMlt.fields = form.value.cirrusMlt.fields.filter((item) => item !== field)
  }
}

async function onSubmit(): Promise<void> {
  await runSearch()
}
</script>

<template>
  <PlainWrapper heading="CirrusSearch playground">
    <p class="cirrus-playground__intro">
      Compose
      <a href="https://www.mediawiki.org/wiki/Help:CirrusSearch" target="_blank" rel="noopener"
        >CirrusSearch</a
      >
      queries against Wikipedia. Each keyword has its own control; incompatible options grey out
      automatically.
    </p>

    <form class="cirrus-playground" @submit.prevent="onSubmit">
      <section class="cirrus-playground__preview" aria-label="Query preview">
        <div class="cirrus-playground__preview-row">
          <label class="cirrus-playground__preview-label" for="srsearch-preview">srsearch</label>
          <div class="cirrus-playground__preview-code-wrap">
            <code id="srsearch-preview" class="cirrus-playground__preview-code" title="Action API srsearch parameter">{{
              built.srsearch || '(empty)'
            }}</code>
          </div>
          <CdxButton type="button" @click="copyToClipboard(built.srsearch)">Copy</CdxButton>
        </div>
        <div class="cirrus-playground__preview-row">
          <span class="cirrus-playground__preview-label">API URL</span>
          <div class="cirrus-playground__preview-code-wrap">
            <code
              class="cirrus-playground__preview-code cirrus-playground__preview-code--url"
              title="Full list=search request URL"
            >{{ built.apiUrl }}</code>
          </div>
          <CdxButton type="button" @click="copyToClipboard(built.apiUrl)">Copy</CdxButton>
        </div>

        <CdxMessage
          v-for="(warning, index) in built.warnings"
          :key="index"
          type="notice"
          class="cirrus-playground__preview-warning"
        >
          {{ warning }}
        </CdxMessage>

        <div class="cirrus-playground__actions">
          <CdxButton type="submit" action="progressive" :disabled="loading">
            {{ loading ? 'Searching…' : 'Search' }}
          </CdxButton>
          <CdxProgressIndicator v-if="loading" aria-label="Searching" />
        </div>
      </section>

      <div class="cirrus-playground__sections">
        <CdxAccordion heading-level="h3">
          <template #title>Wiki &amp; query mode</template>
          <div class="cirrus-playground__section-body">
            <PlaygroundField label="Language code" :doc="FIELD_DOCS.lang">
              <CdxTextInput v-model="form.lang" placeholder="en" autocomplete="off" />
            </PlaygroundField>

            <fieldset class="cirrus-playground__fieldset">
              <legend>Query mode</legend>
              <p class="cirrus-playground__field-doc">{{ FIELD_DOCS.queryMode }}</p>
              <div
                v-for="option in queryModeOptions"
                :key="option.value"
                class="cirrus-playground__radio-row"
              >
                <CdxRadio
                  v-model="form.queryMode"
                  :input-value="option.value"
                  name="query-mode"
                >
                  {{ option.label }}
                </CdxRadio>
                <p class="cirrus-playground__field-doc">{{ option.doc }}</p>
              </div>
            </fieldset>

            <PlaygroundField
              v-if="form.queryMode !== 'normal'"
              :label="
                form.queryMode === 'morelike'
                  ? 'Seed page titles (pipe-separated)'
                  : 'Seed page title'
              "
              :doc="
                form.queryMode === 'morelike'
                  ? FIELD_DOCS.seedTitlesMorelike
                  : FIELD_DOCS.seedTitlesMorelikethis
              "
            >
              <CdxTextInput
                v-model="form.seedTitles"
                :placeholder="
                  form.queryMode === 'morelike' ? 'Albert Einstein|Isaac Newton' : 'Albert Einstein'
                "
                autocomplete="off"
              />
            </PlaygroundField>
          </div>
        </CdxAccordion>

        <CdxAccordion heading-level="h3">
          <template #title>Full text</template>
          <div
            class="cirrus-playground__section-body"
            :class="{ 'cirrus-playground__section-body--disabled': fieldDisabled('words') }"
          >
            <p v-if="fieldReason('words')" class="cirrus-playground__disabled-hint">
              {{ fieldReason('words') }}
            </p>
            <PlaygroundField label="Words" :doc="FIELD_DOCS.words">
              <CdxTextInput
                v-model="form.words"
                placeholder="climate change"
                autocomplete="off"
                :disabled="fieldDisabled('words')"
              />
            </PlaygroundField>
            <PlaygroundField label='Exact phrase ("…")' :doc="FIELD_DOCS.exactPhrase">
              <CdxTextInput
                v-model="form.exactPhrase"
                placeholder="fine line"
                autocomplete="off"
                :disabled="fieldDisabled('exactPhrase')"
              />
            </PlaygroundField>
            <PlaygroundField label="Exclude term (-)" :doc="FIELD_DOCS.excludeTerm">
              <CdxTextInput
                v-model="form.excludeTerm"
                autocomplete="off"
                :disabled="fieldDisabled('excludeTerm')"
              />
            </PlaygroundField>
            <PlaygroundField :doc="FIELD_DOCS.forceResults">
              <CdxToggleSwitch
                v-model="form.forceResults"
                :disabled="fieldDisabled('forceResults')"
              >
                Leading ~ (force search results)
              </CdxToggleSwitch>
            </PlaygroundField>
          </div>
        </CdxAccordion>

        <CdxAccordion heading-level="h3">
          <template #title>Namespace &amp; prefix</template>
          <div
            class="cirrus-playground__section-body"
            :class="{
              'cirrus-playground__section-body--disabled': fieldDisabled('namespaceDomain'),
            }"
          >
            <p v-if="fieldReason('namespaceDomain')" class="cirrus-playground__disabled-hint">
              {{ fieldReason('namespaceDomain') }}
            </p>
            <PlaygroundField label="Namespace domain" :doc="FIELD_DOCS.namespaceDomain">
              <CdxSelect
                v-model:selected="form.namespaceDomain"
                :menu-items="namespaceOptions"
                :disabled="fieldDisabled('namespaceDomain')"
              />
            </PlaygroundField>
            <PlaygroundField :doc="FIELD_DOCS.localOnly">
              <CdxToggleSwitch v-model="form.localOnly" :disabled="fieldDisabled('localOnly')">
                local: (File namespace only — exclude Commons)
              </CdxToggleSwitch>
            </PlaygroundField>
            <PlaygroundField label="prefix: (always last in query)" :doc="FIELD_DOCS.prefix">
              <CdxTextInput
                v-model="form.prefix"
                placeholder="Cow/ or Talk:cow/"
                autocomplete="off"
                :disabled="fieldDisabled('prefix')"
              />
            </PlaygroundField>
          </div>
        </CdxAccordion>

        <CdxAccordion heading-level="h3">
          <template #title>Filters</template>
          <div
            class="cirrus-playground__section-body"
            :class="{ 'cirrus-playground__section-body--disabled': fieldDisabled('filters') }"
          >
            <p v-if="fieldReason('filters')" class="cirrus-playground__disabled-hint">
              {{ fieldReason('filters') }}
            </p>

            <p class="cirrus-playground__field-doc">{{ FIELD_DOCS.filtersIntro }}</p>

            <div v-for="row in form.filterRows" :key="row.id" class="cirrus-playground__filter-block">
              <p class="cirrus-playground__field-doc">{{ filterDoc(row.keyword) }}</p>
              <div class="cirrus-playground__filter-row">
                <CdxSelect
                  v-model:selected="row.keyword"
                  :menu-items="filterKeywordOptions"
                  :disabled="fieldDisabled('filters')"
                />
                <PlaygroundField :doc="FIELD_DOCS.filterValue">
                  <CdxTextInput
                    v-model="row.value"
                    placeholder="value"
                    autocomplete="off"
                    :disabled="fieldDisabled('filters')"
                  />
                </PlaygroundField>
                <PlaygroundField :doc="FIELD_DOCS.filterNegate">
                  <CdxCheckbox v-model="row.negate" :disabled="fieldDisabled('filters')">
                    Negate (-)
                  </CdxCheckbox>
                </PlaygroundField>
                <CdxButton type="button" @click="removeFilter(row.id)">Remove</CdxButton>
              </div>
            </div>

            <div class="cirrus-playground__filter-add">
              <div
                v-for="opt in filterKeywordOptions"
                :key="opt.value"
                class="cirrus-playground__filter-add-item"
              >
                <CdxButton
                  type="button"
                  :disabled="fieldDisabled('filters')"
                  @click="addFilter(opt.value)"
                >
                  + {{ opt.label }}
                </CdxButton>
                <p class="cirrus-playground__field-doc">{{ FILTER_DOCS[opt.value] }}</p>
              </div>
            </div>
          </div>
        </CdxAccordion>

        <CdxAccordion heading-level="h3">
          <template #title>Insource</template>
          <div
            class="cirrus-playground__section-body"
            :class="{ 'cirrus-playground__section-body--disabled': fieldDisabled('insourceText') }"
          >
            <p v-if="fieldReason('insourceText')" class="cirrus-playground__disabled-hint">
              {{ fieldReason('insourceText') }}
            </p>
            <PlaygroundField label="insource: (plain)" :doc="FIELD_DOCS.insourceText">
              <CdxTextInput
                v-model="form.insourceText"
                autocomplete="off"
                :disabled="fieldDisabled('insourceText')"
              />
            </PlaygroundField>
            <PlaygroundField label="insource:/regex/" :doc="FIELD_DOCS.insourceRegex">
              <CdxTextInput
                v-model="form.insourceRegex"
                placeholder="pattern (without slashes)"
                autocomplete="off"
                :disabled="fieldDisabled('insourceRegex')"
              />
            </PlaygroundField>
            <PlaygroundField :doc="FIELD_DOCS.insourceRegexCaseInsensitive">
              <CdxToggleSwitch
                v-model="form.insourceRegexCaseInsensitive"
                :disabled="fieldDisabled('insourceRegex')"
              >
                Case insensitive (/i)
              </CdxToggleSwitch>
            </PlaygroundField>
          </div>
        </CdxAccordion>

        <CdxAccordion heading-level="h3">
          <template #title>Intitle regex</template>
          <div
            class="cirrus-playground__section-body"
            :class="{ 'cirrus-playground__section-body--disabled': fieldDisabled('intitleRegex') }"
          >
            <PlaygroundField label="intitle:/regex/" :doc="FIELD_DOCS.intitleRegex">
              <CdxTextInput
                v-model="form.intitleRegex"
                placeholder="pattern (without slashes)"
                autocomplete="off"
                :disabled="fieldDisabled('intitleRegex')"
              />
            </PlaygroundField>
            <PlaygroundField :doc="FIELD_DOCS.intitleRegexCaseInsensitive">
              <CdxToggleSwitch
                v-model="form.intitleRegexCaseInsensitive"
                :disabled="fieldDisabled('intitleRegex')"
              >
                Case insensitive (/i)
              </CdxToggleSwitch>
            </PlaygroundField>
          </div>
        </CdxAccordion>

        <CdxAccordion heading-level="h3">
          <template #title>Dates</template>
          <div
            class="cirrus-playground__section-body"
            :class="{ 'cirrus-playground__section-body--disabled': fieldDisabled('dateRows') }"
          >
            <p class="cirrus-playground__field-doc">{{ FIELD_DOCS.datesIntro }}</p>
            <div v-for="row in form.dateRows" :key="row.id" class="cirrus-playground__filter-block">
              <p class="cirrus-playground__field-doc">
                {{ row.keyword === 'creationdate' ? FIELD_DOCS.dateCreation : FIELD_DOCS.dateLastEdit }}
              </p>
              <div class="cirrus-playground__filter-row">
                <CdxSelect
                  v-model:selected="row.keyword"
                  :menu-items="[
                    { label: 'creationdate:', value: 'creationdate' },
                    { label: 'lasteditdate:', value: 'lasteditdate' },
                  ]"
                  :disabled="fieldDisabled('dateRows')"
                />
                <PlaygroundField :doc="FIELD_DOCS.dateOperator">
                  <CdxSelect
                    v-model:selected="row.operator"
                    :menu-items="[
                      { label: 'exact', value: 'exact' },
                      { label: '>', value: '>' },
                      { label: '>=', value: '>=' },
                      { label: '<', value: '<' },
                      { label: '<=', value: '<=' },
                    ]"
                    :disabled="fieldDisabled('dateRows')"
                  />
                </PlaygroundField>
                <PlaygroundField :doc="FIELD_DOCS.dateValue">
                  <CdxTextInput
                    v-model="row.value"
                    placeholder="2025 or now-1d"
                    autocomplete="off"
                    :disabled="fieldDisabled('dateRows')"
                  />
                </PlaygroundField>
                <CdxButton type="button" @click="removeDate(row.id)">Remove</CdxButton>
              </div>
            </div>
            <div class="cirrus-playground__filter-add">
              <div class="cirrus-playground__filter-add-item">
                <CdxButton
                  type="button"
                  :disabled="fieldDisabled('dateRows')"
                  @click="addDate('creationdate')"
                >
                  + creationdate:
                </CdxButton>
                <p class="cirrus-playground__field-doc">{{ FIELD_DOCS.dateCreation }}</p>
              </div>
              <div class="cirrus-playground__filter-add-item">
                <CdxButton
                  type="button"
                  :disabled="fieldDisabled('dateRows')"
                  @click="addDate('lasteditdate')"
                >
                  + lasteditdate:
                </CdxButton>
                <p class="cirrus-playground__field-doc">{{ FIELD_DOCS.dateLastEdit }}</p>
              </div>
            </div>
          </div>
        </CdxAccordion>

        <CdxAccordion heading-level="h3">
          <template #title>Topics &amp; ML</template>
          <div
            class="cirrus-playground__section-body"
            :class="{ 'cirrus-playground__section-body--disabled': fieldDisabled('articletopic') }"
          >
            <PlaygroundField label="articletopic:" :doc="FIELD_DOCS.articletopic">
              <CdxTextInput
                v-model="form.articletopic"
                placeholder="books|films or books^2.0"
                autocomplete="off"
                :disabled="fieldDisabled('articletopic')"
              />
            </PlaygroundField>
            <PlaygroundField label="articlecountry:" :doc="FIELD_DOCS.articlecountry">
              <CdxTextInput
                v-model="form.articlecountry"
                placeholder="bel|fra"
                autocomplete="off"
                :disabled="fieldDisabled('articlecountry')"
              />
            </PlaygroundField>
            <PlaygroundField label="hasrecommendation:" :doc="FIELD_DOCS.hasrecommendation">
              <CdxTextInput
                v-model="form.hasrecommendation"
                placeholder="image or tone^1.0>0.5"
                autocomplete="off"
                :disabled="fieldDisabled('hasrecommendation')"
              />
            </PlaygroundField>
          </div>
        </CdxAccordion>

        <CdxAccordion heading-level="h3">
          <template #title>Page weighting</template>
          <div
            class="cirrus-playground__section-body"
            :class="{ 'cirrus-playground__section-body--disabled': fieldDisabled('preferRecent') }"
          >
            <p v-if="fieldReason('preferRecent')" class="cirrus-playground__disabled-hint">
              {{ fieldReason('preferRecent') }}
            </p>
            <PlaygroundField label="prefer-recent: (boost,half-life days)" :doc="FIELD_DOCS.preferRecent">
              <CdxTextInput
                v-model="form.preferRecent"
                placeholder="0.6,160 or ,7"
                autocomplete="off"
                :disabled="fieldDisabled('preferRecent')"
              />
            </PlaygroundField>
            <PlaygroundField label='boost-templates: ("Template:Name|150% …")' :doc="FIELD_DOCS.boostTemplates">
              <CdxTextArea
                v-model="form.boostTemplates"
                :disabled="fieldDisabled('boostTemplates')"
              />
            </PlaygroundField>
          </div>
        </CdxAccordion>

        <CdxAccordion heading-level="h3">
          <template #title>Geo search</template>
          <div
            class="cirrus-playground__section-body"
            :class="{ 'cirrus-playground__section-body--disabled': fieldDisabled('geo') }"
          >
            <p v-if="fieldReason('geo')" class="cirrus-playground__disabled-hint">
              {{ fieldReason('geo') }}
            </p>
            <PlaygroundField label="Mode" :doc="FIELD_DOCS.geoMode">
              <CdxSelect
                v-model:selected="form.geoMode"
                :menu-items="geoModeOptions"
                :disabled="fieldDisabled('geo')"
              />
            </PlaygroundField>
            <PlaygroundField label="Distance (optional, e.g. 100km)" :doc="FIELD_DOCS.geoDistance">
              <CdxTextInput
                v-model="form.geoDistance"
                autocomplete="off"
                :disabled="fieldDisabled('geo') || form.geoMode === 'none'"
              />
            </PlaygroundField>
            <PlaygroundField
              v-if="form.geoMode === 'neartitle' || form.geoMode === 'boost-neartitle'"
              label="Page title"
              :doc="FIELD_DOCS.geoTitle"
            >
              <CdxTextInput
                v-model="form.geoTitle"
                placeholder="San Francisco"
                autocomplete="off"
                :disabled="fieldDisabled('geo')"
              />
            </PlaygroundField>
            <template v-if="form.geoMode === 'nearcoord' || form.geoMode === 'boost-nearcoord'">
              <PlaygroundField label="Latitude" :doc="FIELD_DOCS.geoLat">
                <CdxTextInput
                  v-model="form.geoLat"
                  placeholder="37.776"
                  autocomplete="off"
                  :disabled="fieldDisabled('geo')"
                />
              </PlaygroundField>
              <PlaygroundField label="Longitude" :doc="FIELD_DOCS.geoLon">
                <CdxTextInput
                  v-model="form.geoLon"
                  placeholder="-122.39"
                  autocomplete="off"
                  :disabled="fieldDisabled('geo')"
                />
              </PlaygroundField>
            </template>
          </div>
        </CdxAccordion>

        <CdxAccordion heading-level="h3">
          <template #title>File properties</template>
          <div
            class="cirrus-playground__section-body"
            :class="{
              'cirrus-playground__section-body--disabled': fieldDisabled('fileProperties'),
            }"
          >
            <PlaygroundField label="filetype:" :doc="FIELD_DOCS.filetype">
              <CdxSelect
                v-model:selected="form.filetype"
                :menu-items="filetypeOptions"
                :disabled="fieldDisabled('fileProperties')"
              />
            </PlaygroundField>
            <PlaygroundField label="filemime:" :doc="FIELD_DOCS.filemime">
              <CdxTextInput
                v-model="form.filemime"
                placeholder="image/png or pdf"
                autocomplete="off"
                :disabled="fieldDisabled('fileProperties')"
              />
            </PlaygroundField>
            <PlaygroundField label="filesize: (KB)" :doc="FIELD_DOCS.filesize">
              <CdxTextInput
                v-model="form.filesize"
                placeholder=">20 or 100,500"
                autocomplete="off"
                :disabled="fieldDisabled('fileProperties')"
              />
            </PlaygroundField>

            <p class="cirrus-playground__field-doc">{{ FIELD_DOCS.fileMeasuresIntro }}</p>
            <div
              v-for="row in form.fileMeasures"
              :key="row.id"
              class="cirrus-playground__filter-block"
            >
              <div class="cirrus-playground__filter-row">
                <CdxSelect
                  v-model:selected="row.measure"
                  :menu-items="[
                    { label: 'filew', value: 'filew' },
                    { label: 'fileh', value: 'fileh' },
                    { label: 'fileres', value: 'fileres' },
                    { label: 'filebits', value: 'filebits' },
                  ]"
                  :disabled="fieldDisabled('fileProperties')"
                />
                <CdxSelect
                  v-model:selected="row.operator"
                  :menu-items="[
                    { label: '=', value: 'exact' },
                    { label: '>', value: '>' },
                    { label: '<', value: '<' },
                    { label: 'range', value: 'range' },
                  ]"
                  :disabled="fieldDisabled('fileProperties')"
                />
                <PlaygroundField :doc="FIELD_DOCS.fileMeasureValue">
                  <CdxTextInput
                    v-model="row.value"
                    autocomplete="off"
                    :disabled="fieldDisabled('fileProperties')"
                  />
                </PlaygroundField>
                <PlaygroundField v-if="row.operator === 'range'" :doc="FIELD_DOCS.fileMeasureEnd">
                  <CdxTextInput
                    v-model="row.valueEnd"
                    placeholder="max"
                    autocomplete="off"
                    :disabled="fieldDisabled('fileProperties')"
                  />
                </PlaygroundField>
                <CdxButton type="button" @click="removeFileMeasure(row.id)">Remove</CdxButton>
              </div>
            </div>
            <CdxButton
              type="button"
              :disabled="fieldDisabled('fileProperties')"
              @click="addFileMeasure()"
            >
              + file measure
            </CdxButton>
          </div>
        </CdxAccordion>

        <CdxAccordion heading-level="h3">
          <template #title>Wikibase (wiki-specific)</template>
          <div
            class="cirrus-playground__section-body"
            :class="{ 'cirrus-playground__section-body--disabled': fieldDisabled('wikibaseRaw') }"
          >
            <PlaygroundField label="Wikibase keywords" :doc="FIELD_DOCS.wikibaseRaw">
              <CdxTextInput
                v-model="form.wikibaseRaw"
                autocomplete="off"
                :disabled="fieldDisabled('wikibaseRaw')"
              />
            </PlaygroundField>
          </div>
        </CdxAccordion>

        <CdxAccordion heading-level="h3">
          <template #title>API options</template>
          <div class="cirrus-playground__section-body">
            <PlaygroundField label="srwhat" :doc="FIELD_DOCS.srwhat">
              <CdxSelect v-model:selected="form.srwhat" :menu-items="srwhatOptions" />
            </PlaygroundField>
            <PlaygroundField label="srnamespace (pipe-separated IDs, e.g. 0|6)" :doc="FIELD_DOCS.srnamespace">
              <CdxTextInput v-model="form.srnamespace" placeholder="0" autocomplete="off" />
            </PlaygroundField>
            <PlaygroundField label="srlimit" :doc="FIELD_DOCS.srlimit">
              <CdxTextInput v-model.number="form.srlimit" input-type="number" />
            </PlaygroundField>
            <PlaygroundField label="sroffset" :doc="FIELD_DOCS.sroffset">
              <CdxTextInput v-model.number="form.sroffset" input-type="number" />
            </PlaygroundField>
            <PlaygroundField label="srsort" :doc="FIELD_DOCS.srsort">
              <CdxSelect v-model:selected="form.srsort" :menu-items="srsortOptions" />
            </PlaygroundField>
            <PlaygroundField label="srqiprofile" :doc="FIELD_DOCS.srqiprofile">
              <CdxTextInput
                v-model="form.srqiprofile"
                placeholder="popular_inclinks_pv"
                autocomplete="off"
              />
            </PlaygroundField>
            <fieldset class="cirrus-playground__fieldset">
              <legend>srprop</legend>
              <p class="cirrus-playground__field-doc">{{ FIELD_DOCS.srpropIntro }}</p>
              <div v-for="opt in srpropOptions" :key="opt.value" class="cirrus-playground__checkbox-row">
                <CdxCheckbox
                  :model-value="form.srprop.includes(opt.value)"
                  @update:model-value="toggleSrProp(opt.value, $event)"
                >
                  {{ opt.label }}
                </CdxCheckbox>
                <p class="cirrus-playground__field-doc">{{ SRP_PROP_DOCS[opt.value] }}</p>
              </div>
            </fieldset>
            <fieldset class="cirrus-playground__fieldset">
              <legend>srinfo</legend>
              <p class="cirrus-playground__field-doc">{{ FIELD_DOCS.srinfoIntro }}</p>
              <div v-for="opt in srinfoOptions" :key="opt.value" class="cirrus-playground__checkbox-row">
                <CdxCheckbox
                  :model-value="form.srinfo.includes(opt.value)"
                  @update:model-value="toggleSrInfo(opt.value, $event)"
                >
                  {{ opt.label }}
                </CdxCheckbox>
                <p class="cirrus-playground__field-doc">{{ SR_INFO_DOCS[opt.value] }}</p>
              </div>
            </fieldset>
          </div>
        </CdxAccordion>

        <CdxAccordion v-if="showMltTuning" heading-level="h3">
          <template #title>Morelike tuning (cirrusMlt*)</template>
          <div
            class="cirrus-playground__section-body"
            :class="{ 'cirrus-playground__section-body--disabled': fieldDisabled('cirrusMlt') }"
          >
            <PlaygroundField label="cirrusMltMinDocFreq" :doc="FIELD_DOCS.cirrusMltMinDocFreq">
              <CdxTextInput v-model="form.cirrusMlt.minDocFreq" autocomplete="off" />
            </PlaygroundField>
            <PlaygroundField label="cirrusMltMaxDocFreq" :doc="FIELD_DOCS.cirrusMltMaxDocFreq">
              <CdxTextInput v-model="form.cirrusMlt.maxDocFreq" autocomplete="off" />
            </PlaygroundField>
            <PlaygroundField label="cirrusMltMaxQueryTerms" :doc="FIELD_DOCS.cirrusMltMaxQueryTerms">
              <CdxTextInput v-model="form.cirrusMlt.maxQueryTerms" autocomplete="off" />
            </PlaygroundField>
            <PlaygroundField label="cirrusMltMinTermFreq" :doc="FIELD_DOCS.cirrusMltMinTermFreq">
              <CdxTextInput v-model="form.cirrusMlt.minTermFreq" autocomplete="off" />
            </PlaygroundField>
            <PlaygroundField label="cirrusMltMinWordLength" :doc="FIELD_DOCS.cirrusMltMinWordLength">
              <CdxTextInput v-model="form.cirrusMlt.minWordLength" autocomplete="off" />
            </PlaygroundField>
            <PlaygroundField label="cirrusMltMaxWordLength" :doc="FIELD_DOCS.cirrusMltMaxWordLength">
              <CdxTextInput v-model="form.cirrusMlt.maxWordLength" autocomplete="off" />
            </PlaygroundField>
            <PlaygroundField label="cirrusMltPercentTermsToMatch" :doc="FIELD_DOCS.cirrusMltPercentTermsToMatch">
              <CdxTextInput v-model="form.cirrusMlt.percentTermsToMatch" autocomplete="off" />
            </PlaygroundField>
            <PlaygroundField :doc="FIELD_DOCS.cirrusMltUseFields">
              <CdxToggleSwitch v-model="form.cirrusMlt.useFields">
                cirrusMltUseFields
              </CdxToggleSwitch>
            </PlaygroundField>
            <fieldset class="cirrus-playground__fieldset">
              <legend>cirrusMltFields</legend>
              <p class="cirrus-playground__field-doc">{{ FIELD_DOCS.cirrusMltFieldsIntro }}</p>
              <div v-for="opt in mltFieldOptions" :key="opt.value" class="cirrus-playground__checkbox-row">
                <CdxCheckbox
                  :model-value="form.cirrusMlt.fields.includes(opt.value)"
                  @update:model-value="toggleMltField(opt.value, $event)"
                >
                  {{ opt.label }}
                </CdxCheckbox>
                <p class="cirrus-playground__field-doc">{{ MLT_FIELD_DOCS[opt.value] }}</p>
              </div>
            </fieldset>
          </div>
        </CdxAccordion>
      </div>
    </form>

    <CdxMessage v-if="error" type="error">
      {{ error }}
    </CdxMessage>

    <section v-if="hasSearched" aria-label="Search results" class="cirrus-playground__results">
      <h2 class="cirrus-playground__results-heading">Results</h2>

      <p v-if="totalHits != null" class="cirrus-playground__meta">
        About {{ totalHits.toLocaleString() }} results
      </p>
      <p v-if="suggestion" class="cirrus-playground__meta">Did you mean: {{ suggestion }}</p>
      <p v-if="rewrittenQuery" class="cirrus-playground__meta">
        Showing results for: {{ rewrittenQuery }}
      </p>

      <CdxMessage v-if="resultsEmpty" type="notice">No pages matched this query.</CdxMessage>

      <div v-else class="cirrus-playground__feed">
        <CdxCard
          v-for="result in results"
          :key="result.pageid || result.title"
          :url="wikiArticleUrl(result.title)"
          :icon="cdxIconArticle"
        >
          <template #title>{{ result.title }}</template>
          <template v-if="result.snippet" #description>{{ result.snippet }}</template>
        </CdxCard>
      </div>

      <div v-if="canShowMore || loadingMore" class="cirrus-playground__show-more">
        <CdxButton :disabled="loadingMore" @click="loadMore">
          {{ loadingMore ? 'Loading more…' : 'Show more' }}
        </CdxButton>
        <CdxProgressIndicator v-if="loadingMore" aria-label="Loading more results" />
      </div>
    </section>
  </PlainWrapper>
</template>

<style scoped>
.cirrus-playground__intro {
  margin: 0 0 var(--spacing-100);
  color: var(--color-subtle, #54595d);
}

.cirrus-playground__preview {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--background-color-base, #fff);
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
  padding: var(--spacing-50) var(--spacing-75);
  margin-bottom: var(--spacing-75);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}

.cirrus-playground__preview-row {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr) auto;
  align-items: start;
  gap: var(--spacing-50);
}

.cirrus-playground__preview-label {
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
  line-height: 1.5;
  padding-top: var(--spacing-25);
}

.cirrus-playground__preview-code-wrap {
  min-width: 0;
  overflow-x: auto;
  background: var(--background-color-neutral-subtle, #f8f9fa);
  padding: var(--spacing-25) var(--spacing-50);
  border-radius: var(--border-radius-base, 2px);
}

.cirrus-playground__preview-code {
  display: inline-block;
  white-space: nowrap;
  font-size: var(--font-size-small, 0.875rem);
  line-height: 1.5;
}

.cirrus-playground__preview-code--url {
  font-size: 0.75rem;
}

.cirrus-playground__preview-warning {
  margin: 0;
}

.cirrus-playground__actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-50);
}

.cirrus-playground__sections {
  display: flex;
  flex-direction: column;
  /* gap: var(--spacing-50); */
}

.cirrus-playground__section-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
  padding: var(--spacing-50) 0;
}

.cirrus-playground__section-body--disabled {
  opacity: 0.55;
}

.cirrus-playground__disabled-hint {
  margin: 0;
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
}

.cirrus-playground__fieldset {
  border: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}

.cirrus-playground__filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-50);
}

.cirrus-playground__field-doc {
  margin: 0;
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
  line-height: 1.4;
}

.cirrus-playground__radio-row {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
}

.cirrus-playground__filter-block {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
  padding-bottom: var(--spacing-50);
  border-bottom: 1px solid var(--border-color-subtle, #c8ccd1);
}

.cirrus-playground__filter-add-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
  max-width: 16rem;
}

.cirrus-playground__checkbox-row {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
}

.cirrus-playground__filter-add {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-100);
}

.cirrus-playground__hint {
  margin: 0;
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
}

.cirrus-playground__results {
  margin-top: var(--spacing-150);
}

.cirrus-playground__results-heading {
  margin: 0 0 var(--spacing-75);
  font-size: var(--font-size-medium, 1rem);
}

.cirrus-playground__meta {
  margin: 0 0 var(--spacing-50);
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
}

.cirrus-playground__feed {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
}

.cirrus-playground__show-more {
  margin-top: var(--spacing-100);
  display: flex;
  align-items: center;
  gap: var(--spacing-75);
}
</style>
