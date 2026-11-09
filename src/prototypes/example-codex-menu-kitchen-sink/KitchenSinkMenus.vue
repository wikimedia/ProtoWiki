<script setup lang="ts">
import { ref } from 'vue'
import {
  CdxField,
  CdxIcon,
  CdxLookup,
  CdxMenuButton,
  CdxMultiselectLookup,
  CdxSelect,
} from '@wikimedia/codex'
import { cdxIconEllipsis } from '@wikimedia/codex-icons'

import { wikimediaApiFetchHeaders, wikiHostFromLang } from '@/config'

import PageTypeaheadSearch from './PageTypeaheadSearch.vue'
import {
  CHIP_SUGGESTIONS,
  MENU_ITEMS,
  MENU_ITEMS_WITH_DESCRIPTIONS,
  MENU_ITEMS_WITH_ICONS,
  MENU_ITEMS_WITH_ICONS_AND_DESCRIPTIONS,
  SELECT_MENU_ITEMS,
} from './fixtures'

const menuSelected = ref<string | null>(null)
const iconMenuSelected = ref<string | null>(null)
const menuWithIconsSelected = ref<string | null>(null)
const menuWithIconsIconSelected = ref<string | null>(null)
const menuWithDescriptionsSelected = ref<string | null>(null)
const menuWithDescriptionsIconSelected = ref<string | null>(null)
const menuWithIconsAndDescriptionsSelected = ref<string | null>(null)
const menuWithIconsAndDescriptionsIconSelected = ref<string | null>(null)

const project = ref('one')

const lookupSelected = ref<string | null>(null)
const lookupInput = ref('')
const lookupMenuItems = ref<Array<{ value: string; label: string }>>([])

const tagSelected = ref<string[]>([])
const tagInputChips = ref<Array<{ value: string }>>([])
const tagInputValue = ref('')

let userLookupAbort: AbortController | null = null
let userLookupDebounce: ReturnType<typeof setTimeout> | undefined

async function fetchUserSuggestions(query: string, signal: AbortSignal): Promise<void> {
  const trimmed = query.trim()
  if (!trimmed.length) {
    lookupMenuItems.value = []
    return
  }

  const host = wikiHostFromLang('en')
  const params = new URLSearchParams({
    action: 'query',
    list: 'allusers',
    auprefix: trimmed,
    aulimit: '8',
    format: 'json',
    origin: '*',
  })

  const response = await fetch(`https://${host}/w/api.php?${params.toString()}`, {
    signal,
    headers: wikimediaApiFetchHeaders('codex-playground-user-lookup'),
  })

  if (!response.ok) {
    lookupMenuItems.value = []
    return
  }

  const data = (await response.json()) as {
    query?: { allusers?: Array<{ name: string }> }
  }
  const names = data.query?.allusers ?? []
  lookupMenuItems.value = names.map(({ name }) => ({ value: name, label: name }))
}

function onLookupInput(value: string): void {
  lookupInput.value = value
  if (userLookupDebounce) clearTimeout(userLookupDebounce)
  userLookupAbort?.abort()
  userLookupAbort = new AbortController()

  userLookupDebounce = setTimeout(() => {
    void fetchUserSuggestions(value, userLookupAbort!.signal).catch(() => {
      if (!userLookupAbort?.signal.aborted) lookupMenuItems.value = []
    })
  }, 200)
}
</script>

