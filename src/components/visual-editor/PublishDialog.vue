<script setup lang="ts">
/**
 * VE save dialog (`ve.ui.MWSaveDialog` / `MWMobileSaveDialog`): "Save your
 * changes" with edit summary, minor/watch options and the licence, and a
 * "Review your changes" panel with the diff. 500px (900px reviewing) on
 * desktop, full screen on mobile. Copy is enwiki's.
 */
import { computed, nextTick, ref, watch } from 'vue'
import {
  CdxButton,
  CdxCheckbox,
  CdxDialog,
  CdxIcon,
  CdxProgressBar,
  CdxSelect,
  CdxTextArea,
  CdxToggleButtonGroup,
} from '@wikimedia/codex'
import { cdxIconClose, cdxIconEye, cdxIconPrevious, cdxIconWikitext } from '@wikimedia/codex-icons'

export interface DiffBlock {
  before: string
  after: string
}

const props = defineProps<{
  open: boolean
  skin: 'desktop' | 'mobile'
  loggedIn: boolean
  /** Changed blocks (plain text), for "Review your changes". */
  diff: DiffBlock[]
}>()

const emit = defineEmits<{
  close: []
  publish: [summary: string, options: { watchPage: boolean }]
}>()

const isMobile = computed(() => props.skin === 'mobile')
const panel = ref<'save' | 'review'>('save')
const summary = ref('')
const minor = ref(false)
const watchPage = ref(true)
const expiry = ref('infinite')
const pending = ref(false)
const diffMode = ref<'visual' | 'source'>('visual')
const summaryRef = ref<InstanceType<typeof CdxTextArea> | null>(null)

const LIMIT = 500
const remaining = computed(() => LIMIT - Array.from(summary.value).length)

const expiryItems = [
  { value: 'infinite', label: 'Permanent' },
  { value: '1 week', label: '1 week' },
  { value: '1 month', label: '1 month' },
  { value: '3 months', label: '3 months' },
  { value: '6 months', label: '6 months' },
  { value: '1 year', label: '1 year' },
]

const openModel = computed({
  get: () => props.open,
  set: (value: boolean) => {
    if (!value) emit('close')
  },
})

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    panel.value = 'save'
    pending.value = false
    await nextTick()
    const el = (summaryRef.value?.$el as HTMLElement | undefined)?.querySelector('textarea')
    el?.focus()
  },
)

function onSummaryInput(value: string) {
  // 500 code points; Enter doesn't insert a newline.
  const clean = value.replace(/\r?\n/g, ' ')
  summary.value = Array.from(clean).slice(0, LIMIT).join('')
}

const title = computed(() => (panel.value === 'review' ? 'Review your changes' : 'Save your changes'))
const publishLabel = computed(() => (isMobile.value ? 'Publish' : 'Publish changes'))

async function publish() {
  if (panel.value !== 'save') {
    panel.value = 'save'
    return
  }
  pending.value = true
  await new Promise((r) => setTimeout(r, 800))
  pending.value = false
  emit('publish', summary.value, { watchPage: watchPage.value })
}

/** Word-level diff for the visual review. */
function wordDiff(before: string, after: string): { text: string; type: 'same' | 'ins' | 'del' }[] {
  const a = before.split(/(\s+)/)
  const b = after.split(/(\s+)/)
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const out: { text: string; type: 'same' | 'ins' | 'del' }[] = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({ text: a[i], type: 'same' })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ text: a[i++], type: 'del' })
    else out.push({ text: b[j++], type: 'ins' })
  }
  while (i < m) out.push({ text: a[i++], type: 'del' })
  while (j < n) out.push({ text: b[j++], type: 'ins' })
  return out
}

const visualDiff = computed(() => props.diff.map((d) => wordDiff(d.before, d.after)))
</script>

