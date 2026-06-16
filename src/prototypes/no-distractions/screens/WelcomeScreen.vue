<script setup lang="ts">
import { computed } from 'vue'
import { CdxButton } from '@wikimedia/codex'

import OnboardingShell from '../components/OnboardingShell.vue'
import type { FlowState } from '../data/useFlowState'

const props = defineProps<{ flow: FlowState }>()

const WELCOME_HERO = `${import.meta.env.BASE_URL}images/no-distractions-welcome-hero.png`

const greeting = computed(() => {
  const name = props.flow.username.value
  return name ? `Welcome to Wikipedia, ${name}!` : 'Welcome to Wikipedia!'
})
</script>

<template>
  <OnboardingShell :current="0" flush-content>
    <div class="welcome">
      <div class="welcome__header">
        <h1 class="welcome__title">{{ greeting }}</h1>
      </div>

      <div class="welcome__body">
        <div class="welcome__hero-wrap">
          <img class="welcome__hero" :src="WELCOME_HERO" alt="" width="412" height="275" />
        </div>

        <div class="welcome__footer">
          <div class="welcome__actions">
            <CdxButton action="progressive" weight="primary" @click="props.flow.goTo('survey')">
              Personalize your Home
            </CdxButton>
            <button type="button" class="ob-skip ob-skip--inverse" @click="props.flow.goTo('home')">
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  </OnboardingShell>
</template>

<style scoped>
.welcome {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 100%;
}

.welcome__header {
  flex: 1 1 auto;
  padding: var(--spacing-400, 64px) var(--spacing-100, 16px) var(--spacing-100, 16px);
}

.welcome__title {
  margin: 0;
  font-family: var(--font-family-serif);
  font-size: var(--font-size-xxx-large, 2rem);
  font-weight: var(--font-weight-normal, 400);
  line-height: var(--line-height-xxx-large, 1.375);
  color: var(--color-base);
}

.welcome__body {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 0;
  line-height: 0;
}

.welcome__hero-wrap {
  overflow: hidden;
  line-height: 0;
  background-color: var(--background-color-base, #fff);
  /* Pull the dark footer up over the hero’s bottom edge (anti-aliasing gap). */
  margin-bottom: -2px;
}

.welcome__hero {
  display: block;
  width: 100%;
  max-width: none;
  height: 17.1875rem;
  border: none;
  object-fit: cover;
  object-position: center bottom;
  vertical-align: bottom;
}

.welcome__footer {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
  position: relative;
  z-index: 1;
  margin-top: -2px;
  padding: var(--spacing-100, 16px);
  padding-bottom: max(var(--spacing-150, 24px), env(safe-area-inset-bottom));
  background-color: #101418;
}

.welcome__actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
  padding-top: var(--spacing-100, 16px);
}

.welcome__actions :deep(.cdx-button),
.welcome__actions .ob-skip {
  box-sizing: border-box;
  width: 100%;
}

.welcome__actions :deep(.cdx-button) {
  min-height: 3rem;
  padding-block: var(--spacing-100, 16px);
  font-size: var(--font-size-medium, 1rem);
  font-weight: var(--font-weight-bold);
}
</style>
