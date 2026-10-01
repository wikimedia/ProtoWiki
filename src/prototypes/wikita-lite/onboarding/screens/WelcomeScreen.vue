<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import type { FlowState } from '../data/useWikitaLiteOnboardingFlow'
import { MESSAGES, format, t } from '../../i18n'

const props = defineProps<{ flow: FlowState }>()

const GLOBE = `${import.meta.env.BASE_URL}images/wikita-lite-onboarding-globe.gif`

/**
 * Static first frame of the globe (a one-frame GIF extracted from the animation).
 * Shown frozen during the start delay so the mascot is present — not a blank box —
 * but doesn't move until the delay ends. Regenerate whenever the GIF changes:
 *   gifsicle --unoptimize <globe>.gif '#0' -o <globe>-poster.gif
 */
const POSTER = `${import.meta.env.BASE_URL}images/wikita-lite-onboarding-globe-poster.gif`

/**
 * Delay before the globe animation starts. Account creation can trigger a
 * browser/OS "save your password" prompt that covers the screen right as
 * Welcome opens; holding on the first frame for a beat lets that clear so the
 * one-shot animation isn't missed behind it.
 */
const GIF_START_DELAY_MS = 1000

/**
 * Hold the frozen first frame, then after the delay swap in the animated GIF.
 * A GIF only restarts from frame 1 when the <img> gets a URL it hasn't decoded
 * yet, so the file is fetched once (during the hold) as a Blob and every play
 * mints a fresh object URL for it. That covers both the first play each time
 * Welcome is opened (screens are v-if-mounted) and tap-to-replay, without
 * re-downloading the ~640KB file. If the fetch fails we fall back to a
 * cache-busted URL, which still restarts the animation.
 *
 * When the user prefers reduced motion we never swap: the static poster is the
 * final state, so no fetch or timer is scheduled and taps do nothing.
 */
const heroSrc = ref(POSTER)
const canAnimate = ref(false)
let startTimer: ReturnType<typeof setTimeout> | null = null
let gifReady: Promise<Blob | null> = Promise.resolve(null)
let objectUrl: string | null = null
let disposed = false

async function play() {
  const blob = await gifReady
  if (disposed) return
  const previous = objectUrl
  objectUrl = blob ? URL.createObjectURL(blob) : null
  heroSrc.value = objectUrl ?? `${GLOBE}?t=${Date.now()}`
  if (previous) URL.revokeObjectURL(previous)
}

function replay() {
  if (!canAnimate.value) return
  if (startTimer) {
    clearTimeout(startTimer)
    startTimer = null
  }
  play()
}

onMounted(() => {
  const prefersReduced =
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReduced) return // keep the static poster, no animation

  canAnimate.value = true
  gifReady = fetch(GLOBE)
    .then((res) => (res.ok ? res.blob() : null))
    .catch(() => null)
  startTimer = setTimeout(() => {
    startTimer = null
    play()
  }, GIF_START_DELAY_MS)
})
onBeforeUnmount(() => {
  disposed = true
  if (startTimer) clearTimeout(startTimer)
  if (objectUrl) URL.revokeObjectURL(objectUrl)
})

const greeting = computed(() => {
  const name = props.flow.username.value
  return name ? format(MESSAGES.welcomeNamed, name) : MESSAGES.welcome
})
</script>

<template>
  <!--
    First-run celebration. The screen fades in via the shell's region transition
    (T1); these blocks then stagger their own transform in on top of that fade,
    the globe (mascot) leading with a touch more presence (scale). This
    stagger/scale treatment is reserved for this one moment — steps 2/3 stay
    efficient and consistent.
  -->
  <div class="welcome">
    <h1 class="welcome__title ob-stagger ob-stagger--1">{{ greeting }}</h1>

    <div class="welcome__illustration ob-stagger ob-stagger--lead">
      <!-- Tap/click the globe to play it again. -->
      <button
        v-if="canAnimate"
        type="button"
        class="welcome__replay"
        :aria-label="t('onboarding.playAnimation')"
        @click="replay"
      >
        <img class="welcome__hero" :src="heroSrc" alt="" width="480" height="480" />
      </button>
      <img v-else class="welcome__hero" :src="heroSrc" alt="" width="480" height="480" />
    </div>
  </div>
</template>

<style scoped>
.welcome {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 100%;
  background-color: var(--background-color-base, #fff);
}

.welcome__title {
  flex-grow: 1;
  margin: 0;
  padding: var(--spacing-300, 48px) 0 0;
  font-family: var(--font-family-serif);
  font-size: var(--font-size-xxx-large, 2rem);
  font-weight: var(--font-weight-normal, 400);
  line-height: var(--line-height-xxx-large, 1.375);
  color: var(--color-base);
}

/* Matches `.ob-title` on the desktop card — see onboarding-layout.css. */
[data-skin='desktop'] .welcome__title {
  padding-top: var(--spacing-100, 16px);
}

.welcome__illustration {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

/*
 * The mascot is a 480px square, which on the desktop modal filled the card.
 * Cap it and let the flex parent centre what's left; the source is square, so
 * capping the width alone keeps it in proportion.
 */
.welcome__hero {
  display: block;
  width: 100%;
  max-width: 256px;
  height: auto;
  max-height: 256px;
  border: none;
  object-fit: contain;
}

/* On mobile the step fills the screen, so the mascot can use the full width. */
[data-skin='mobile'] .welcome__hero {
  max-width: 100%;
  max-height: 100%;
}

/*
 * Tap target for replaying the globe. Unstyled so the mascot looks exactly as
 * it does without it; it carries the hero's size cap so the <img> inside can
 * simply fill it.
 */
.welcome__replay {
  display: block;
  width: 100%;
  max-width: 256px;
  padding: 0;
  border: none;
  border-radius: var(--border-radius-base, 2px);
  background: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

[data-skin='mobile'] .welcome__replay {
  max-width: 100%;
}

.welcome__replay:focus-visible {
  outline: var(--border-width-thick, 2px) solid var(--outline-color-progressive--focus, #36c);
  outline-offset: 2px;
}

/* First-run reveal (T1 step 4): each block eases up, the globe leads with a
   scale pop. Runs once on mount over the region fade; the two blocks are all
   the DOM this screen has (the CTA now lives in the dialog footer). */
.ob-stagger {
  animation: ob-rise var(--ob-duration-fade-in, 280ms) var(--ob-ease-out-strong, ease-out) both;
}

.ob-stagger--lead {
  animation-name: ob-pop;
  animation-delay: calc(var(--ob-stagger-step, 50ms) * 1);
}

.ob-stagger--1 {
  animation-delay: calc(var(--ob-stagger-step, 50ms) * 0);
}

@keyframes ob-rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes ob-pop {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  /* Keep the fade, drop the translate/scale distance. */
  .ob-stagger {
    animation-name: ob-fade-only;
  }

  .ob-stagger--lead {
    animation-name: ob-fade-only;
  }

  @keyframes ob-fade-only {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
}
</style>
