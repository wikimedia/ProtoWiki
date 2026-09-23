<script setup lang="ts">
import { computed, useId, ref, toRef } from 'vue'
import { CdxMenu, CdxSearchInput } from '@wikimedia/codex'

import { globalTheme } from '@/theme'

import { useWikitabSearch, WIKITAB_SEARCH_FOR_VALUE } from './useWikitabSearch'

const props = defineProps<{
  initialQuery?: string
}>()

const initialQueryRef = toRef(() => props.initialQuery ?? '')

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
} = useWikitabSearch({ initialQuery: initialQueryRef })

const showMenuPending = computed(() => loading.value && results.value.length === 0)

const menuId = useId()
const menuRef = ref<InstanceType<typeof CdxMenu> | null>(null)

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
    class="wikitab-search"
    :class="{ 'wikitab-search--expanded': menuExpanded }"
    :data-theme="globalTheme"
  >
    <CdxSearchInput
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
          class="wikitab-search__menu"
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

.wikitab-search :deep(.cdx-search-input__input-wrapper) {
  position: relative;
}

.wikitab-search--expanded :deep(.cdx-search-input--has-end-button) {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.wikitab-search--expanded :deep(.cdx-text-input) {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.wikitab-search__panel {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 10;
  box-sizing: border-box;
  width: 100%;
  margin-top: -1px;
  background-color: var(--background-color-base);
  border: var(--border-width-base) solid var(--border-color-base);
  border-top: 0;
  border-radius: 0 0 var(--border-radius-base) var(--border-radius-base);
  box-shadow:
    0 4px 4px 0 var(--box-shadow-color-base, rgba(0, 0, 0, 0.06)),
    0 0 8px 0 var(--box-shadow-color-base, rgba(0, 0, 0, 0.06));
}

/* :deep() — CdxMenu root does not receive parent scope id. */
.wikitab-search :deep(.wikitab-search__menu) {
  position: static;
  border: 0;
  box-shadow: none;
}

.wikitab-search__search-for strong {
  white-space: pre-wrap;
}

.wikitab-search__menu :deep(.cdx-thumbnail__placeholder),
.wikitab-search__menu :deep(.cdx-thumbnail__image) {
  width: 40px;
  min-width: 40px;
  height: 40px;
  min-height: 40px;
}

.wikitab-search :deep(.cdx-text-input__input:enabled:focus) {
  border-color: var(
    --wikitab-theme-card-progressive,
    var(--border-color-progressive--focus, #36c)
  );
  box-shadow: inset 0 0 0 1px
    var(--wikitab-theme-card-progressive, var(--box-shadow-color-progressive--focus, #36c));
}

.wikitab-search :deep(.cdx-menu__progress-bar.cdx-progress-bar) {
  border-color: var(--wikitab-theme-card-progressive, var(--border-color-progressive, #36c));
}

.wikitab-search :deep(.cdx-menu__progress-bar .cdx-progress-bar__bar) {
  background-color: var(
    --wikitab-theme-card-progressive,
    var(--background-color-progressive, #36c)
  );
}

</style>
