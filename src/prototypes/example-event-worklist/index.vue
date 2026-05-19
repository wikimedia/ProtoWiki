<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  CdxButton,
  CdxDialog,
  CdxField,
  CdxIcon,
  CdxTab,
  CdxTable,
  CdxTabs,
  CdxTextArea,
} from '@wikimedia/codex'
import { cdxIconAdd, cdxIconClock, cdxIconTrash } from '@wikimedia/codex-icons'

import ChromeWrapper from '@/components/ChromeWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'

definePage({
  meta: {
    title: 'Example: Event worklist',
    description: 'Prototype for an event worklist page, intended for mobile.',
  },
})

interface WorklistRow {
  id: string
  article: string
  articleUrl: string
  wiki: string
}

const activeTab = ref('worklist')
const showAddDialog = ref(false)
const urlPaste = ref('')
const rows = ref<WorklistRow[]>([])
/** Codex table sort model — column id → direction */
const sort = ref<Record<string, 'asc' | 'desc' | 'none'>>({})
const lastEditedAt = ref<Date | null>(null)

const canSubmit = computed(() => urlPaste.value.trim().length > 0)

const primaryAction = computed(() => ({
  label: 'Add',
  actionType: 'progressive' as const,
  disabled: !canSubmit.value,
}))

const tableColumns = [
  { id: 'article', label: 'Article', allowSort: true },
  { id: 'wiki', label: 'Wiki', allowSort: true },
  {
    id: 'actions',
    label: '',
    allowSort: false,
    width: '4rem',
    textAlign: 'end' as const,
  },
]

const tableData = computed(() => {
  const list = [...rows.value]
  const entries = Object.entries(sort.value)
  if (!entries.length) return list

  const [col, order] = entries[0] as [
    keyof Pick<WorklistRow, 'article' | 'wiki'>,
    'asc' | 'desc' | 'none',
  ]
  if (!col || order === 'none') return list
  if (col !== 'article' && col !== 'wiki') return list

  return list.sort((a, b) => {
    const av = a[col]
    const bv = b[col]
    const cmp = av.localeCompare(bv)
    return order === 'asc' ? cmp : -cmp
  })
})

const lastEditedLabel = computed(() => {
  const d = lastEditedAt.value
  if (!d) return ''
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
})

const WIKI_LABEL_BY_HOST: Record<string, string> = {
  'en.wikipedia.org': 'English Wikipedia',
  'meta.wikimedia.org': 'Wikimedia Meta-Wiki',
  'commons.wikimedia.org': 'Wikimedia Commons',
  'wikidata.org': 'Wikidata',
  'www.wikidata.org': 'Wikidata',
}

function wikiLabelFromHostname(hostname: string): string {
  const h = hostname.replace(/^www\./, '').toLowerCase()
  return WIKI_LABEL_BY_HOST[h] ?? h
}

function normalizeHrefKey(url: URL): string {
  return `${url.origin}${url.pathname}`.toLowerCase()
}

function parseWikiArticleUrl(
  line: string,
): Pick<WorklistRow, 'article' | 'articleUrl' | 'wiki'> | null {
  try {
    const raw = line.trim()
    if (!raw) return null

    const url = new URL(raw)
    const path = url.pathname
    const wikiSlash = '/wiki/'
    const idx = path.indexOf(wikiSlash)
    if (idx === -1) return null

    const encodedTitle = path.slice(idx + wikiSlash.length).split('/')[0]
    if (!encodedTitle) return null

    const article = decodeURIComponent(encodedTitle.replace(/_/g, ' '))
    const wiki = wikiLabelFromHostname(url.hostname)

    return {
      article,
      articleUrl: url.href,
      wiki,
    }
  } catch {
    return null
  }
}

function openAddDialog() {
  showAddDialog.value = true
}

function onAddToWorklist() {
  const lines = urlPaste.value.split(/\r?\n/)
  const existingKeys = new Set(rows.value.map((r) => normalizeHrefKey(new URL(r.articleUrl))))

  const added: WorklistRow[] = []

  for (const line of lines) {
    const parsed = parseWikiArticleUrl(line)
    if (!parsed) continue

    let urlObj: URL
    try {
      urlObj = new URL(parsed.articleUrl)
    } catch {
      continue
    }

    const key = normalizeHrefKey(urlObj)
    if (existingKeys.has(key)) continue

    existingKeys.add(key)
    added.push({
      id: crypto.randomUUID(),
      article: parsed.article,
      articleUrl: parsed.articleUrl,
      wiki: parsed.wiki,
    })
  }

  if (added.length) {
    rows.value = [...rows.value, ...added]
    lastEditedAt.value = new Date()
  }

  urlPaste.value = ''
  showAddDialog.value = false
}

