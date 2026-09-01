<script setup lang="ts">
import { nextTick, onMounted, provide } from 'vue'

import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import MobileWrapper from '@/components/MobileWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'

import { useWikitaLiteCardBordersSingleton } from '../composables/useWikitaLiteCardBorders'
import { useWikitaLiteCardRadiusSingleton } from '../composables/useWikitaLiteCardRadius'
import { useWikitaLiteView } from '../composables/useWikitaLiteView'
import { SHOW_WIKITA_LITE_FLOATING_NAV } from '../routes'
import '../wikita-lite-shell.css'
import WikitaLiteChromeMenuPopover from './WikitaLiteChromeMenuPopover.vue'
import WikitaLiteFloatingNav from './WikitaLiteFloatingNav.vue'

interface Props {
  title?: string | null
  /** Reserve the title-row actions aside (e.g. configure button on home). */
  actions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  actions: false,
})

const { isHomeFeed, goHome, scrollToTop } = useWikitaLiteView()
const { cardRadiusStyle } = useWikitaLiteCardRadiusSingleton()
const { hideCardBorders } = useWikitaLiteCardBordersSingleton()

/** Float menus on body so opening them does not shift in-page layout / scroll. */
provide('CdxTeleportMenus', true)

onMounted(async () => {
  if (props.title !== null) return
  await nextTick()
  scrollToTop()
})
</script>

<template>
  <MobileWrapper>
    <div class="wikita-lite-shell-root">
      <ChromeWrapper skin="mobile" :last-edited-notice="false">
        <template #menu>
          <WikitaLiteChromeMenuPopover />
        </template>
        <SpecialPageWrapper
          :title="title"
          :help="Boolean(title)"
          :actions="props.actions"
          class="wikita-lite-shell"
          :class="{
            'wikita-lite-shell--with-nav': SHOW_WIKITA_LITE_FLOATING_NAV,
            'wikita-lite-shell--hide-card-borders': hideCardBorders,
          }"
          :style="cardRadiusStyle"
        >
          <template v-if="$slots.actions" #actions>
            <slot name="actions" />
          </template>
          <slot />
        </SpecialPageWrapper>
      </ChromeWrapper>
      <WikitaLiteFloatingNav
        v-show="SHOW_WIKITA_LITE_FLOATING_NAV"
        :home-active="isHomeFeed"
        @go-home="goHome"
      />
    </div>
  </MobileWrapper>
</template>

<style scoped>
.wikita-lite-shell-root {
  position: relative;
}
</style>
