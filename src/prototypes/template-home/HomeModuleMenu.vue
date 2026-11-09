<script setup lang="ts">
/**
 * A module's "…" menu, beside its heading: the module's actions, and "About …"
 * as the footer. Each pick is emitted as `select`, for the module to act on.
 *
 * CODEX+ CdxMenuButton: no placement prop (it's fixed to `bottom-start`, which
 * flips to `bottom-end` near the window's edge). The button sits at the end of
 * the heading, so every module's menu opens `bottom-end` — its right edge on the
 * button's. Codex's own MenuButton, rebuilt from its parts with that placement
 * (and its classes, so Codex's menu-button CSS still applies).
 */
import { ref, useId, watch } from 'vue'
import { CdxButton, CdxIcon, CdxMenu, useFloatingMenu } from '@wikimedia/codex'
import type { MenuButtonItemData, MenuItemValue } from '@wikimedia/codex'
import { cdxIconEllipsis } from '@wikimedia/codex-icons'

defineProps<{
  menu: {
    items: readonly MenuButtonItemData[]
    footer: MenuButtonItemData
  }
}>()

const emit = defineEmits<{ select: [value: MenuItemValue] }>()

const button = ref<InstanceType<typeof CdxButton> | null>(null)
const menuRef = ref<InstanceType<typeof CdxMenu> | null>(null)
const expanded = ref(false)
const buttonId = useId()
const menuId = useId()

useFloatingMenu(button, menuRef, { useAvailableWidth: true, placement: 'bottom-end', offset: 4 })

// A pick is passed on and closes the menu; clear it so no row stays selected.
const selected = ref<MenuItemValue | null>(null)
watch(selected, (value) => {
  if (value === null) return
  emit('select', value)
  selected.value = null
})

// As CdxMenuButton: Enter toggles (or picks a keyboard-highlighted row); the rest goes to the menu.
let keyboardActionHandled = false

function onKeydown(event: KeyboardEvent): void {
  if (!menuRef.value || event.key === ' ') return
  if (event.key === 'Enter') {
    const highlighted = menuRef.value.getHighlightedMenuItem()
    if (expanded.value && highlighted && menuRef.value.getHighlightedViaKeyboard()) {
      menuRef.value.delegateKeyNavigation(event)
    } else {
      event.preventDefault()
      expanded.value = !expanded.value
    }
    keyboardActionHandled = true
    return
  }
  menuRef.value.delegateKeyNavigation(event)
}

function onClick(): void {
  if (keyboardActionHandled) {
    keyboardActionHandled = false
    return
  }
  expanded.value = !expanded.value
}
</script>

<template>
  <div class="cdx-menu-button home-module-menu">
    <CdxButton
      :id="buttonId"
      ref="button"
      weight="quiet"
      aria-label="Module actions"
      aria-haspopup="menu"
      :aria-controls="menuId"
      :aria-expanded="expanded"
      @click="onClick"
      @blur="expanded = false"
      @keydown="onKeydown"
    >
      <CdxIcon :icon="cdxIconEllipsis" />
    </CdxButton>
    <div class="cdx-menu-button__menu-wrapper">
      <CdxMenu
        :id="menuId"
        ref="menuRef"
        v-model:selected="selected"
        v-model:expanded="expanded"
        class="cdx-menu-button__menu"
        :menu-items="[...menu.items]"
        :footer="menu.footer"
        role="menu"
        :aria-labelledby="buttonId"
      />
    </div>
  </div>
</template>

<style scoped>
/* CODEX+ CdxMenuButton: an inline-block root adds a line box's descender under the 32px button. */
.home-module-menu {
  display: flex;
}

/*
 * CODEX+ CdxMenu: it reserves the footer's height (as the list's bottom margin)
 * when it opens, before the floating menu gets its width — so at its 8rem
 * minimum the footer label wraps, and the reserved space is too tall. On one
 * line, the footer measures the same at any width.
 */
.home-module-menu :deep(.cdx-menu--has-footer .cdx-menu-item:last-of-type .cdx-menu-item__text) {
  white-space: nowrap;
}
</style>
