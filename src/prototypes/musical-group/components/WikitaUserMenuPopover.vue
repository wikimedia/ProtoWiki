<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

import { CdxButton, CdxIcon, CdxPopover, CdxSelect } from '@wikimedia/codex'
import type { MenuItemValue } from '@wikimedia/codex'
import { cdxIconUserAvatar, cdxIconUserAvatarOutline } from '@wikimedia/codex-icons'

import {
  WIKITA_CHROME_HEADER_VARIANT_MENU_ITEMS,
  type WikitaChromeHeaderVariant,
} from '../data/headerVariantPreference'
import {
  WIKITA_UI_SKIN_MENU_ITEMS,
  type WikitaUiSkin,
} from '../data/wikitaUiSkinPreference'
import { headerVariantMenuItemStyle } from '../data/wikitaChromeHeaderVariants'

interface Props {
  showHeaderColor?: boolean
  minervaStyle?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showHeaderColor: true,
  minervaStyle: false,
})

const variant = defineModel<WikitaChromeHeaderVariant>('variant', { default: 'black' })
const uiSkin = defineModel<WikitaUiSkin>('uiSkin', { default: 'wikita' })
const previewVariant = defineModel<WikitaChromeHeaderVariant | null>('previewVariant', {
  default: null,
})

const userMenuOpen = ref(false)
const userMenuAnchor = ref<HTMLElement | null>(null)
const userPanelRef = ref<HTMLElement | null>(null)

let activeDescendantObserver: MutationObserver | null = null

function toggleUserMenu(): void {
  userMenuOpen.value = !userMenuOpen.value
}

function clearVariantPreview(): void {
  previewVariant.value = null
}

function variantFromMenuOption(option: Element): WikitaChromeHeaderVariant | null {
  const listbox = option.closest('[role="listbox"]')
  if (!listbox?.closest('.wikita-user-menu__variant-select')) return null

  const options = Array.from(listbox.querySelectorAll('[role="option"]'))
  const index = options.indexOf(option as HTMLElement)
  if (index < 0) return null

  return WIKITA_CHROME_HEADER_VARIANT_MENU_ITEMS[index]?.value ?? null
}

function setVariantPreviewFromOption(option: Element | null): void {
  if (!option) return

  const value = variantFromMenuOption(option)
  if (value) previewVariant.value = value
}

function syncPreviewFromActiveDescendant(): void {
  const handle = userPanelRef.value?.querySelector(
    '.wikita-user-menu__variant-select .cdx-select-vue__handle',
  )
  if (!handle) return

  if (handle.getAttribute('aria-expanded') !== 'true') {
    clearVariantPreview()
    return
  }

  const id = handle.getAttribute('aria-activedescendant')
  if (!id) return

  setVariantPreviewFromOption(document.getElementById(id))
}

function onVariantMenuPointerOver(event: PointerEvent): void {
  const option = (event.target as HTMLElement).closest('[role="option"]')
  if (!option?.closest('.wikita-user-menu__variant-select')) return
  setVariantPreviewFromOption(option)
}

function stopActiveDescendantObserver(): void {
  activeDescendantObserver?.disconnect()
  activeDescendantObserver = null
}

function startActiveDescendantObserver(): void {
  stopActiveDescendantObserver()

  const handle = userPanelRef.value?.querySelector(
    '.wikita-user-menu__variant-select .cdx-select-vue__handle',
  )
  if (!handle) return

  activeDescendantObserver = new MutationObserver(syncPreviewFromActiveDescendant)
  activeDescendantObserver.observe(handle, {
    attributes: true,
    attributeFilter: ['aria-activedescendant', 'aria-expanded'],
  })
}

function getVariantMenuItemStyles(value: MenuItemValue) {
  return headerVariantMenuItemStyle(value as WikitaChromeHeaderVariant)
}

watch(userMenuOpen, async (open) => {
  if (!open) {
    clearVariantPreview()
    stopActiveDescendantObserver()
    return
  }

  await nextTick()
  startActiveDescendantObserver()
})

watch(variant, () => {
  clearVariantPreview()
})

onBeforeUnmount(() => {
  stopActiveDescendantObserver()
})
</script>

