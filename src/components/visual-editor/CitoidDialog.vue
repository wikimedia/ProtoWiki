<script setup lang="ts">
/**
 * Citoid "Add a citation" (`ve.ui.CitoidInspector`): a 400px popup at the
 * cursor on desktop, full screen on mobile. Tabs: Automatic (Citoid lookup →
 * rendered result cards), Manual (template forms from TemplateData) and Re-use
 * (existing references). Copy is production's (Citoid / Cite i18n).
 */
import { computed, nextTick, ref, watch } from 'vue'
import {
  CdxButton,
  CdxDialog,
  CdxField,
  CdxIcon,
  CdxMessage,
  CdxPopover,
  CdxProgressBar,
  CdxSearchInput,
  CdxTab,
  CdxTabs,
  CdxTextInput,
} from '@wikimedia/codex'
import type { Icon } from '@wikimedia/codex-icons'
import {
  cdxIconBook,
  cdxIconBrowser,
  cdxIconClose,
  cdxIconJournal,
  cdxIconNewspaper,
  cdxIconPrevious,
  cdxIconReference,
} from '@wikimedia/codex-icons'

import { fetchTemplateData } from './engine/api'
import {
  CITE_TOOLS,
  CitoidError,
  citationParams,
  citationWikitext,
  lookupCitation,
  renderWikitext,
  templateFor,
  toolFor,
  type CitoidItem,
} from './engine/citoid'

export interface ExistingReference {
  label: string
  html: string
  name?: string
}

export interface CitationInsert {
  /** Rendered citation (reference body). */
  html: string
  /** Re-used reference: its footnote label. */
  reuseLabel?: string
}

const props = defineProps<{
  open: boolean
  skin: 'desktop' | 'mobile'
  host: string
  pageTitle: string
  anchor: HTMLElement | null
  /** "Replace citation" (Convert reference / citation needed). */
  replace?: boolean
  /** Lookup to run on open (Convert reference: the bare URL). */
  initialQuery?: string
  references: ExistingReference[]
}>()

const emit = defineEmits<{
  insert: [value: CitationInsert]
  cancel: []
}>()

const isMobile = computed(() => props.skin === 'mobile')

const openModel = computed({
  get: () => props.open,
  set: (value: boolean) => {
    if (!value) emit('cancel')
  },
})

type Panel = 'lookup' | 'result' | 'form'
const tab = ref<'auto' | 'manual' | 'reuse'>('auto')
const panel = ref<Panel>('lookup')
const query = ref('')
const loading = ref(false)
const error = ref<CitoidError['kind'] | null>(null)
const results = ref<{ template: string; wikitext: string; html: string; label: string; icon: Icon }[]>([])
const credit = ref<string | null>(null)
const reuseQuery = ref('')

// Manual: template form
const formTemplate = ref<{ name: string; label: string; template: string } | null>(null)
const formFields = ref<{ name: string; label: string; required: boolean }[]>([])
const formValues = ref<Record<string, string>>({})
const formLoading = ref(false)
const inserting = ref(false)

const ICONS: Record<string, Icon> = {
  'Cite web': cdxIconBrowser,
  'Cite book': cdxIconBook,
  'Cite news': cdxIconNewspaper,
  'Cite journal': cdxIconJournal,
}
const iconFor = (template: string) => ICONS[template] ?? cdxIconBrowser

function reset() {
  tab.value = 'auto'
  panel.value = 'lookup'
  query.value = props.initialQuery ?? ''
  loading.value = false
  error.value = null
  results.value = []
  credit.value = null
  reuseQuery.value = ''
  formTemplate.value = null
  formValues.value = {}
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    reset()
    if (props.initialQuery) {
      await nextTick()
      void create()
    }
  },
)

const title = computed(() => {
  if (panel.value === 'form' && formTemplate.value) return formTemplate.value.label
  return props.replace ? 'Replace citation' : 'Add a citation'
})

