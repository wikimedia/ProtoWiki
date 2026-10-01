<script setup lang="ts">
import { computed, defineComponent, h, markRaw, ref } from 'vue'

import ChromeHeader from '@/components/chrome/ChromeHeader.vue'
import type { ChromeNavTool } from '@/components/chrome/headerNavTools'
import MinervaUserMenu from '@/components/chrome/MinervaUserMenu.vue'
import MobileSearchOverlay from '@/components/search/MobileSearchOverlay.vue'

import { useWikitaLiteArticleOpener } from '../composables/useWikitaLiteArticleOpener'
import { useWikitaLiteChromeHeaderRight } from '../composables/useWikitaLiteChromeHeaderRight'
import { useWikitaLiteUrlState } from '../composables/useWikitaLiteUrlState'
import { useWikitaLiteView } from '../composables/useWikitaLiteView'
import WikitaLitePrototypeMenuPopover from './WikitaLitePrototypeMenuPopover.vue'
import { MESSAGES, t } from '../i18n'
import { getContentLang } from '@/lib/contentLang'

/**
 * Chrome for the logged-in side of the prototype — Home and the article pages
 * reached from its search. On desktop, Home leads the Vector tool cluster and
 * the account's name labels the user menu; on mobile the avatar opens the user
 * menu and, where asked, Home floats in the corner. Tools are inert mocks.
 */
interface Props {
  /** Mobile only: float a Home button in the corner (Home itself leaves it out). */
  floatingHome?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  floatingHome: false,
})

const LOGGED_IN_NAV_TOOLS: ChromeNavTool[] = [
  'home',
  'appearance',
  'notifications',
  'notices',
  'bookmarks',
  'watchlist',
  'user-menu',
]

const { state } = useWikitaLiteUrlState()
const contentLang = getContentLang()
const { goHome } = useWikitaLiteView()

// Search in this header opens its results in the prototype, still logged in.
useWikitaLiteArticleOpener()

/** Empty falls back to the mock user's display name inside the chrome. */
const username = computed(() => state.value.displayName || state.value.username)

/** Minerva's full-screen search; results go through the article opener above. */
const searchOpen = ref(false)

/** Header items mount a bare component, so the name rides in through a closure. */
const userMenu = markRaw(
  defineComponent({
    name: 'WikitaLiteUserMenu',
    setup: () => () => h(MinervaUserMenu, { username: username.value }),
  }),
)

const { headerRight } = useWikitaLiteChromeHeaderRight({
  search: {
    type: 'button',
    icon: 'search',
    label: t('components.search'),
    onClick: () => (searchOpen.value = true),
  },
  userMenu,
})
</script>

<template>
  <ChromeHeader
    :right="headerRight"
    :brand-link="false"
    :nav-tools="LOGGED_IN_NAV_TOOLS"
    :username="username"
    :floating-home="props.floatingHome"
    @home="goHome"
  >
    <template #menu>
      <WikitaLitePrototypeMenuPopover />
    </template>
  </ChromeHeader>

  <MobileSearchOverlay
    v-if="searchOpen"
    :lang="contentLang"
    :placeholder="MESSAGES.searchPlaceholder"
    @close="searchOpen = false"
  />
</template>