<template>
  <div class="kitchen-sink-menus">
    <CdxField class="kitchen-sink-menus__field">
      <template #label>Menu</template>
      <div class="kitchen-sink-menus__menu-buttons">
        <CdxMenuButton
          v-model:selected="menuSelected"
          action="default"
          weight="normal"
          :menu-items="MENU_ITEMS"
        >
          Menu
        </CdxMenuButton>
        <CdxMenuButton
          v-model:selected="iconMenuSelected"
          action="default"
          weight="normal"
          :menu-items="MENU_ITEMS"
          aria-label="Open menu"
        >
          <CdxIcon :icon="cdxIconEllipsis" />
        </CdxMenuButton>
      </div>
    </CdxField>

    <CdxField class="kitchen-sink-menus__field">
      <template #label>Menu with icons</template>
      <div class="kitchen-sink-menus__menu-buttons">
        <CdxMenuButton
          v-model:selected="menuWithIconsSelected"
          action="default"
          weight="normal"
          :menu-items="MENU_ITEMS_WITH_ICONS"
        >
          Menu
        </CdxMenuButton>
        <CdxMenuButton
          v-model:selected="menuWithIconsIconSelected"
          action="default"
          weight="normal"
          :menu-items="MENU_ITEMS_WITH_ICONS"
          aria-label="Open menu"
        >
          <CdxIcon :icon="cdxIconEllipsis" />
        </CdxMenuButton>
      </div>
    </CdxField>

    <CdxField class="kitchen-sink-menus__field">
      <template #label>Menu with descriptions</template>
      <div class="kitchen-sink-menus__menu-buttons">
        <CdxMenuButton
          v-model:selected="menuWithDescriptionsSelected"
          action="default"
          weight="normal"
          :menu-items="MENU_ITEMS_WITH_DESCRIPTIONS"
        >
          Menu
        </CdxMenuButton>
        <CdxMenuButton
          v-model:selected="menuWithDescriptionsIconSelected"
          action="default"
          weight="normal"
          :menu-items="MENU_ITEMS_WITH_DESCRIPTIONS"
          aria-label="Open menu"
        >
          <CdxIcon :icon="cdxIconEllipsis" />
        </CdxMenuButton>
      </div>
    </CdxField>

    <CdxField class="kitchen-sink-menus__field">
      <template #label>Menu with icons and descriptions</template>
      <div class="kitchen-sink-menus__menu-buttons">
        <CdxMenuButton
          v-model:selected="menuWithIconsAndDescriptionsSelected"
          action="default"
          weight="normal"
          :menu-items="MENU_ITEMS_WITH_ICONS_AND_DESCRIPTIONS"
        >
          Menu
        </CdxMenuButton>
        <CdxMenuButton
          v-model:selected="menuWithIconsAndDescriptionsIconSelected"
          action="default"
          weight="normal"
          :menu-items="MENU_ITEMS_WITH_ICONS_AND_DESCRIPTIONS"
          aria-label="Open menu"
        >
          <CdxIcon :icon="cdxIconEllipsis" />
        </CdxMenuButton>
      </div>
    </CdxField>

    <CdxField class="kitchen-sink-menus__field">
      <template #label>Typeahead search</template>
      <template #description>Search for a page</template>
      <PageTypeaheadSearch
        input-id="codex-playground-page-search-compact"
        lang="en"
        placeholder="Search…"
      />
    </CdxField>

    <CdxField class="kitchen-sink-menus__field">
      <template #label>Typeahead search with thumbnails</template>
      <template #description>Search for a page</template>
      <PageTypeaheadSearch
        input-id="codex-playground-page-search-thumbs"
        lang="en"
        show-thumbnail
        placeholder="Search…"
      />
    </CdxField>

    <CdxField class="kitchen-sink-menus__field">
      <template #label>Select</template>
      <CdxSelect
        v-model:selected="project"
        :menu-items="SELECT_MENU_ITEMS"
        default-label="Choose one"
      />
    </CdxField>

    <CdxField class="kitchen-sink-menus__field">
      <template #label>Lookup</template>
      <template #description>Search for a user</template>
      <CdxLookup
        v-model:selected="lookupSelected"
        v-model:input-value="lookupInput"
        :menu-items="lookupMenuItems"
        @input="onLookupInput"
      />
    </CdxField>

    <CdxField class="kitchen-sink-menus__field">
      <template #label>Multiselect lookup</template>
      <CdxMultiselectLookup
        v-model:selected="tagSelected"
        v-model:input-chips="tagInputChips"
        v-model:input-value="tagInputValue"
        :menu-items="CHIP_SUGGESTIONS"
      />
    </CdxField>
  </div>
</template>

<style scoped>
.kitchen-sink-menus {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-100);
}

.kitchen-sink-menus :deep(.cdx-field) {
  margin: 0;
  width: auto;
  max-width: 100%;
}

.kitchen-sink-menus__menu-buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-50);
}

</style>