async function create() {
  const q = query.value.trim()
  if (!q || loading.value) return
  // A small number re-uses that footnote.
  if (/^\d+$/.test(q) && Number(q) < 1000 && props.references.length) {
    tab.value = 'reuse'
    reuseQuery.value = q
    return
  }
  loading.value = true
  error.value = null
  try {
    const items: CitoidItem[] = await lookupCitation(props.host, q)
    const rendered = await Promise.all(
      items.map(async (item) => {
        const template = templateFor(item)
        const wikitext = citationWikitext(template, citationParams(item, template))
        const html = await renderWikitext(props.host, props.pageTitle, wikitext)
        return { template, wikitext, html, label: toolFor(template)?.label ?? template, icon: iconFor(template) }
      }),
    )
    results.value = rendered
    const source = items[0]?.source?.find((s) => /Zotero|Wayback/.test(s))
    credit.value = source ? `Powered by ${source.includes('Wayback') ? 'Wayback Machine' : 'Zotero'}` : null
    panel.value = 'result'
  } catch (err) {
    error.value = err instanceof CitoidError ? err.kind : 'general'
  } finally {
    loading.value = false
  }
}

const errorText = computed(() =>
  error.value === 'pdf'
    ? 'Unable to cite PDFs; unsupported media type'
    : error.value === 'media'
      ? 'Unable to cite unsupported media types such as text, image, and video files.'
      : "We couldn't make a citation for you.",
)

function back() {
  if (panel.value === 'form') {
    panel.value = 'lookup'
    tab.value = 'manual'
    return
  }
  panel.value = 'lookup'
  credit.value = null
}

function insertResult(index = 0) {
  const result = results.value[index]
  if (!result) return
  emit('insert', { html: result.html || result.wikitext })
}

// Re-use
const filteredReferences = computed(() => {
  const q = reuseQuery.value.trim().toLowerCase()
  const all = props.references
  if (!q) return all
  const exact = all.filter((r) => r.label.replace(/[[\]]/g, '') === q)
  const rest = all.filter((r) => !exact.includes(r) && `${r.label} ${r.name ?? ''} ${r.html.replace(/<[^>]+>/g, '')}`.toLowerCase().includes(q))
  return [...exact, ...rest]
})

function reuse(ref: ExistingReference) {
  emit('insert', { html: ref.html, reuseLabel: ref.label })
}

// Manual
async function openTemplateForm(tool: { name: string; label: string; template: string }) {
  formTemplate.value = tool
  formValues.value = {}
  formFields.value = []
  panel.value = 'form'
  formLoading.value = true
  const specs = await fetchTemplateData(props.host, [`Template:${tool.template}`])
  const params = specs.get(`Template:${tool.template}`) ?? {}
  formFields.value = Object.entries(params)
    .filter(([, p]: [string, any]) => p?.required || p?.suggested)
    .map(([name, p]: [string, any]) => ({
      name,
      label: (typeof p.label === 'string' ? p.label : p.label?.en) ?? name,
      required: !!p.required,
    }))
  if (!formFields.value.length) {
    formFields.value = ['title', 'url', 'date'].map((name) => ({ name, label: name, required: false }))
  }
  formLoading.value = false
}

async function insertForm() {
  if (!formTemplate.value) return
  inserting.value = true
  const params = formFields.value
    .map((f) => [f.name, (formValues.value[f.name] ?? '').trim()] as [string, string])
    .filter(([, v]) => v)
  const wikitext = citationWikitext(formTemplate.value.template, params)
  const html = await renderWikitext(props.host, props.pageTitle, wikitext)
  inserting.value = false
  emit('insert', { html: html || wikitext })
}

function basic() {
  // Basic: a plain <ref> with free text.
  formTemplate.value = { name: 'basic', label: 'Basic', template: '' }
  formFields.value = [{ name: 'text', label: 'Reference', required: true }]
  formValues.value = {}
  panel.value = 'form'
}

async function insertBasic() {
  const text = (formValues.value.text ?? '').trim()
  if (!text) return
  emit('insert', { html: text.replace(/</g, '&lt;') })
}

const hasSingleResult = computed(() => panel.value === 'result' && results.value.length === 1)
const isBasic = computed(() => formTemplate.value?.name === 'basic')

const wrapper = computed(() => (isMobile.value ? CdxDialog : CdxPopover))
const wrapperProps = computed((): Record<string, unknown> =>
  isMobile.value
    ? { class: 'citoid citoid--mobile', title: title.value, hideTitle: true }
    : {
        class: 'citoid citoid--desktop',
        anchor: props.anchor,
        placement: 'bottom-start',
      },
)
</script>