function removeRow(rowId: string) {
  rows.value = rows.value.filter((r) => r.id !== rowId)
  lastEditedAt.value = new Date()
}
</script>

<template>
  <ChromeWrapper>
    <SpecialPageWrapper title="Wiki Loves Earth 2026">
      <CdxTabs v-model:active="activeTab" class="event-worklist__tabs">
        <CdxTab name="details" label="Event details" disabled />
        <CdxTab name="participants" label="Participants" disabled />
        <CdxTab name="worklist" label="Worklist">
          <section class="event-worklist__card" aria-labelledby="event-worklist-heading">
            <div class="event-worklist__card-header">
              <h2 id="event-worklist-heading" class="event-worklist__card-title">Worklist</h2>
              <CdxButton aria-label="Add" @click="openAddDialog">
                <CdxIcon :icon="cdxIconAdd" />
              </CdxButton>
            </div>

            <div
              class="event-worklist__card-body"
              :class="{ 'event-worklist__card-body--filled': rows.length > 0 }"
            >
              <template v-if="rows.length === 0">
                <p class="event-worklist__description">
                  A list of articles for people to work on during your event.
                </p>
              </template>

              <div v-else class="event-worklist__table-wrap">
                <CdxTable
                  v-model:sort="sort"
                  caption="Articles in this worklist"
                  hide-caption
                  class="event-worklist__table"
                  :columns="tableColumns"
                  :data="tableData"
                  :show-vertical-borders="false"
                >
                  <template #item-article="{ row }">
                    <a
                      class="event-worklist__article-link"
                      :href="row.articleUrl"
                      rel="noopener noreferrer"
                    >
                      {{ row.article }}
                    </a>
                  </template>

                  <template #item-actions="{ row }">
                    <CdxButton weight="quiet" aria-label="Remove" @click="removeRow(row.id)">
                      <CdxIcon :icon="cdxIconTrash" />
                    </CdxButton>
                  </template>

                  <template #footer>
                    <span class="event-worklist__table-footer">
                      <CdxIcon :icon="cdxIconClock" />
                      <span class="event-worklist__table-footer-text">
                        Last edited {{ lastEditedLabel }} by Username…
                      </span>
                    </span>
                  </template>
                </CdxTable>
              </div>
            </div>
          </section>
        </CdxTab>
        <CdxTab name="contributions" label="Contributions" disabled />
      </CdxTabs>

      <CdxDialog
        v-model:open="showAddDialog"
        title="Add to worklist"
        close-button-label="Close"
        :dismissable="true"
        :primary-action="primaryAction"
        @primary="onAddToWorklist"
      >
        <CdxField>
          <template #label>Article URL</template>
          <template #description>Paste one article URL per line</template>
          <CdxTextArea
            v-model="urlPaste"
            :rows="6"
            class="event-worklist__url-textarea"
            :placeholder="'e.g.\u00A0https://en.wikipedia.org/wiki/Climate_change'"
          />
        </CdxField>
      </CdxDialog>
    </SpecialPageWrapper>
  </ChromeWrapper>
</template>

<style scoped>
.event-worklist__tabs {
  margin-bottom: var(--spacing-100);
}

.event-worklist__card {
  margin-top: var(--spacing-100);
  padding: var(--spacing-100);
  border: var(--border-width-base) solid var(--border-color-subtle);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-base);
}

.event-worklist__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--spacing-100);
  margin-bottom: var(--spacing-100);
  border-bottom: var(--border-width-base) solid var(--border-color-subtle);
}

.event-worklist__card-title {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.event-worklist__card-body {
  text-align: center;
}

.event-worklist__card-body--filled {
  text-align: start;
}

.event-worklist__description {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}

.event-worklist__table-wrap {
  overflow-x: auto;
}

.event-worklist__article-link {
  color: var(--color-progressive);
}

.event-worklist__table-footer {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-50);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  color: var(--color-subtle);
}

.event-worklist__table-footer-text {
  margin: 0;
}

/* Keep “e.g.” with the sample URL in the placeholder; long URLs wrap without break-all. */
.event-worklist__url-textarea :deep(textarea) {
  overflow-wrap: break-word;
  word-break: normal;
}

.event-worklist__url-textarea :deep(textarea::placeholder) {
  overflow-wrap: break-word;
  word-break: normal;
}
</style>
