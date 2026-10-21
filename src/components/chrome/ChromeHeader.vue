<script setup lang="ts">
import { computed, defineComponent, h, markRaw, useSlots } from 'vue'
import { RouterLink } from 'vue-router'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconUserAvatarOutline } from '@wikimedia/codex-icons'

import SettingsPopover from '@/components/settings/SettingsPopover.vue'
import UserSettingsPanel from '@/components/settings/UserSettingsPanel.vue'
import { useWordmarkMainPageLink } from '@/composables/useWordmarkMainPageLink'
import type { HeaderItem } from '@/components/header/headerItems'
import type { ChromeNavTool } from './headerNavTools'
import MinervaChromeHeader from './MinervaChromeHeader.vue'
import MinervaChromeMainMenu from './MinervaChromeMainMenu.vue'
import { MINERVA_DEFAULT_RIGHT } from './minervaHeaderDefaults'
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
  /**
   * When true, default tool controls open prototyping settings; wordmarks link to the Main Page.
   */
  prototypingSettings?: boolean
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
  prototypingSettings: true,
})

const slots = useSlots()
const wordmarkMainPageLink = useWordmarkMainPageLink()

const effectiveSkin = computed<Skin>(() => props.skin ?? globalSkin.value)
const effectiveTheme = computed<Theme>(() => props.theme ?? globalTheme.value)
const isDesktop = computed(() => effectiveSkin.value === 'desktop')

function slotBridgeComponent(slotName: 'menu' | 'logo' | 'user-menu') {
  return defineComponent({
    name: `ChromeHeader${slotName === 'menu' ? 'Menu' : slotName === 'logo' ? 'Logo' : 'UserMenu'}Slot`,
    setup() {
      return () => slots[slotName]?.() ?? null
    },
  })
}

const minervaUserSettingsComponent = defineComponent({
  name: 'ChromeHeaderMinervaUserSettings',
  setup() {
    return () =>
      h(SettingsPopover, null, {
        default: ({ toggle, open }: { toggle: () => void; open: boolean }) =>
          h(
            CdxButton,
            {
              weight: 'quiet',
              size: 'large',
              'aria-label': 'Mock user settings',
              'aria-haspopup': 'dialog',
              'aria-expanded': open,
              onClick: toggle,
            },
            {
              default: () =>
                h(CdxIcon, { icon: cdxIconUserAvatarOutline, size: 'medium' }),
            },
          ),
        panel: () => h(UserSettingsPanel),
      })
  },
})

const minervaDefaultMainMenuComponent = defineComponent({
  name: 'ChromeHeaderMinervaDefaultMainMenu',
  setup() {
    return () =>
      h(MinervaChromeMainMenu, { prototypingSettings: props.prototypingSettings })
  },
})

const minervaLeft = computed((): HeaderItem[] | undefined => {
  if (props.left !== undefined) return props.left
  if (slots.menu) return [{ type: 'component', component: slotBridgeComponent('menu') }]
  return [
    {
      type: 'component',
      component: markRaw(minervaDefaultMainMenuComponent),
    },
  ]
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
            return () => {
              const logo = () => slots.logo?.() ?? null
              if (props.prototypingSettings) {
                return h(
                  RouterLink,
                  {
                    class: 'minerva-chrome-header__brand',
                    to: wordmarkMainPageLink.value,
                    'aria-label': 'Visit the main page',
                  },
                  logo,
                )
              }
              return h('span', { class: 'minerva-chrome-header__brand' }, logo)
            }
          },
        }),
      },
    ]
  }
  return undefined
})

const minervaRight = computed((): HeaderItem[] | undefined => {
  if (props.right !== undefined) return props.right
  // `#user-menu` replaces the default user button, keeping the rest of the bar.
  if (slots['user-menu']) {
    return MINERVA_DEFAULT_RIGHT.map((item) =>
      item.type === 'button' && item.label === 'User menu'
        ? { type: 'component', component: slotBridgeComponent('user-menu') }
        : item,
    )
  }
  if (props.prototypingSettings) {
    return MINERVA_DEFAULT_RIGHT.map((item) =>
      item.type === 'button' && item.label === 'User menu'
        ? { type: 'component', component: minervaUserSettingsComponent }
        : item,
    )
  }
  return undefined
})
</script>

<template>
  <VectorChromeHeader
    v-if="isDesktop"
    :theme="effectiveTheme"
    :username="props.username"
    :wordmark-src="props.wordmarkSrc"
    :tagline-src="props.taglineSrc"
    :nav-tools="props.navTools"
    :prototyping-settings="props.prototypingSettings"
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
    <template v-if="slots['user-menu']" #user-menu>
      <slot name="user-menu" />
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
    :prototyping-settings="props.prototypingSettings"
  />
</template>
