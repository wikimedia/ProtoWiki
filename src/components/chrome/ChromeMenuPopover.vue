<script setup lang="ts">
import { ref, watch } from 'vue'

import { CdxIcon, CdxMenuButton } from '@wikimedia/codex'
import type { ButtonSize, MenuItemValue } from '@wikimedia/codex'
import { cdxIconMenu } from '@wikimedia/codex-icons'

interface Props {
  size?: ButtonSize
}

withDefaults(defineProps<Props>(), {
  size: 'medium',
})

const menuSelected = ref<MenuItemValue | null>(null)

const menuItems = [{ value: 'clear-local-storage', label: 'Clear local storage' }]

function clearLocalStorage(): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.clear()
  } catch {
    // Private mode or blocked storage — ignore.
  }

  window.location.reload()
}

watch(menuSelected, (value) => {
  if (value === 'clear-local-storage') {
    clearLocalStorage()
    menuSelected.value = null
  }
})
</script>

<template>
  <CdxMenuButton
    v-model:selected="menuSelected"
    class="prototype-chrome-menu-popover"
    :menu-items="menuItems"
    weight="quiet"
    :size="size"
    aria-label="Main menu"
  >
    <CdxIcon :icon="cdxIconMenu" />
  </CdxMenuButton>
</template>
