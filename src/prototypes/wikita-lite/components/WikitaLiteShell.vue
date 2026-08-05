<script setup lang="ts">
import { nextTick, onMounted } from 'vue'

import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import MobileWrapper from '@/components/MobileWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'

import { useWikitaLiteView } from '../composables/useWikitaLiteView'
import { SHOW_WIKITA_LITE_FLOATING_NAV } from '../routes'
import '../wikita-lite-shell.css'
import WikitaLiteFloatingNav from './WikitaLiteFloatingNav.vue'

interface Props {
  title?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
})

const { activeView, selectView, scrollToTop } = useWikitaLiteView()

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
        <SpecialPageWrapper
          :title="title"
          :help="Boolean(title)"
          class="wikita-lite-shell"
          :class="{ 'wikita-lite-shell--with-nav': SHOW_WIKITA_LITE_FLOATING_NAV }"
        >
          <slot />
        </SpecialPageWrapper>
      </ChromeWrapper>
      <WikitaLiteFloatingNav
        :active-view="activeView"
        @select-view="selectView"
      />
    </div>
  </MobileWrapper>
</template>

<style scoped>
.wikita-lite-shell-root {
  position: relative;
}
</style>
