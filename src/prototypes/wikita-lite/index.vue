<script setup lang="ts">
import { computed, onMounted, shallowRef, watch, type Component } from 'vue'

import MobileWrapper from '@/components/MobileWrapper.vue'
import { useConfig } from '@/composables/useConfig'
import { isDefaultContentLang } from '@/lib/contentLang'

import { useWikitaLiteCreateAccountOpener } from './composables/useWikitaLiteCreateAccountOpener'
import { provideWikitaLiteSaveFeedback } from './composables/useWikitaLiteSaveFeedback'
import { useWikitaLiteLeavePrototype } from './composables/useWikitaLiteLeavePrototype'
import { useWikitaLitePrototypeSplash } from './composables/useWikitaLitePrototypeSplash'
import { initWikitaLiteUrlState, useWikitaLiteUrlState } from './composables/useWikitaLiteUrlState'
import WikitaLiteConfigureButton from './components/WikitaLiteConfigureButton.vue'
import WikitaLiteLeavePrototypeDialog from './components/WikitaLiteLeavePrototypeDialog.vue'
import WikitaLitePrototypeSplash from './components/WikitaLitePrototypeSplash.vue'
import WikitaLiteShell from './components/WikitaLiteShell.vue'
import WikitaLiteHome from './WikitaLiteHome.vue'
import { MESSAGES, format } from './i18n'

definePage({
  meta: {
    title: 'Home',
    description: 'A demo where you go through onboarding and then land in a personalized Home.',
  },
})

initWikitaLiteUrlState()
provideWikitaLiteSaveFeedback()

// "Create account" in the desktop chrome opens this prototype's own flow.
useWikitaLiteCreateAccountOpener()

const { pageTitle: configPageTitle, displayName: configDisplayName, user: configUser } = useConfig()
const { isOnboarded, state } = useWikitaLiteUrlState()
const { showSplash } = useWikitaLitePrototypeSplash()
const { onLeaveCapture } = useWikitaLiteLeavePrototype()

const showOnboarding = computed(() => !isOnboarded.value)

/*
 * Onboarding (screens, account form, article reader) is only ever shown before
 * Home, so it lives in its own chunk. It's fetched right away when it's next
 * (the splash covers the wait) and on idle otherwise, so "Create account" from
 * Home still opens it without a gap.
 */
const WikitaLiteOnboarding = shallowRef<Component | null>(null)
let onboardingLoad: Promise<void> | null = null

function loadOnboarding(): Promise<void> {
  onboardingLoad ??= import('./WikitaLiteOnboarding.vue').then((module) => {
    WikitaLiteOnboarding.value = module.default
  })
  return onboardingLoad
}

watch(showOnboarding, (show) => {
  if (show) void loadOnboarding()
})

if (showOnboarding.value) {
  void loadOnboarding()
} else {
  onMounted(() => {
    const whenIdle = window.requestIdleCallback ?? ((callback: () => void) => setTimeout(callback, 2000))
    whenIdle(() => void loadOnboarding())
  })
}

const pageTitle = computed(() => {
  const name = state.value.displayName || state.value.username
  if (name) return format(MESSAGES.helloNamed, name)
  if (!isDefaultContentLang() && configUser.value !== 'logged-out') {
    return format(MESSAGES.helloNamed, configDisplayName.value)
  }
  return configPageTitle.value
})
</script>

<template>
  <MobileWrapper v-if="showOnboarding" fluid>
    <div class="wikita-lite-index" @click.capture="onLeaveCapture">
      <component :is="WikitaLiteOnboarding" v-if="!showSplash && WikitaLiteOnboarding" />
      <WikitaLitePrototypeSplash v-if="showSplash" />
      <WikitaLiteLeavePrototypeDialog />
    </div>
  </MobileWrapper>

  <WikitaLiteShell v-else :title="pageTitle" actions>
    <template #actions>
      <WikitaLiteConfigureButton />
    </template>
    <WikitaLiteHome />
    <template #overlay>
      <WikitaLitePrototypeSplash v-if="showSplash" />
    </template>
  </WikitaLiteShell>
</template>

<style scoped>
.wikita-lite-index {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 100vh;
  min-height: 100dvh;
}
</style>
