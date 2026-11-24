<script setup lang="ts">
/**
 * A page title field, as the extension's `PageTitleControl`: a lookup that
 * suggests the wiki's pages as the reader types (Action API `prefixsearch`).
 * Any text is kept, whether or not the reader picks a suggestion. Put it in a
 * `CdxField`.
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import { CdxLookup } from '@wikimedia/codex'
import type { MenuItemData } from '@wikimedia/codex'

import { wikimediaApiFetchHeaders } from '@/config'

import { WIKI } from './wikiUrl'

const title = defineModel<string>({ required: true })

const inputValue = ref(title.value)
const selection = ref<string | null>(null)
const menuItems = ref<MenuItemData[]>([])

// A change from outside, e.g. "Reset to defaults", shows in the field.
watch(title, (value) => {
  if (value !== inputValue.value) inputValue.value = value
})

let controller: AbortController | null = null
let timer: ReturnType<typeof setTimeout> | undefined

async function search(query: string): Promise<void> {
  controller?.abort()
  controller = new AbortController()
  const params = new URLSearchParams({
    action: 'query',
    list: 'prefixsearch',
    pssearch: query,
    pslimit: '6',
    format: 'json',
    formatversion: '2',
    origin: '*',
  })
  try {
    const response = await fetch(`${WIKI}/w/api.php?${params}`, {
      signal: controller.signal,
      headers: wikimediaApiFetchHeaders('community-configuration'),
    })
    const data = (await response.json()) as { query?: { prefixsearch?: { title: string }[] } }
    menuItems.value = (data.query?.prefixsearch ?? []).map((page) => ({
      label: page.title,
      value: page.title,
    }))
  } catch (error) {
    if ((error as Error).name !== 'AbortError') menuItems.value = []
  }
}

function onInput(value: string): void {
  title.value = value
  if (value !== selection.value) selection.value = null
  clearTimeout(timer)
  if (!value) {
    controller?.abort()
    menuItems.value = []
    return
  }
  timer = setTimeout(() => void search(value), 300)
}

function onSelect(value: string | number | null): void {
  if (value === null) return
  title.value = String(value)
  inputValue.value = String(value)
}

onBeforeUnmount(() => {
  clearTimeout(timer)
  controller?.abort()
})
</script>

<template>
  <CdxLookup
    v-model:selected="selection"
    v-model:input-value="inputValue"
    :menu-items="menuItems"
    :menu-config="{ visibleItemLimit: 6 }"
    @input="onInput"
    @update:selected="onSelect"
  >
    <template #no-results>No results found.</template>
  </CdxLookup>
</template>