<template>
  <component :is="wrapper" v-model:open="openModel" v-bind="wrapperProps">
    <template #header>
      <div class="citoid__head">
        <CdxButton
          v-if="panel === 'lookup'"
          weight="quiet"
          aria-label="Cancel"
          title="Cancel"
          @click="emit('cancel')"
        >
          <CdxIcon :icon="cdxIconClose" />
        </CdxButton>
        <CdxButton v-else weight="quiet" aria-label="Back" title="Back" @click="back">
          <CdxIcon :icon="cdxIconPrevious" />
        </CdxButton>
        <div class="citoid__title">{{ title }}</div>
        <CdxButton
          v-if="hasSingleResult"
          action="progressive"
          weight="primary"
          @click="insertResult(0)"
        >
          Insert
        </CdxButton>
        <CdxButton
          v-else-if="panel === 'form'"
          action="progressive"
          weight="primary"
          :disabled="inserting || (isBasic && !(formValues.text ?? '').trim())"
          @click="isBasic ? insertBasic() : insertForm()"
        >
          Insert
        </CdxButton>
        <span v-else class="citoid__head-spacer" />
      </div>
    </template>

    <div class="citoid__body">
      <!-- Result panel: tabs hidden -->
      <template v-if="panel === 'result'">
        <div v-for="(r, i) in results" :key="i" class="citoid__result">
          <div class="citoid__result-head">
            <CdxIcon :icon="r.icon" class="citoid__result-icon" />
            <span class="citoid__result-title">{{ r.label }}</span>
            <CdxButton v-if="!hasSingleResult" action="progressive" weight="primary" @click="insertResult(i)">
              Insert
            </CdxButton>
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="citoid__result-preview" v-html="r.html || r.wikitext" />
        </div>
        <div v-if="credit" class="citoid__credit">{{ credit }}</div>
      </template>

      <!-- Manual template form -->
      <template v-else-if="panel === 'form'">
        <CdxProgressBar v-if="formLoading" inline aria-label="Loading template" />
        <CdxField v-for="field in formFields" :key="field.name">
          <template #label>{{ field.label }}</template>
          <CdxTextInput v-model="formValues[field.name]" />
        </CdxField>
      </template>

      <CdxTabs v-else v-model:active="tab" class="citoid__tabs">
        <CdxTab name="auto" label="Automatic">
          <div class="citoid__panel">
            <CdxField>
              <template #label>Enter a link or reference code (ISBN, DOI or other) to create a citation</template>
              <div class="citoid__lookup">
                <CdxTextInput
                  v-model="query"
                  class="citoid__lookup-input"
                  placeholder="e.g. http://www.example.com"
                  :disabled="loading"
                  :status="error ? 'error' : 'default'"
                  @update:model-value="error = null"
                  @keydown.enter.prevent="create"
                />
                <CdxButton :disabled="!query.trim() || loading" @click="create">Create</CdxButton>
              </div>
            </CdxField>
            <CdxProgressBar v-if="loading" inline aria-label="Looking up the citation" />
            <CdxMessage v-if="error" type="error" class="citoid__error">
              <p>{{ errorText }}</p>
              <p>Try another source or create one manually.</p>
              <CdxButton action="progressive" @click="tab = 'manual'">Add manually</CdxButton>
            </CdxMessage>
          </div>
        </CdxTab>

        <CdxTab name="manual" label="Manual">
          <div class="citoid__panel citoid__manual">
            <button
              v-for="tool in CITE_TOOLS"
              :key="tool.name"
              type="button"
              class="citoid__manual-option"
              @click="openTemplateForm(tool)"
            >
              <CdxIcon :icon="iconFor(tool.template)" />
              <span>{{ tool.label }}</span>
            </button>
            <button type="button" class="citoid__manual-option citoid__manual-option--basic" @click="basic">
              <CdxIcon :icon="cdxIconReference" />
              <span>Basic</span>
            </button>
          </div>
        </CdxTab>

        <CdxTab name="reuse" label="Re-use" :disabled="!references.length">
          <div class="citoid__reuse">
            <CdxSearchInput v-model="reuseQuery" placeholder="Search within current citations" />
            <ul class="citoid__reuse-list">
              <li v-for="r in filteredReferences" :key="r.label">
                <button type="button" class="citoid__reuse-item" @click="reuse(r)">
                  <span class="citoid__reuse-label">{{ r.label }}</span>
                  <span v-if="r.name" class="citoid__reuse-name">{{ r.name }}</span>
                  <!-- eslint-disable-next-line vue/no-v-html -->
                  <span class="citoid__reuse-text" v-html="r.html" />
                </button>
              </li>
            </ul>
          </div>
        </CdxTab>
      </CdxTabs>
    </div>
  </component>
