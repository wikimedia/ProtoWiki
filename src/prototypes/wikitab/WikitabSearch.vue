<script setup lang="ts">
import { computed, nextTick, onMounted, useId, ref, toRef } from 'vue'
import { CdxMenu, CdxSearchInput } from '@wikimedia/codex'
import '@wikimedia/codex/dist/modules/CdxTypeaheadSearch.css'

import { globalTheme } from '@/theme'

import { useWikitabSearch, WIKITAB_SEARCH_FOR_VALUE } from './useWikitabSearch'

const props = defineProps<{
  initialQuery?: string
  searchMode?: boolean
}>()

const initialQueryRef = toRef(() => props.initialQuery ?? '')
const searchModeRef = toRef(() => props.searchMode ?? false)

const {
  query,
  results,
  loading,
  selected,
  menuExpanded,
  menuItems,
  onInput,
  onFocus,
  onBlur,
  onSubmit,
  onMenuItemClick,
  onEnterWithMenu,
} = useWikitabSearch({ initialQuery: initialQueryRef, searchMode: searchModeRef })

const showMenuPending = computed(() => loading.value && results.value.length === 0)

const menuId = useId()
const menuRef = ref<InstanceType<typeof CdxMenu> | null>(null)
const searchInputRef = ref<InstanceType<typeof CdxSearchInput> | null>(null)

onMounted(() => {
  if (searchModeRef.value) return
  void nextTick(() => {
    searchInputRef.value?.focus()
  })
})

type MenuWithHighlight = InstanceType<typeof CdxMenu> & {
  getHighlightedMenuItem?: () => { value: string | number } | null
}

function onKeydown(event: KeyboardEvent): void {
  if (!query.value.trim().length) return

  // Match CdxTypeaheadSearch: space types in the input; it is not menu navigation.
  if (event.key === ' ') return

  if (event.key === 'Enter' && menuExpanded.value && menuRef.value) {
    event.preventDefault()
    const highlighted =
      (menuRef.value as MenuWithHighlight).getHighlightedMenuItem?.() ?? null
    onEnterWithMenu(highlighted)
    return
  }

  if (!menuRef.value) return
  menuRef.value.delegateKeyNavigation(event)
}
</script>

<template>
  <div
    class="wikitab-search cdx-typeahead-search"
    :class="{
      'wikitab-search--expanded': menuExpanded,
      'cdx-typeahead-search--expanded': menuExpanded,
    }"
    :data-theme="globalTheme"
  >
    <CdxSearchInput
      ref="searchInputRef"
      :model-value="query"
      class="wikitab-search__input"
      :use-button="true"
      button-label="Search"
      role="combobox"
      autocomplete="off"
      aria-autocomplete="list"
      :aria-controls="menuExpanded ? menuId : undefined"
      :aria-expanded="menuExpanded"
      @update:model-value="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @submit-click="onSubmit"
      @keydown="onKeydown"
    >
      <div v-show="menuExpanded" class="wikitab-search__panel">
        <CdxMenu
          :id="menuId"
          ref="menuRef"
          v-model:expanded="menuExpanded"
          v-model:selected="selected"
          class="wikitab-search__menu cdx-typeahead-search__menu"
          :menu-items="menuItems"
          :show-thumbnail="true"
          :show-pending="showMenuPending"
          :bold-label="true"
          render-in-place
          @menu-item-click="onMenuItemClick"
        >
          <template #default="{ menuItem }">
            <span
              v-if="menuItem.value === WIKITAB_SEARCH_FOR_VALUE"
              class="cdx-menu-item__content wikitab-search__search-for"
            >
              Search for<strong>&nbsp;"{{ query }}"</strong>
            </span>
          </template>
        </CdxMenu>
      </div>
    </CdxSearchInput>
  </div>
</template>

<style scoped>
.wikitab-search {
  position: relative;
  width: 100%;
}

/*
 * data-theme on this root re-applies Codex light/dark tokens here so page-theme
 * custom properties from .wikitab (tinted subtle, etc.) do not leak into the
 * white search island. See protowiki-theme.
 *
 * Theme accent (--wikitab-theme-card-progressive, inherited from .wikitab) applies
 * only to the focus ring and menu loading bar — not icons, menu text, or button.
 */

