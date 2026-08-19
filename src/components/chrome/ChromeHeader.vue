<script setup lang="ts">
import { computed, defineComponent, h, useSlots } from 'vue'
import { RouterLink } from 'vue-router'

import type { HeaderItem } from '@/components/header/headerItems'
import type { ChromeNavTool } from './headerNavTools'
import MinervaChromeHeader from './MinervaChromeHeader.vue'
import VectorChromeHeader from './VectorChromeHeader.vue'
import { globalSkin, globalTheme } from '@/theme'
import type { Skin, Theme } from '@/theme'

export type { HeaderItem }

interface Props {
  /** Local skin override. Sets `data-skin` on the root. */
  skin?: Skin
  /** Local theme override. Sets `data-theme` on the root. */
  theme?: Theme
  /** Desktop chrome: Meta link mock before tool icons; trim; empty hides unless **`#username`** overrides. */
  username?: string
  /** Desktop stacked wordmark image URL (`#logo` replaces both lines). */
  wordmarkSrc?: string
  /** Desktop tagline image URL beneath the wordmark. */
  taglineSrc?: string
  /** Minerva wordmark; defaults to **`wordmarkSrc`** then EN constant. */
  mobileWordmarkSrc?: string
  /** Subset/order of mocked Vector tool icons (**desktop only**). */
  navTools?: ChromeNavTool[]
  /** Minerva bar only — override default **`left`** item array. */
  left?: HeaderItem[]
  /** Minerva bar only — override default **`middle`** item array. */
  middle?: HeaderItem[]
  /** Minerva bar only — override default **`right`** item array. */
  right?: HeaderItem[]
}

const props = withDefaults(defineProps<Props>(), {
  skin: undefined,
  theme: undefined,
  username: undefined,
  wordmarkSrc: undefined,
  taglineSrc: undefined,
  mobileWordmarkSrc: undefined,
  navTools: undefined,
  left: undefined,
  middle: undefined,
  right: undefined,
})

const slots = useSlots()

const effectiveSkin = computed<Skin>(() => props.skin ?? globalSkin.value)
const effectiveTheme = computed<Theme>(() => props.theme ?? globalTheme.value)
const isDesktop = computed(() => effectiveSkin.value === 'desktop')

function slotBridgeComponent(slotName: 'menu' | 'logo') {
  return defineComponent({
    name: `ChromeHeader${slotName === 'menu' ? 'Menu' : 'Logo'}Slot`,
    setup() {
      return () => slots[slotName]?.() ?? null
    },
  })
}

const minervaLeft = computed((): HeaderItem[] | undefined => {
  if (props.left !== undefined) return props.left
  if (slots.menu) return [{ type: 'component', component: slotBridgeComponent('menu') }]
  return undefined
})

const minervaMiddle = computed((): HeaderItem[] | undefined => {
  if (props.middle !== undefined) return props.middle
  if (slots.logo) {
    return [
      {
        type: 'component',
        component: defineComponent({
          name: 'ChromeHeaderLogoSlot',
          setup() {
            return () =>
              h(
                RouterLink,
                {
                  class: 'minerva-chrome-header__brand',
                  to: '/',
                  'aria-label': 'Visit the main page',
                },
                () => slots.logo?.() ?? null,
              )
          },
        }),
      },
    ]
  }
  return undefined
})

const minervaRight = computed((): HeaderItem[] | undefined => props.right)
</script>

<template>
  <VectorChromeHeader
    v-if="isDesktop"
    :theme="effectiveTheme"
    :username="props.username"
    :wordmark-src="props.wordmarkSrc"
    :tagline-src="props.taglineSrc"
    :nav-tools="props.navTools"
  >
    <template v-if="slots.menu" #menu>
      <slot name="menu" />
    </template>
    <template v-if="slots.logo" #logo>
      <slot name="logo" />
    </template>
    <template v-if="slots.username" #username>
      <slot name="username" />
    </template>
    <template v-if="slots.nav" #nav>
      <slot name="nav" />
    </template>
  </VectorChromeHeader>

  <MinervaChromeHeader
    v-else
    :theme="effectiveTheme"
    :left="minervaLeft"
    :middle="minervaMiddle"
    :right="minervaRight"
    :wordmark-src="props.wordmarkSrc"
    :mobile-wordmark-src="props.mobileWordmarkSrc"
  />
</template>