</template>

<style>
/* Desktop: 400px popup at the cursor (Citoid inspector size `large`). */
.citoid--desktop.cdx-popover {
  width: 400px;
  max-width: calc(100vw - 32px);
  padding: 0;
}

.citoid--desktop .cdx-popover__header {
  padding: 0;
}

.citoid--desktop .cdx-popover__body {
  padding: 0;
}

/* Three short tabs always fit: no scroll arrows (Codex measures before the popup has its size). */
.citoid .cdx-tabs__prev-scroller,
.citoid .cdx-tabs__next-scroller {
  display: none !important;
}

/* Mobile: full screen. */
.citoid--mobile.cdx-dialog {
  width: 100vw;
  max-width: none;
  height: 100vh;
  max-height: none;
  border-radius: 0;
}

.citoid--mobile .cdx-dialog__header {
  padding: 0;
}

.citoid--mobile .cdx-dialog__body {
  padding: 0;
}
</style>

<style scoped>
.citoid__head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 4px 8px;
  border-bottom: 1px solid var(--border-color-subtle, #c8ccd1);
}

.citoid__title {
  flex: 1;
  text-align: center;
  font-weight: var(--font-weight-bold, 700);
  font-size: var(--font-size-medium, 16px);
}

.citoid--mobile .citoid__title {
  text-align: left;
}

.citoid__head-spacer {
  width: 32px;
}

.citoid__body {
  max-height: min(70vh, 560px);
  overflow-y: auto;
}

.citoid--mobile .citoid__body {
  max-height: none;
}

.citoid__panel {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.citoid__lookup {
  display: flex;
  gap: 8px;
}

.citoid__lookup-input {
  flex: 1;
  min-width: 0;
}

.citoid__error p {
  margin: 0 0 8px;
}

.citoid__result {
  padding: 0.5em 16px;
  line-height: 1.5em;
}

.citoid__result + .citoid__result {
  border-top: 1px solid #ccc;
  margin-top: 0.75em;
  padding-top: 0.75em;
}

.citoid__result-head {
  display: flex;
  align-items: center;
  gap: 0.5em;
}

.citoid__result-title {
  flex: 1;
  font-weight: var(--font-weight-bold, 700);
}

.citoid__result-preview {
  margin-top: 0.5em;
  font-size: var(--font-size-small, 14px);
  overflow-wrap: anywhere;
}

.citoid__result-preview :deep(a) {
  color: var(--color-progressive, #36c);
}

.citoid__credit {
  padding: 8px 16px;
  text-align: right;
  font-size: var(--font-size-x-small, 12px);
  color: #888;
}

.citoid__manual {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}

.citoid__manual-option {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0.5em 0;
  padding: 8px;
  border: 0;
  border-radius: 2px;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  color: var(--color-base, #202122);
}

.citoid__manual-option:hover {
  background: var(--background-color-interactive-subtle, #f8f9fa);
}

.citoid__manual-option--basic {
  grid-column: 1 / -1;
  border-top: 1px solid #ccc;
  border-radius: 0;
  padding-top: 1em;
}

.citoid__reuse {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 16px 0;
  min-height: 20em;
}

.citoid__reuse-list {
  list-style: none;
  margin: 0 -16px;
  padding: 0;
}

.citoid__reuse-item {
  display: block;
  width: 100%;
  max-height: 12em;
  overflow: hidden;
  padding: 1em 16px;
  border: 0;
  border-bottom: 1px solid var(--border-color-muted, #dadde3);
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.citoid__reuse-item:hover {
  background: var(--background-color-interactive, #eaecf0);
}

.citoid__reuse-label {
  float: left;
  margin-right: 0.75em;
}

.citoid__reuse-name {
  float: right;
  max-width: 40%;
  opacity: 0.6;
}

.citoid__reuse-text {
  font-size: var(--font-size-small, 14px);
}
</style>