.wikitab-search--expanded {
  /* Card inline links use z-index 2; sit above them when the menu overlaps sections. */
  z-index: 10;
}

/*
 * Panel slot lives in .cdx-search-input__input-wrapper (Codex default position:
 * relative). Match CdxTypeaheadSearch — menu width = input only, not the end
 * button.
 */
.wikitab-search__panel {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 10;
  box-sizing: border-box;
  width: 100%;
}

.wikitab-search--expanded :deep(.wikitab-search__input.cdx-search-input .cdx-text-input) {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

/* Stock Codex — panel draws the dropdown frame; strip duplicate menu chrome. */
:global(html:not([data-codex-patched])) .wikitab-search__panel {
  background-color: var(--background-color-base);
  border: var(--border-width-base) solid var(--border-color-base);
  border-radius: 0 0 var(--border-radius-base) var(--border-radius-base);
}

:global(html:not([data-codex-patched])) .wikitab-search :deep(.wikitab-search__menu) {
  border: 0;
  box-shadow: none;
}

/* Patched Codex — typeahead menu outline + bottom radius; panel is positioning only. */
:global(html[data-codex-patched]) .wikitab-search__panel {
  background-color: transparent;
}

:global(html[data-codex-patched]) .wikitab-search :deep(.wikitab-search__menu.cdx-menu) {
  border-bottom-left-radius: var(--border-radius-base);
  border-bottom-right-radius: var(--border-radius-base);
}

.wikitab-search :deep(.wikitab-search__menu) {
  position: static;
}

.wikitab-search__search-for strong {
  white-space: pre-wrap;
}

/*
 * Menu thumb size — see wikitab-surface.css (scoped rules do not reach CdxMenu).
 */

/*
 * Remap tokens (not the focus box-shadow itself) so Codex keeps owning the
 * ring's shape. Scoped to children of the data-theme root, and only on themes
 * that set --wikitab-theme-card-progressive — a self-referencing fallback
 * would be a custom-property cycle.
 *
 * data-theme on .wikitab-search re-applies stock Codex light/dark tokens, so
 * menu-item hover would stay default blue without remapping progressive tokens
 * onto the typeahead menu. Stock Codex paints a grey wash via
 * --background-color-interactive-subtle--hover on --highlighted rows; the patch
 * drops that and tints label text progressive instead — do not add a bg under
 * html[data-codex-patched].
 */
:global(.wikitab--remaps-card-progressive .wikitab-search .cdx-text-input),
:global(.wikitab--remaps-card-progressive .wikitab-search .cdx-menu__progress-bar),
:global(.wikitab--remaps-card-progressive .wikitab-search .wikitab-search__menu) {
  --border-color-progressive--focus: var(--wikitab-theme-card-progressive);
  --box-shadow-color-progressive--focus: var(--wikitab-theme-card-progressive);
  --border-color-progressive: var(--wikitab-theme-card-progressive);
  --background-color-progressive: var(--wikitab-theme-card-progressive);
  --color-progressive: var(--wikitab-theme-card-progressive);
  --color-progressive--hover: var(--wikitab-theme-card-progressive--hover);
  --color-progressive--active: var(--wikitab-theme-card-progressive--active);
  --background-color-progressive-subtle: var(--wikitab-theme-card-progressive-subtle);
  --background-color-progressive-subtle--hover: var(
    --wikitab-theme-card-progressive-subtle--hover
  );
  --background-color-progressive-subtle--active: var(
    --wikitab-theme-card-progressive-subtle--active
  );
}

/* Stock CdxMenuItem --highlighted already sets background-color — theme the token. */
:global(
    html:not([data-codex-patched])
      .wikitab--remaps-card-progressive
      .wikitab-search
      .wikitab-search__menu
  ) {
  --background-color-interactive-subtle--hover: var(
    --wikitab-theme-card-progressive-subtle--hover
  );
}

</style>
