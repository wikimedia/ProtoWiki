<script setup lang="ts">
import { computed, provide } from 'vue'

import { useConfig } from '@/composables/useConfig'
import type { ChromeNavTool } from '@/lib/chromeHeader'
import {
  globalSkin,
  globalTheme,
  PROTOWIKI_CHROME_SKIN,
  PROTOWIKI_CHROME_THEME,
} from '@/lib/theming'
import type { Skin, Theme } from '@/lib/theming'
import ChromeHeader from './ChromeHeader.vue'
import ChromeFooter from './ChromeFooter.vue'

interface Props {
  /**
   * BCP-47 language tag for the wrapped subtree. Sets `lang` on the root.
   * Inherited by descendants via the DOM, so primitives don't need their own
   * `lang` prop. Usually you set this once on the outermost wrapper (or on
   * `<html>`); only nest it for multi-language A/B previews on one page.
   */
  lang?: string
  /**
   * Writing direction for the wrapped subtree. Sets `dir` on the root.
   * Pass `'rtl'` explicitly when previewing an RTL article — we don't infer
   * it from `lang`, because that gets it wrong for mixed-script pages and
   * for cases where you want to preview a layout in a different direction.
   */
  dir?: 'ltr' | 'rtl'
  /** Local skin override. Sets `data-skin` on the wrapper root. */
  skin?: Skin
  /** Local theme override. Sets `data-theme` on the wrapper root. */
  theme?: Theme
  /**
   * Mock article “last edited” notice (footer). **`false`** for special-page–style shells.
   * Forwarded to **`ChromeFooter`** when using the default **`#footer`** slot.
   */
  lastEditedNotice?: boolean
  /** Forwarded to **`ChromeHeader`** / **`ChromeFooter`** (Meta label; mobile footer line). */
  username?: string
  /** Forwarded to **`ChromeHeader`**. */
  wordmarkSrc?: string
  /** Forwarded to **`ChromeHeader`**. */
  taglineSrc?: string
  /** Forwarded to **`ChromeHeader`**. */
  mobileWordmarkSrc?: string
  /** Forwarded to **`ChromeHeader`** (desktop tools only). */
  navTools?: ChromeNavTool[]
}

const props = withDefaults(defineProps<Props>(), {
  lang: undefined,
  dir: undefined,
  skin: undefined,
  theme: undefined,
  lastEditedNotice: true,
  username: undefined,
  wordmarkSrc: undefined,
  taglineSrc: undefined,
  mobileWordmarkSrc: undefined,
  navTools: undefined,
})

const { displayName } = useConfig()

const effectiveSkin = computed<Skin>(() => props.skin ?? globalSkin.value)
const effectiveTheme = computed<Theme>(() => props.theme ?? globalTheme.value)
const effectiveUsername = computed(() => props.username ?? displayName.value)

provide(PROTOWIKI_CHROME_SKIN, effectiveSkin)
provide(PROTOWIKI_CHROME_THEME, effectiveTheme)
</script>

<template>
  <div
    class="chrome-wrapper"
    :data-skin="effectiveSkin"
    :data-theme="effectiveTheme"
    :lang="props.lang"
    :dir="props.dir"
  >
    <slot name="header">
      <ChromeHeader
        :skin="effectiveSkin"
        :theme="effectiveTheme"
        :username="effectiveUsername"
        :wordmark-src="props.wordmarkSrc"
        :tagline-src="props.taglineSrc"
        :mobile-wordmark-src="props.mobileWordmarkSrc"
        :nav-tools="props.navTools"
      />
    </slot>

    <main class="chrome-wrapper__content">
      <slot />
    </main>

    <slot name="footer">
      <ChromeFooter
        :skin="effectiveSkin"
        :theme="effectiveTheme"
        :last-edited-notice="props.lastEditedNotice"
        :username="effectiveUsername"
      />
    </slot>
  </div>
</template>

<style scoped>
.chrome-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--background-color-base, #fff);
  color: var(--color-base, #202122);
}

/* Grow with page content only — avoids a white flex “dead zone” above the footer on short pages. */
.chrome-wrapper__content {
  flex: 0 1 auto;
  width: 100%;
  margin: 0 auto;
  padding: 0 0;
}
</style>