<template>
  <span
    ref="userMenuAnchor"
    class="wikita-user-menu"
    :class="{
      'wikita-user-menu--minerva': minervaStyle,
      'prototype-user-settings-popover': minervaStyle,
    }"
  >
    <span
      class="wikita-user-menu__trigger"
      :class="{ 'prototype-user-settings-popover__trigger': minervaStyle }"
    >
      <CdxButton
        :class="{ 'chrome-header__mobile-user-btn': minervaStyle }"
        weight="quiet"
        :size="minervaStyle ? 'large' : undefined"
        aria-label="User menu"
        :aria-expanded="userMenuOpen"
        @click="toggleUserMenu"
      >
        <CdxIcon
          :icon="minervaStyle ? cdxIconUserAvatarOutline : cdxIconUserAvatar"
          :size="minervaStyle ? 'medium' : undefined"
        />
      </CdxButton>
    </span>
    <CdxPopover
      v-model:open="userMenuOpen"
      :anchor="userMenuAnchor"
      placement="bottom-end"
      class="wikita-user-menu__popover"
      :class="{ 'prototype-user-settings-popover__overlay': minervaStyle }"
    >
      <div
        ref="userPanelRef"
        class="wikita-user-menu__panel"
        @click.stop
        @pointerover="onVariantMenuPointerOver"
      >
        <label class="wikita-user-menu__field">
          <span class="wikita-user-menu__label">Interface</span>
          <CdxSelect
            v-model:selected="uiSkin"
            :menu-items="WIKITA_UI_SKIN_MENU_ITEMS"
            default-label="Wikita"
          />
        </label>
        <label v-if="showHeaderColor" class="wikita-user-menu__field">
          <span class="wikita-user-menu__label">Header color</span>
          <CdxSelect
            v-model:selected="variant"
            class="wikita-user-menu__variant-select"
            :menu-items="WIKITA_CHROME_HEADER_VARIANT_MENU_ITEMS"
            default-label="Black"
          >
            <template #menu-item="{ menuItem }">
              <span
                class="wikita-header-variant-option"
                :class="{
                  'wikita-header-variant-option--light-hover':
                    getVariantMenuItemStyles(menuItem.value).lightHover,
                }"
                :style="getVariantMenuItemStyles(menuItem.value).style"
              >
                {{ menuItem.label }}
              </span>
            </template>
          </CdxSelect>
        </label>
      </div>
    </CdxPopover>
  </span>
</template>

<style scoped>
.wikita-user-menu {
  display: inline-flex;
  flex-shrink: 0;
}

.wikita-user-menu--minerva {
  width: var(--size-icon-large, 40px);
}

.wikita-user-menu__trigger {
  display: inline-flex;
}

.wikita-user-menu__panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  min-width: 14rem;
}

.wikita-user-menu__field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
}

.wikita-user-menu__label {
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  color: var(--color-subtle);
}
</style>

<style>
.wikita-user-menu__popover .cdx-popover__body {
  overflow: visible;
}

.wikita-user-menu__variant-select .cdx-menu-item:has(.wikita-header-variant-option) {
  padding: 0;
  background: transparent;
}

.wikita-user-menu__variant-select
  .cdx-menu-item:has(.wikita-header-variant-option)
  .cdx-menu-item__content {
  padding: 0;
}

.wikita-user-menu__variant-select
  .cdx-menu-item--highlighted:has(.wikita-header-variant-option),
.wikita-user-menu__variant-select
  .cdx-menu-item:has(.wikita-header-variant-option):hover {
  background: transparent;
}

.wikita-user-menu__variant-select
  .cdx-menu-item--highlighted
  .wikita-header-variant-option,
.wikita-user-menu__variant-select
  .cdx-menu-item:hover
  .wikita-header-variant-option {
  box-shadow: inset 0 0 0 9999px rgba(255, 255, 255, 0.12);
}

.wikita-user-menu__variant-select
  .cdx-menu-item--highlighted
  .wikita-header-variant-option--light-hover,
.wikita-user-menu__variant-select
  .cdx-menu-item:hover
  .wikita-header-variant-option--light-hover {
  box-shadow: inset 0 0 0 9999px rgba(0, 0, 0, 0.08);
}

.wikita-user-menu__variant-select
  .cdx-menu-item--selected:has(.wikita-header-variant-option) {
  background: transparent;
}

.wikita-header-variant-option {
  display: block;
  box-sizing: border-box;
  width: 100%;
  padding: var(--spacing-75) var(--spacing-100);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
}
</style>
