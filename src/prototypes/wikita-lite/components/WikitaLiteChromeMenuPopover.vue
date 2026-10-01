<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { CdxIcon, CdxMenuButton } from '@wikimedia/codex'
import type { ButtonSize, MenuItemValue } from '@wikimedia/codex'
import { cdxIconCheck, cdxIconMenu } from '@wikimedia/codex-icons'

import { t } from '@/i18n'

import { useWikitaLiteCardBordersSingleton } from '../composables/useWikitaLiteCardBorders'
import { useWikitaLiteCardRadiusSingleton } from '../composables/useWikitaLiteCardRadius'
import { useWikitaLiteHideTabBarSingleton } from '../composables/useWikitaLiteHideTabBar'
import { useWikitaLiteModuleMenuModeSingleton } from '../composables/useWikitaLiteModuleMenuMode'
import { useWikitaLiteRoute } from '../composables/useWikitaLiteRoute'
import { resetWikitaLiteOnboarding } from '../onboarding/data/onboardingPersistence'
import { WIKITA_LITE_HOME } from '../routes'

interface Props {
  size?: ButtonSize
}

withDefaults(defineProps<Props>(), {
  size: 'medium',
})

const { useLargeRadius, toggleLargeRadius } = useWikitaLiteCardRadiusSingleton()
const { hideCardBorders, toggleHideCardBorders } = useWikitaLiteCardBordersSingleton()
const { hideTabBar, toggleHideTabBar } = useWikitaLiteHideTabBarSingleton()
const { useModuleMenuMode, toggleModuleMenuMode } = useWikitaLiteModuleMenuModeSingleton()
const { replaceRoute } = useWikitaLiteRoute()

const menuSelected = ref<MenuItemValue | null>(null)

const menuItems = computed(() => [
  {
    value: 'toggle-card-radius',
    label: t('components.menuCardRadius'),
    icon: useLargeRadius.value ? cdxIconCheck : undefined,
  },
  {
    value: 'toggle-hide-card-borders',
    label: t('components.menuHideCardBorders'),
    icon: hideCardBorders.value ? cdxIconCheck : undefined,
  },
  {
    value: 'toggle-module-menu-mode',
    label: t('components.menuModuleOverflowMenus'),
    icon: useModuleMenuMode.value ? cdxIconCheck : undefined,
  },
  {
    value: 'toggle-hide-tab-bar',
    label: t('components.menuHideTabBar'),
    icon: hideTabBar.value ? cdxIconCheck : undefined,
  },
  { value: 'reset-onboarding', label: t('components.menuResetOnboarding') },
  { value: 'reset-url-state', label: t('components.menuResetUrlState') },
])

async function resetUrlState(): Promise<void> {
  resetWikitaLiteOnboarding()
  await replaceRoute(WIKITA_LITE_HOME)
  window.location.assign(`${import.meta.env.BASE_URL}wikita-lite`)
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

  if (value === 'toggle-hide-tab-bar') {
    toggleHideTabBar()
    menuSelected.value = null
    return
  }

  if (value === 'reset-onboarding' || value === 'reset-url-state') {
    void resetUrlState()
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
