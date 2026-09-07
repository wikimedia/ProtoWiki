<script setup lang="ts">
import { computed, provide } from 'vue'

import { globalSkin, globalTheme, PROTOWIKI_CHROME_SKIN, PROTOWIKI_CHROME_THEME } from '@/theme'
import type { Skin, Theme } from '@/theme'

interface Props {
  lang?: string
  dir?: 'ltr' | 'rtl'
  skin?: Skin
  theme?: Theme
}

const props = withDefaults(defineProps<Props>(), {
  lang: undefined,
  dir: undefined,
  skin: 'mobile',
  theme: undefined,
})

const effectiveSkin = computed<Skin>(() => props.skin ?? globalSkin.value)
const effectiveTheme = computed<Theme>(() => props.theme ?? globalTheme.value)

provide(PROTOWIKI_CHROME_SKIN, effectiveSkin)
provide(PROTOWIKI_CHROME_THEME, effectiveTheme)
/** Menus (typeahead, etc.) teleport to body — avoids clipping in overflow shells. */
provide('CdxTeleportMenus', true)
</script>

<template>
  <div
    class="wikita-lite-fullscreen-shell"
    :data-skin="effectiveSkin"
    :data-theme="effectiveTheme"
    :lang="props.lang"
    :dir="props.dir"
  >
    <div class="wikita-lite-fullscreen-shell__inner">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.wikita-lite-fullscreen-shell {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  background-color: var(--background-color-base, #fff);
  color: var(--color-base, #202122);
}

.wikita-lite-fullscreen-shell__inner {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
</style>
