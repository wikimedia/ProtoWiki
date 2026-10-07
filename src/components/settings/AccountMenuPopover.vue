<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { CdxMenu, type MenuItemData, type MenuItemValue } from '@wikimedia/codex'
import { cdxIconLogIn, cdxIconUserAvatar } from '@wikimedia/codex-icons'

const emit = defineEmits<{ 'create-account': [] }>()

const root = ref<HTMLElement | null>(null)
const open = ref(false)
// Throwaway selection: this menu triggers actions, it doesn't hold a value.
const selected = ref<MenuItemValue | null>(null)

const menuItems: MenuItemData[] = [
  { value: 'create-account', label: 'Create account', icon: cdxIconUserAvatar },
  { value: 'log-in', label: 'Log in', icon: cdxIconLogIn },
]

function toggle(): void {
  open.value = !open.value
}

function onSelect(value: MenuItemValue | MenuItemValue[] | null): void {
  open.value = false
  selected.value = null
  if (value === 'create-account') {
    emit('create-account')
  }
  // 'log-in' is a placeholder for now — selecting it just closes the menu.
}

// CdxMenu on its own doesn't close on an outside click (CdxPopover used to);
// close it when a pointer press lands outside the wrapper.
function onDocumentPointerDown(event: MouseEvent): void {
  if (!open.value) return
  if (root.value && !root.value.contains(event.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', onDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentPointerDown))
</script>

<template>
  <div ref="root" class="account-menu-popover">
    <span class="account-menu-popover__trigger">
      <slot :open="open" :toggle="toggle" />
    </span>
    <Transition name="account-menu">
      <div v-if="open" class="account-menu-popover__menu">
        <CdxMenu
          v-model:selected="selected"
          :expanded="true"
          :menu-items="menuItems"
          @update:selected="onSelect"
        />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.account-menu-popover {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

.account-menu-popover__trigger {
  display: inline-flex;
}

/* The wrapper is the positioned + animated element (right-aligned under the
   trigger). CdxMenu renders in-flow inside it (position: static) so the
   open/close transform moves the whole panel as one, and the Transition classes
   land on this scoped element rather than the CdxMenu root (which doesn't carry
   this component's scoped attribute). */
.account-menu-popover__menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 100;
  margin-top: var(--spacing-25, 4px);
}

.account-menu-popover__menu :deep(.cdx-menu) {
  position: static;
  min-width: 14rem;
}

/* Match account-creation-v3: subtle grey item icons + labels. */
.account-menu-popover__menu :deep(.cdx-menu-item),
.account-menu-popover__menu :deep(.cdx-menu-item__text__label),
.account-menu-popover__menu :deep(.cdx-menu-item__icon),
.account-menu-popover__menu :deep(.cdx-menu-item .cdx-icon) {
  color: var(--color-subtle, #54595d);
}

/* Bold labels, matching account-creation-v3. */
.account-menu-popover__menu :deep(.cdx-menu-item__text__label) {
  font-weight: var(--font-weight-bold, 700);
}

/* Open/close animation ported from account-creation-v3's UserAccountMenu. */
.account-menu-enter-active,
.account-menu-leave-active {
  transition:
    opacity 150ms,
    transform 150ms;
}

.account-menu-enter-from,
.account-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
