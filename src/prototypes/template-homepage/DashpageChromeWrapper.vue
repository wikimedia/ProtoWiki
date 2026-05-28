<script setup lang="ts">
import { computed } from 'vue'

import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconMenu } from '@wikimedia/codex-icons'

import ChromeWrapper from '@/components/ChromeWrapper.vue'
import PrototypeChromeMenuPopover from '@/components/PrototypeChromeMenuPopover.vue'
import type { ChromeNavTool } from '@/lib/chromeHeader'
import { globalSkin } from '@/lib/theming'
import type { Skin, Theme } from '@/lib/theming'

import DashpageMainMenuPanel from './DashpageMainMenuPanel.vue'

interface Props {
  lang?: string
  dir?: 'ltr' | 'rtl'
  skin?: Skin
  theme?: Theme
  lastEditedNotice?: boolean
  username?: string
  wordmarkSrc?: string
  taglineSrc?: string
  mobileWordmarkSrc?: string
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

const effectiveSkin = computed<Skin>(() => props.skin ?? globalSkin.value)
const isMobile = computed(() => effectiveSkin.value === 'mobile')
</script>

<template>
  <ChromeWrapper
    :lang="props.lang"
    :dir="props.dir"
    :skin="props.skin"
    :theme="props.theme"
    :last-edited-notice="props.lastEditedNotice"
    :username="props.username"
    :wordmark-src="props.wordmarkSrc"
    :tagline-src="props.taglineSrc"
    :mobile-wordmark-src="props.mobileWordmarkSrc"
    :nav-tools="props.navTools"
  >
    <template #menu>
      <PrototypeChromeMenuPopover>
        <template #default="{ toggle, open }">
          <CdxButton
            :class="{ 'chrome-header__menu-btn': !isMobile }"
            weight="quiet"
            :size="isMobile ? 'large' : undefined"
            aria-label="Main menu"
            :aria-expanded="open"
            @click="toggle"
          >
            <CdxIcon :icon="cdxIconMenu" :size="isMobile ? 'large' : undefined" />
          </CdxButton>
        </template>
        <template #panel>
          <DashpageMainMenuPanel />
        </template>
      </PrototypeChromeMenuPopover>
    </template>

    <slot />
  </ChromeWrapper>
</template>
