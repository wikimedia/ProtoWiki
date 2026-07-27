<script setup lang="ts">
import { computed, provide } from 'vue'

import type { AppBottomNavItem } from './appBottomNavItems'
import type { AppHeaderTool } from './appHeaderTools'
import AppBottomMenu from './AppBottomMenu.vue'
import AppChromeHeader from './AppChromeHeader.vue'
import { globalTheme, PROTOWIKI_CHROME_THEME } from '@/theme'
import type { Theme } from '@/theme'

interface Props {
  /**
   * BCP-47 language tag for the wrapped subtree. Sets `lang` on the root.
   * Inherited by descendants via the DOM.
   */
  lang?: string
  /** Writing direction for the wrapped subtree. Sets `dir` on the root. */
  dir?: 'ltr' | 'rtl'
  /** Local theme override. Sets `data-theme` on the wrapper root. */
  theme?: Theme
  /** When **`false`**, omit the default **`AppBottomMenu`**. */
  showBottomMenu?: boolean
  /** Forwarded to **`AppChromeHeader`**. */
  wordmarkSrc?: string
  /** Forwarded to **`AppChromeHeader`**. */
  headerTools?: AppHeaderTool[]
  /** Forwarded to **`AppBottomMenu`**. */
  bottomNavItems?: AppBottomNavItem[]
  /** Forwarded to **`AppBottomMenu`**. */
  activeNavItem?: AppBottomNavItem
}

const props = withDefaults(defineProps<Props>(), {
  lang: undefined,
  dir: undefined,
  theme: undefined,
  showBottomMenu: true,
  wordmarkSrc: undefined,
  headerTools: undefined,
  bottomNavItems: undefined,
  activeNavItem: undefined,
})

const emit = defineEmits<{
  toolClick: [tool: AppHeaderTool]
  'update:activeNavItem': [item: AppBottomNavItem]
  navigate: [item: AppBottomNavItem]
}>()

const effectiveTheme = computed<Theme>(() => props.theme ?? globalTheme.value)

provide(PROTOWIKI_CHROME_THEME, effectiveTheme)

function onToolClick(tool: AppHeaderTool): void {
  emit('toolClick', tool)
}

function onActiveNavItemUpdate(item: AppBottomNavItem): void {
  emit('update:activeNavItem', item)
}

function onNavigate(item: AppBottomNavItem): void {
  emit('navigate', item)
}
</script>

<template>
  <div
    class="app-chrome-wrapper"
    :data-theme="effectiveTheme"
    :lang="props.lang"
    :dir="props.dir"
  >
    <slot name="header">
      <AppChromeHeader
        :theme="effectiveTheme"
        :wordmark-src="props.wordmarkSrc"
        :header-tools="props.headerTools"
        @tool-click="onToolClick"
      />
    </slot>

    <main class="app-chrome-wrapper__content">
      <slot />
    </main>

    <slot name="bottomMenu">
      <AppBottomMenu
        v-if="props.showBottomMenu"
        :theme="effectiveTheme"
        :items="props.bottomNavItems"
        :active-item="props.activeNavItem"
        @update:active-item="onActiveNavItemUpdate"
        @navigate="onNavigate"
      />
    </slot>
  </div>
</template>

<style scoped>
.app-chrome-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background-color: var(--background-color-base, #fff);
  color: var(--color-base, #202122);
}

.app-chrome-wrapper__content {
  flex: 1 1 auto;
  width: 100%;
  overflow-y: auto;
  /* Match header horizontal inset (Figma topbar px 24px). */
  padding-inline: var(--spacing-150, 24px);
}
</style>
