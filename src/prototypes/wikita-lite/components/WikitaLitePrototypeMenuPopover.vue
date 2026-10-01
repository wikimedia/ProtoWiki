<script setup lang="ts">
import { ref, watch } from 'vue'

import { CdxIcon, CdxMenuButton } from '@wikimedia/codex'
import type { ButtonSize, MenuItemValue } from '@wikimedia/codex'
import { cdxIconMenu } from '@wikimedia/codex-icons'

import { t } from '@/i18n'

import { resetWikitaLitePrototype } from '../data/resetWikitaLitePrototype'

interface Props {
  size?: ButtonSize
}

withDefaults(defineProps<Props>(), {
  size: 'medium',
})

const menuSelected = ref<MenuItemValue | null>(null)

const menuItems = [{ value: 'reset-everything', label: t('components.menuResetPrototype') }]

watch(menuSelected, (value) => {
  if (value === 'reset-everything') {
    resetWikitaLitePrototype()
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
    :aria-label="t('components.mainMenu')"
  >
    <CdxIcon :icon="cdxIconMenu" />
  </CdxMenuButton>
</template>
