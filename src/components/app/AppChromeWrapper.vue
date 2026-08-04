<script setup lang="ts">
import { computed, provide } from 'vue'

import type { AppBottomNavItem } from './appBottomNavItems'
import type { AppHeaderItem } from './AppChromeHeader.vue'
import AppBottomMenu from './AppBottomMenu.vue'
import AppChromeHeader from './AppChromeHeader.vue'
import MobileWrapper from '@/components/MobileWrapper.vue'
import { globalTheme, PROTOWIKI_CHROME_THEME } from '@/theme'
import type { Theme } from '@/theme'

interface Props {
  lang?: string
  dir?: 'ltr' | 'rtl'
  theme?: Theme
  showBottomMenu?: boolean
  left?: AppHeaderItem[]
  middle?: AppHeaderItem[]
  right?: AppHeaderItem[]
  bottomNavItems?: AppBottomNavItem[]
}

const props = withDefaults(defineProps<Props>(), {
  lang: undefined,
  dir: undefined,
  theme: undefined,
  showBottomMenu: true,
  left: undefined,
  middle: undefined,
  right: undefined,
  bottomNavItems: undefined,
})

const emit = defineEmits<{
  navigate: [item: AppBottomNavItem]
}>()

const effectiveTheme = computed<Theme>(() => props.theme ?? globalTheme.value)

provide(PROTOWIKI_CHROME_THEME, effectiveTheme)

function onNavigate(item: AppBottomNavItem): void {
  emit('navigate', item)
}
</script>

<template>
  <MobileWrapper :lang="props.lang" :dir="props.dir">
    <div class="app-chrome-wrapper" :data-theme="effectiveTheme">
      <slot name="header">
        <AppChromeHeader
          :theme="effectiveTheme"
          :left="props.left"
          :middle="props.middle"
          :right="props.right"
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
          @navigate="onNavigate"
        />
      </slot>
    </div>
  </MobileWrapper>
</template>

<style scoped>
.app-chrome-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  background-color: var(--background-color-base, #fff);
  color: var(--color-base, #202122);
}

.app-chrome-wrapper__content {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  overflow-y: auto;
  padding-inline: var(--spacing-150, 24px);
}
</style>
