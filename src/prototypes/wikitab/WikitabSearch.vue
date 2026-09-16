<script setup lang="ts">
import { useId, ref } from 'vue'
import { CdxMenu, CdxSearchInput } from '@wikimedia/codex'

import { useWikitabSearch, WIKITAB_SEARCH_FOR_VALUE } from './useWikitabSearch'

const {
  query,
  loading,
  selected,
  menuExpanded,
  menuItems,
  onInput,
  onFocus,
  onBlur,
} = useWikitabSearch()

const menuId = useId()
const menuRef = ref<InstanceType<typeof CdxMenu> | null>(null)

function onSubmitInert(): void {
  // Navigation deliberately omitted in this build.
}

function onItemClickInert(): void {
  // Navigation deliberately omitted in this build.
}

function onKeydown(event: KeyboardEvent): void {
  if (!menuRef.value || !query.value.trim().length) return
  // Match CdxTypeaheadSearch: space types in the input; it is not menu navigation.
  if (event.key === ' ') return
  menuRef.value.delegateKeyNavigation(event)
}
</script>

<template>
  <div class="wikitab-search" :class="{ 'wikitab-search--expanded': menuExpanded }">
    <CdxSearchInput
      :model-value="query"
      class="wikitab-search__input"
      :use-button="true"
      button-label="Search"
      placeholder="Search"
      role="combobox"
      autocomplete="off"
      aria-autocomplete="list"
      :aria-controls="menuExpanded ? menuId : undefined"
      :aria-expanded="menuExpanded"
      @update:model-value="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @submit-click="onSubmitInert"
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
          :show-pending="loading"
          :bold-label="true"
          render-in-place
          @menu-item-click="onItemClickInert"
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

.wikitab-search--expanded {
  /* Card inline links use z-index 2; sit above them when the menu overlaps sections. */
  z-index: 10;
}

.wikitab-search :deep(.cdx-search-input__input-wrapper) {
  position: relative;
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

.wikitab-search__menu {
  position: static;
  border: 0;
  box-shadow: none;
}

.wikitab-search__search-for {
  font-size: var(--font-size-medium);
  line-height: var(--line-height-small);
  color: var(--color-base);
}

.wikitab-search__search-for strong {
  font-weight: var(--font-weight-bold);
  white-space: pre-wrap;
}

.wikitab-search__menu :deep(.cdx-menu-item__content) {
  padding: var(--spacing-50) var(--spacing-75);
}

.wikitab-search__menu :deep(.cdx-thumbnail__placeholder),
.wikitab-search__menu :deep(.cdx-thumbnail__image) {
  width: 40px;
  min-width: 40px;
  height: 40px;
  min-height: 40px;
}
</style>
