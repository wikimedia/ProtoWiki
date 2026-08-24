<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'

import {
  APP_BOTTOM_NAV_ITEM_META,
  DEFAULT_APP_BOTTOM_NAV_ITEMS,
  type AppBottomNavItem,
} from './appBottomNavItems'
import { globalTheme } from '@/theme'
import type { Theme } from '@/theme'

interface Props {
  /** Local theme override. Sets `data-theme` on the root. */
  theme?: Theme
  /** Subset/order of bottom nav items; default slot replaces the whole bar. */
  items?: AppBottomNavItem[]
  /** Item to highlight as the current screen. */
  activeItem?: AppBottomNavItem
}

const props = withDefaults(defineProps<Props>(), {
  theme: undefined,
  items: undefined,
  activeItem: undefined,
})

const emit = defineEmits<{
  navigate: [item: AppBottomNavItem]
}>()

const slots = useSlots()

const effectiveTheme = computed<Theme>(() => props.theme ?? globalTheme.value)
const effectiveItems = computed(() =>
  props.items?.length ? props.items : DEFAULT_APP_BOTTOM_NAV_ITEMS,
)

function onItemClick(item: AppBottomNavItem): void {
  emit('navigate', item)
}

function itemSlotName(item: AppBottomNavItem): string {
  return `item-${item}`
}

function hasItemSlot(item: AppBottomNavItem): boolean {
  return Boolean(slots[itemSlotName(item)])
}
</script>

<template>
  <nav
    v-if="!slots.default"
    class="app-bottom-menu"
    :data-theme="effectiveTheme"
    aria-label="Primary"
  >
    <CdxButton
      v-for="item in effectiveItems"
      :key="item"
      class="app-bottom-menu__item"
      :class="{ 'app-bottom-menu__item--active': item === props.activeItem }"
      weight="quiet"
      size="large"
      :aria-label="APP_BOTTOM_NAV_ITEM_META[item].ariaLabel"
      @click="onItemClick(item)"
    >
      <slot v-if="hasItemSlot(item)" :name="itemSlotName(item)" />
      <CdxIcon v-else :icon="APP_BOTTOM_NAV_ITEM_META[item].icon" />
    </CdxButton>
  </nav>
  <slot v-else />
</template>

<style scoped>
.app-bottom-menu {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  height: 84px;
  padding-inline: var(--spacing-150, 24px);
  border-top: 1px solid var(--border-color-subtle, #c8ccd1);
  background-color: var(--background-color-base, #fff);
}

.app-bottom-menu__item--active {
  color: var(--color-progressive, #36c);
}
</style>
