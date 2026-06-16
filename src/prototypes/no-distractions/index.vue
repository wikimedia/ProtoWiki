<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

import MobileWrapper from '@/components/MobileWrapper.vue'
import { useConfig } from '@/composables/useConfig'
import type { ConfigUser } from '@/config'

import { useFlowState, type Screen } from './data/useFlowState'
import { resolveSuggestionSeedState, useSuggestions } from './data/useSuggestions'
import PagePickerScreen from './screens/PagePickerScreen.vue'
import ReadScreen from './screens/ReadScreen.vue'
import CreateAccountScreen from './screens/CreateAccountScreen.vue'
import WelcomeScreen from './screens/WelcomeScreen.vue'
import SurveyScreen from './screens/SurveyScreen.vue'
import InterestsScreen from './screens/InterestsScreen.vue'
import EmailScreen from './screens/EmailScreen.vue'
import HomeScreen from './screens/HomeScreen.vue'
import AllSuggestionsScreen from './screens/AllSuggestionsScreen.vue'

definePage({
  meta: {
    title: 'No distractions',
    description: 'A streamlined onboarding flow.',
  },
})

const flow = useFlowState()
const { user } = useConfig()

// Bind once at the route shell; home/all read the shared cache without rebinding.
useSuggestions(() =>
  resolveSuggestionSeedState(
    flow.interests.value,
    flow.title.value,
    flow.hasExplicitInterests.value,
  ),
)

// Logged-out chrome before the account exists; logged-in afterwards. The
// article header reads the global config user, so we drive it per screen and
// restore whatever the gallery had when leaving the prototype.
const LOGGED_OUT_SCREENS: Screen[] = ['picker', 'read', 'account']
const originalUser = user.value

watch(
  flow.screen,
  (screen) => {
    const next: ConfigUser = LOGGED_OUT_SCREENS.includes(screen) ? 'logged-out' : 'new'
    if (user.value !== next) user.value = next
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  user.value = originalUser
})
</script>

<template>
  <MobileWrapper max-width="412px" :show-frame-border="false">
    <PagePickerScreen v-if="flow.screen.value === 'picker'" :flow="flow" />
    <ReadScreen v-else-if="flow.screen.value === 'read'" :flow="flow" />
    <CreateAccountScreen v-else-if="flow.screen.value === 'account'" :flow="flow" />
    <WelcomeScreen v-else-if="flow.screen.value === 'welcome'" :flow="flow" />
    <SurveyScreen v-else-if="flow.screen.value === 'survey'" :flow="flow" />
    <InterestsScreen v-else-if="flow.screen.value === 'interests'" :flow="flow" />
    <EmailScreen v-else-if="flow.screen.value === 'email'" :flow="flow" />
    <HomeScreen v-else-if="flow.screen.value === 'home'" :flow="flow" />
    <AllSuggestionsScreen v-else-if="flow.screen.value === 'all'" :flow="flow" />
  </MobileWrapper>
</template>
