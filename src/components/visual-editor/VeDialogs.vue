<script setup lang="ts">
/**
 * Stand-ins for the VE dialogs a fix opens: Citoid ("Add citation" /
 * "Convert"), the link inspector ("Update link") and media settings ("Add
 * caption"). They collect a value and hand it back; the fix itself is applied
 * by the editor.
 */
import { computed, ref, watch } from 'vue'
import { CdxDialog, CdxField, CdxLookup, CdxTextArea, CdxTextInput } from '@wikimedia/codex'
import type { MenuItemData } from '@wikimedia/codex'

import { wikimediaApiFetchHeaders } from '@/config'

export type VeDialogKind = 'citation' | 'link' | 'caption' | 'template'

const props = defineProps<{
  kind: VeDialogKind | null
  host: string
  /** Prefill (link title / reference URL). */
  initial?: string
  /** Template dialog: the required parameters to fill (`key` → label). */
  fields?: { key: string; label: string }[]
}>()

const emit = defineEmits<{
  submit: [value: string]
  cancel: []
}>()

const open = computed({
  get: () => props.kind !== null,
  set: (value: boolean) => {
    if (!value) emit('cancel')
  },
})

const citation = ref('')
const caption = ref('')
const linkSelected = ref<string | null>(null)
const linkInput = ref('')
const linkItems = ref<MenuItemData[]>([])
const templateValues = ref<Record<string, string>>({})

watch(
  () => props.kind,
  (kind) => {
    citation.value = kind === 'citation' ? (props.initial ?? '') : ''
    caption.value = ''
    linkSelected.value = null
    linkInput.value = kind === 'link' ? (props.initial ?? '') : ''
    linkItems.value = []
    templateValues.value = {}
    if (kind === 'link' && linkInput.value) void searchTitles(linkInput.value)
  },
)

let searchAbort: AbortController | null = null
async function searchTitles(query: string) {
  searchAbort?.abort()
  if (!query.trim()) {
    linkItems.value = []
    return
  }
  searchAbort = new AbortController()
  try {
    const params = new URLSearchParams({
      action: 'opensearch',
      search: query,
      limit: '8',
      namespace: '0',
      format: 'json',
      origin: '*',
    })
    const res = await fetch(`https://${props.host}/w/api.php?${params}`, {
      signal: searchAbort.signal,
      headers: wikimediaApiFetchHeaders('visual-editor-template-link'),
    })
    const data = await res.json()
    linkItems.value = (data?.[1] ?? []).map((title: string) => ({ value: title, label: title }))
  } catch {
    /* aborted or offline */
  }
}

const title = computed(() =>
  props.kind === 'citation'
    ? 'Add a citation'
    : props.kind === 'link'
      ? 'Link'
      : props.kind === 'template'
        ? 'Template'
        : 'Media settings',
)

const value = computed(() =>
  props.kind === 'citation'
    ? citation.value.trim()
    : props.kind === 'link'
      ? (linkSelected.value ?? linkInput.value).trim()
      : props.kind === 'template'
        ? Object.values(templateValues.value).some((v) => v.trim())
          ? JSON.stringify(templateValues.value)
          : ''
        : caption.value.trim(),
)

const primaryAction = computed(() => ({
  label: props.kind === 'citation' ? 'Insert' : props.kind === 'link' || props.kind === 'template' ? 'Done' : 'Apply changes',
  actionType: 'progressive' as const,
  disabled: !value.value,
}))

function onPrimary() {
  if (value.value) emit('submit', value.value)
}
</script>

<template>
  <CdxDialog
    v-model:open="open"
    :title="title"
    use-close-button
    :primary-action="primaryAction"
    :default-action="{ label: 'Cancel' }"
    @primary="onPrimary"
    @default="emit('cancel')"
  >
    <CdxField v-if="kind === 'citation'">
      <template #label>Automatic</template>
      <template #description>Paste the source's URL, DOI or ISBN.</template>
      <CdxTextInput v-model="citation" input-type="text" placeholder="https://" @keydown.enter="onPrimary" />
    </CdxField>

    <CdxField v-else-if="kind === 'link'">
      <template #label>Search pages</template>
      <CdxLookup
        v-model:selected="linkSelected"
        v-model:input-value="linkInput"
        :menu-items="linkItems"
        @input="searchTitles"
      />
    </CdxField>

    <template v-else-if="kind === 'template'">
      <CdxField v-for="field in fields ?? []" :key="field.key">
        <template #label>{{ field.label }}</template>
        <template #help-text>Required parameter</template>
        <CdxTextInput v-model="templateValues[field.key]" />
      </CdxField>
    </template>

    <CdxField v-else-if="kind === 'caption'">
      <template #label>Caption</template>
      <CdxTextArea v-model="caption" autosize />
    </CdxField>
  </CdxDialog>
</template>
