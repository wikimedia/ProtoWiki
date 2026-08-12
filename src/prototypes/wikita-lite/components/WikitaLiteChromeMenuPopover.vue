<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { CdxIcon, CdxMenuButton } from '@wikimedia/codex'
import type { ButtonSize, MenuItemValue } from '@wikimedia/codex'
import { cdxIconCheck, cdxIconMenu } from '@wikimedia/codex-icons'

import { useWikitaLiteCardBordersSingleton } from '../composables/useWikitaLiteCardBorders'
import { useWikitaLiteCardRadiusSingleton } from '../composables/useWikitaLiteCardRadius'
import { useWikitaLiteModuleMenuModeSingleton } from '../composables/useWikitaLiteModuleMenuMode'

interface Props {
  size?: ButtonSize
}

withDefaults(defineProps<Props>(), {
  size: 'medium',
})

const { useLargeRadius, toggleLargeRadius } = useWikitaLiteCardRadiusSingleton()
const { hideCardBorders, toggleHideCardBorders } = useWikitaLiteCardBordersSingleton()
const { useModuleMenuMode, toggleModuleMenuMode } = useWikitaLiteModuleMenuModeSingleton()

const menuSelected = ref<MenuItemValue | null>(null)

const menuItems = computed(() => [
  {
    value: 'toggle-card-radius',
    label: '4px card radius',
    icon: useLargeRadius.value ? cdxIconCheck : undefined,
  },
  {
    value: 'toggle-hide-card-borders',
    label: 'Hide card borders',
    icon: hideCardBorders.value ? cdxIconCheck : undefined,
  },
  {
    value: 'toggle-module-menu-mode',
    label: 'Module overflow menus',
    icon: useModuleMenuMode.value ? cdxIconCheck : undefined,
  },
  { value: 'clear-local-storage', label: 'Clear local storage' },
])

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
  if (value === 'toggle-card-radius') {
    toggleLargeRadius()
    menuSelected.value = null
    return
  }

  if (value === 'toggle-hide-card-borders') {
    toggleHideCardBorders()
    menuSelected.value = null
    return
  }

  if (value === 'toggle-module-menu-mode') {
    toggleModuleMenuMode()
    menuSelected.value = null
    return
  }

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