<template>
  <CdxDialog
    v-model:open="openModel"
    class="ve-save"
    :class="{ 've-save--mobile': isMobile, 've-save--review': panel === 'review' }"
    :title="title"
    hide-title
  >
    <template #header>
      <div class="ve-save__head">
        <CdxButton
          v-if="panel === 'save'"
          weight="quiet"
          aria-label="Resume editing"
          title="Resume editing"
          @click="emit('close')"
        >
          <CdxIcon :icon="isMobile ? cdxIconPrevious : cdxIconClose" />
        </CdxButton>
        <CdxButton v-else weight="quiet" aria-label="Return to save form" title="Return to save form" @click="panel = 'save'">
          <CdxIcon :icon="cdxIconPrevious" />
        </CdxButton>
        <div class="ve-save__title">{{ title }}</div>
        <CdxButton action="progressive" weight="primary" :disabled="pending" @click="publish">
          {{ publishLabel }}
        </CdxButton>
      </div>
      <CdxProgressBar v-if="pending" inline class="ve-save__pending" aria-label="Publishing" />
    </template>

    <!-- Save panel -->
    <div v-if="panel === 'save'" class="ve-save__panel">
      <div class="ve-save__summary-label">
        <a href="https://en.wikipedia.org/wiki/Help:Edit_summary" target="_blank" rel="noopener">Edit summary</a>
        <small> (Briefly describe your changes)</small>
      </div>
      <div class="ve-save__summary">
        <CdxTextArea
          ref="summaryRef"
          :model-value="summary"
          autosize
          placeholder="Describe what you changed"
          :disabled="pending"
          @update:model-value="onSummaryInput"
          @keydown.enter.prevent
        />
        <div v-if="loggedIn || remaining <= 99" class="ve-save__options">
          <div v-if="loggedIn" class="ve-save__checkboxes">
            <CdxCheckbox v-model="minor" inline class="ve-save__minor">
              This is a
              <a href="https://en.wikipedia.org/wiki/Help:Minor_edit" target="_blank" rel="noopener">minor edit</a>
            </CdxCheckbox>
            <CdxCheckbox v-model="watchPage" inline title="Add this page to your watchlist">Watch this page</CdxCheckbox>
            <CdxSelect
              v-model:selected="expiry"
              class="ve-save__expiry"
              :menu-items="expiryItems"
              :disabled="!watchPage"
              aria-label="Watchlist time period:"
              title="Temporarily add this page to your watchlist"
            />
          </div>
          <span v-if="remaining <= 99" class="ve-save__count" title="The number of characters remaining">
            {{ remaining }}
          </span>
        </div>
      </div>
      <p class="ve-save__license">
        By publishing changes, you agree to the
        <a href="https://foundation.wikimedia.org/wiki/Special:MyLanguage/Policy:Terms_of_Use" target="_blank" rel="noopener">Terms of Use</a>,
        and you irrevocably agree to release your contribution under the
        <a href="https://en.wikipedia.org/wiki/Wikipedia:Text_of_the_Creative_Commons_Attribution-ShareAlike_4.0_International_License" target="_blank" rel="noopener">CC BY-SA 4.0 License</a>
        and the
        <a href="https://en.wikipedia.org/wiki/Wikipedia:Text_of_the_GNU_Free_Documentation_License" target="_blank" rel="noopener">GFDL</a>.
        You agree that a hyperlink or URL is sufficient attribution under the Creative Commons license.
      </p>
    </div>

    <!-- Review panel -->
    <div v-else class="ve-save__panel ve-save__review">
      <CdxToggleButtonGroup
        v-model="diffMode"
        class="ve-save__mode"
        :buttons="[
          { value: 'visual', label: 'Visual', icon: cdxIconEye },
          { value: 'source', label: 'Wikitext', icon: cdxIconWikitext },
        ]"
      />
      <div class="mw-summary-preview">
        Preview of edit summary:<br />
        <span class="comment">{{ summary.trim() ? `(${summary.trim()})` : 'No edit summary' }}</span>
      </div>
      <div class="ve-save__viewer">
        <p v-if="!diff.length" class="ve-save__no-changes">No changes</p>
        <template v-else-if="diffMode === 'visual'">
          <p v-for="(parts, i) in visualDiff" :key="i" class="ve-save__visual-block">
            <template v-for="(part, k) in parts" :key="k">
              <ins v-if="part.type === 'ins'">{{ part.text }}</ins>
              <del v-else-if="part.type === 'del'">{{ part.text }}</del>
              <template v-else>{{ part.text }}</template>
            </template>
          </p>
        </template>
        <table v-else class="ve-save__wikitext-diff">
          <tbody>
            <tr v-for="(d, i) in diff" :key="i">
              <td class="ve-save__diff-del">{{ d.before ? '−' : '' }}</td>
              <td class="ve-save__diff-old">{{ d.before }}</td>
              <td class="ve-save__diff-ins">{{ d.after ? '+' : '' }}</td>
              <td class="ve-save__diff-new">{{ d.after }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <template v-if="panel === 'save'" #footer>
      <CdxButton :disabled="pending" @click="panel = 'review'">Review your changes</CdxButton>
    </template>
  </CdxDialog>
</template>

<style>
/* ProcessDialog sizes: 500px (save) / 900px (review); full screen on mobile. */
.ve-save.cdx-dialog {
  width: 500px;
  max-width: calc(100vw - 32px);
}

.ve-save.ve-save--review.cdx-dialog {
  width: 900px;
}

.ve-save--mobile.cdx-dialog,
.ve-save--mobile.ve-save--review.cdx-dialog {
  width: 100vw;
  max-width: none;
  height: 100vh;
  max-height: none;
  border-radius: 0;
}

.ve-save .cdx-dialog__header {
  padding: 0;
  display: block;
}
</style>

<style scoped>
/* ProcessDialog head: buttons run the full height of the bar, no padding. */
.ve-save__head {
  display: flex;
  align-items: stretch;
  min-height: 48px;
  padding: 0;
  border-bottom: 1px solid var(--border-color-subtle, #c8ccd1);
}

.ve-save__head .cdx-button {
  min-height: 48px;
  height: auto;
  border-radius: 0;
}

.ve-save__head .cdx-button--weight-quiet {
  min-width: 48px;
  width: 48px;
  padding: 0;
}

.ve-save__head .cdx-button--weight-primary {
  padding-inline: 16px;
}

.ve-save__title {
  flex: 1;
  align-self: center;
  text-align: center;
  font-weight: var(--font-weight-bold, 700);
  font-size: var(--font-size-medium, 16px);
}

.ve-save--mobile .ve-save__title {
  text-align: left;
}

.ve-save__panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ve-save__summary-label {
  padding: 0.25em 0;
}

.ve-save__summary-label a {
  color: var(--color-progressive, #36c);
}

.ve-save__summary :deep(textarea) {
  min-height: 4em;
}

.ve-save__options {
  position: relative;
  min-height: 3em;
  background: var(--background-color-neutral-subtle, #f8f9fa);
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  border-top: 0;
}

.ve-save__checkboxes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5em 1.5em;
  padding: 0.7857em 3.25em 0.5em 0.7857em;
}

.ve-save__minor {
  flex-basis: 100%;
}

.ve-save__expiry {
  min-width: 9em;
}

.ve-save__count {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  padding: 0 1em;
  border-left: 1px solid var(--border-color-muted, #dadde3);
  line-height: 3em;
  color: var(--color-subtle, #54595d);
}

.ve-save__license {
  margin: 8px 0 0;
  font-size: 0.9em;
  line-height: 1.4em;
  color: var(--color-subtle, #54595d);
}

.ve-save__license a {
  color: var(--color-progressive, #36c);
}

.ve-save__mode {
  align-self: flex-end;
}

.mw-summary-preview .comment {
  font-style: italic;
}

.ve-save__viewer {
  margin-top: 1em;
}

.ve-save__no-changes {
  font-style: italic;
  color: var(--color-disabled, #a2a9b1);
}

.ve-save__visual-block {
  margin: 0 0 1em;
  line-height: 1.6;
}

.ve-save__visual-block ins {
  text-decoration: none;
  background: var(--background-color-progressive-subtle, #e8eeff);
  box-shadow: 0 0 0 1px var(--border-color-progressive, #36c);
}

.ve-save__visual-block del {
  background: var(--background-color-destructive-subtle, #ffe9e5);
  box-shadow: 0 0 0 1px var(--border-color-destructive, #d73333);
}

.ve-save__wikitext-diff {
  width: 100%;
  border-collapse: collapse;
  font-family: monospace;
  font-size: 0.875em;
}

.ve-save__wikitext-diff td {
  vertical-align: top;
  padding: 4px 8px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.ve-save__diff-old {
  width: 50%;
  border-left: 4px solid #ffe49c;
}

.ve-save__diff-new {
  width: 50%;
  border-left: 4px solid #a3d3ff;
}

.ve-save__diff-del,
.ve-save__diff-ins {
  width: 1em;
  color: var(--color-subtle, #54595d);
}
</style>
