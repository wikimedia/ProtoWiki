<script setup lang="ts">
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import {
  cdxIconAppearance,
  cdxIconBell,
  cdxIconTray,
  cdxIconWatchlist,
} from '@wikimedia/codex-icons'

import ChromeHeader from '@/components/chrome/ChromeHeader.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import type { HeaderItem } from '@/components/header/headerItems'

import { EXPERIMENTATION_MAIN, EXPERIMENTATION_USERNAME } from './routes'
import UserMenu from './UserMenu.vue'

withDefaults(
  defineProps<{
    lastEditedNotice?: boolean
  }>(),
  {
    lastEditedNotice: true,
  },
)

const minervaRight: HeaderItem[] = [
  { type: 'button', icon: 'search', label: 'Search' },
  { type: 'button', icon: 'bell-outline', label: 'Notifications' },
  { type: 'component', component: UserMenu },
]
</script>

<template>
  <ChromeWrapper
    :username="EXPERIMENTATION_USERNAME"
    :last-edited-notice="lastEditedNotice"
  >
    <template #header>
      <ChromeHeader
        :username="EXPERIMENTATION_USERNAME"
        :home-to="EXPERIMENTATION_MAIN"
        :right="minervaRight"
      >
        <template #nav>
          <CdxButton weight="quiet" aria-label="Appearance">
            <CdxIcon :icon="cdxIconAppearance" />
          </CdxButton>
          <CdxButton weight="quiet" aria-label="Notifications">
            <CdxIcon :icon="cdxIconBell" />
          </CdxButton>
          <CdxButton weight="quiet" aria-label="Notices">
            <CdxIcon :icon="cdxIconTray" />
          </CdxButton>
          <CdxButton
            weight="quiet"
            class="experimentation-chrome__hide-narrow"
            aria-label="Watchlist"
          >
            <CdxIcon :icon="cdxIconWatchlist" />
          </CdxButton>
          <UserMenu />
        </template>
      </ChromeHeader>
    </template>
    <slot />
  </ChromeWrapper>
</template>

<style scoped>
@media (max-width: 768px) {
  .experimentation-chrome__hide-narrow {
    display: none !important;
  }
}
</style>
