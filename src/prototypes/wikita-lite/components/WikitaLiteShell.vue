<script setup lang="ts">
import { computed } from 'vue'

import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import MobileWrapper from '@/components/MobileWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'

import { useWikitaLiteView } from '../composables/useWikitaLiteView'
import { viewTitleFor } from '../routes'
import '../wikita-lite-shell.css'
import MobileSubpageHeader from './MobileSubpageHeader.vue'
import WikitaLiteFloatingNav from './WikitaLiteFloatingNav.vue'

interface Props {
  title?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
})

const { activeView, isHome, selectView } = useWikitaLiteView()

const homeViewTitle = computed(() => {
  if (!isHome.value) return null
  return viewTitleFor(activeView.value)
})

const shellTitle = computed(() => {
  if (!isHome.value) return props.title
  if (homeViewTitle.value) return null
  return props.title
})
</script>

<template>
  <MobileWrapper>
    <div class="wikita-lite-shell-root">
      <ChromeWrapper skin="mobile" :last-edited-notice="false">
        <SpecialPageWrapper
          :title="shellTitle"
          :help="Boolean(shellTitle)"
          class="wikita-lite-shell wikita-lite-shell--with-nav"
          :class="{ 'wikita-lite-shell--tab-view': homeViewTitle }"
        >
          <MobileSubpageHeader v-if="homeViewTitle" :title="homeViewTitle" />
          <slot />
        </SpecialPageWrapper>
      </ChromeWrapper>
      <WikitaLiteFloatingNav :active-view="activeView" @select-view="selectView" />
    </div>
  </MobileWrapper>
</template>

<style scoped>
.wikita-lite-shell-root {
  position: relative;
}

:deep(.wikita-lite-shell--tab-view[data-skin='mobile']) {
  padding-top: var(--spacing-100, 16px);
}
</style>
