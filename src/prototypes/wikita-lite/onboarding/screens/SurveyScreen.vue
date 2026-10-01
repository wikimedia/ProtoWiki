<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { CdxCard } from '@wikimedia/codex'

import { t } from '@/i18n'

import type { FlowState, SurveyChoice } from '../data/useWikitaLiteOnboardingFlow'

const props = defineProps<{ flow: FlowState }>()

/** Hold after the selection feedback before auto-advancing (T3). Mirrors
 *  `--ob-delay-selection-hold`; kept in JS since only the timer needs it. */
const SELECTION_HOLD_MS = 400

const OPTIONS: { value: SurveyChoice; label: string; description: string }[] = [
  {
    value: 'read',
    label: t('onboarding.surveyRead'),
    description: t('onboarding.surveyReadDescription'),
  },
  {
    value: 'edit',
    label: t('onboarding.surveyEdit'),
    description: t('onboarding.surveyEditDescription'),
  },
  {
    value: 'both',
    label: t('onboarding.surveyBoth'),
    description: t('onboarding.surveyBothDescription'),
  },
]

// Local echo of the tap so the selection state paints immediately, without
// waiting for the URL round-trip that `patch` performs. Falls back to the
// persisted answer (e.g. when returning via Back).
const pending = ref<SurveyChoice | ''>('')
const selected = computed(() => pending.value || props.flow.survey.value)

// Roving tabindex: Tab lands on the selected card, or the first one when
// nothing is selected yet. The rest are reached with arrow keys.
const activeIndex = computed(() => {
  const i = OPTIONS.findIndex((o) => o.value === selected.value)
  return i === -1 ? 0 : i
})

// Card element refs, kept in DOM order so arrow navigation can move focus.
// CdxCard's template ref is the component instance; `$el` is its root <a>.
const cards = ref<HTMLElement[]>([])

function setCard(el: unknown, index: number): void {
  if (el) cards.value[index] = (el as { $el: HTMLElement }).$el
}

/** Enter/Space activate the focused card, matching native radio behaviour.
 *  (Space would otherwise scroll the page.) */
function onActivate(event: KeyboardEvent, value: SurveyChoice): void {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  void choose(value)
}

/** Radiogroup arrow-key navigation: move focus to the neighbour and select it,
 *  matching native radio behaviour (selection follows focus). */
function onArrows(event: KeyboardEvent): void {
  if (advancing.value) return
  const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight'
  const back = event.key === 'ArrowUp' || event.key === 'ArrowLeft'
  if (!forward && !back) return
  event.preventDefault()

  const delta = forward ? 1 : -1
  const next = (activeIndex.value + delta + OPTIONS.length) % OPTIONS.length
  cards.value[next]?.focus()
  void choose(OPTIONS[next].value)
}

let advanceTimer: ReturnType<typeof setTimeout> | null = null
const advancing = ref(false)

async function choose(value: SurveyChoice): Promise<void> {
  if (advancing.value) return // ignore taps once we're committed to advancing
  advancing.value = true
  pending.value = value

  // Record the answer on the current (survey) history entry first, then advance.
  // Awaiting the replace keeps both steps distinct so back navigation restores
  // this screen with the answer still selected.
  await props.flow.patch({ survey: value })

  // Two sequential behaviours (do not combine): the selection feedback plays,
  // then a short hold lets it register before the step transition fires.
  advanceTimer = setTimeout(() => {
    void props.flow.goTo('interests')
  }, SELECTION_HOLD_MS)
}

onBeforeUnmount(() => {
  if (advanceTimer) clearTimeout(advanceTimer)
})
</script>

<template>
  <div class="ob-page">
    <h1 class="ob-title">{{ t('onboarding.surveyTitle') }}</h1>

    <div class="ob-body">
      <!-- Each option is a stock Codex Card. Setting `url` makes it a link, so
           its hover / active / focus states come from Codex's own `--is-link`
           styling. We reuse that card as the radio itself (role + aria-checked)
           and prevent the link navigation, so there's a single Tab stop and no
           nested interactive elements. `role="radiogroup"` groups them; arrow
           keys move between cards at the group level via a roving tabindex. -->
      <div
        class="survey__options"
        role="radiogroup"
        :aria-label="t('onboarding.surveyTitle')"
        @keydown="onArrows"
      >
        <CdxCard
          v-for="(option, index) in OPTIONS"
          :key="option.value"
          :ref="(el) => setCard(el, index)"
          class="survey__option"
          url="#"
          role="radio"
          :aria-checked="selected === option.value"
          :tabindex="activeIndex === index ? 0 : -1"
          @click.prevent="choose(option.value)"
          @keydown="onActivate($event, option.value)"
        >
          <template #title>{{ option.label }}</template>
          <template #description>{{ option.description }}</template>
        </CdxCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Hover / active / focus all come from Codex's `--is-link` styling (enabled by
   the `url` prop), so no custom card styling is needed here. */
.survey__options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
}
</style>
