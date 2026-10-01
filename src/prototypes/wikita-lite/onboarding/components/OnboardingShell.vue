<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CdxButton, CdxDialog, CdxIcon } from '@wikimedia/codex'
import { cdxIconClose, cdxIconPrevious } from '@wikimedia/codex-icons'

import { globalSkin } from '@/theme'

import './onboarding-layout.css'
import { MESSAGES } from '../../i18n'
import { messageParts, t } from '@/i18n'

/**
 * Full-height onboarding shell for the personalisation steps. Now a thin wrapper
 * around a stock Codex `CdxDialog`: the dialog owns the scrollable body, the fixed
 * footer, and the auto dividers, so screens no longer hand-roll a sticky footer.
 *
 * We fully replace the dialog header via `#header` (a navigation button on the
 * left and a rolling step counter `1 / 3` on the right) and expose a `footer`
 * slot for the per-step CTA. The dialog is rendered in place (teleport disabled)
 * and its viewport-relative sizing is overridden so the card stays inside the
 * prototype's phone frame rather than covering the whole browser window.
 *
 * On the desktop skin the same steps run in an ordinary centred modal instead of
 * a full-height takeover — see `isDesktop` below.
 */
interface Props {
  /** Active step (1 = welcome, 2 = survey, 3 = interests). 0 = no step highlighted. */
  current?: number
  /** Total number of steps shown in the counter. */
  total?: number
}

const props = withDefaults(defineProps<Props>(), {
  current: 0,
  total: 3,
})

const emit = defineEmits<{ dismiss: [] }>()

const router = useRouter()

/*
 * Phone: a fixed-height takeover that fills the frame. Desktop: an ordinary
 * centred modal, `--size-4000` (640px) tall, in the same spirit as the
 * treatment the prototype splash gets. Keyed on the global skin rather than a
 * media query so it flips at the same 640px threshold as the chrome, and
 * follows `?skin=` when that pins it.
 */
const isDesktop = computed(() => globalSkin.value === 'desktop')

/** Step 1 shows a close button that dismisses; later steps show a back button. */
const isFirst = computed(() => props.current <= 1)

/**
 * Rolling counter direction. Only the current digit animates (the " / N" is
 * fixed); advancing rolls it up (new from the bottom), going back rolls it down
 * (new from the top) — mirroring the direction-aware content slide. Self-contained
 * here since the shell owns the counter and already receives `current`.
 */
const counterDir = ref<'up' | 'down'>('up')
watch(
  () => props.current,
  (to, from) => {
    if (to > from) counterDir.value = 'up'
    else if (to < from) counterDir.value = 'down'
  },
)
const counterTransition = computed(() =>
  counterDir.value === 'up' ? 'ob-counter-up' : 'ob-counter-down',
)

/** "1 of 3": `$1` stays a slot for the rolling digit; `$2` (the total) is filled in. */
const counterParts = computed(() => messageParts('onboarding.stepCounter', undefined, props.total))

function onNavigate(): void {
  if (isFirst.value) {
    emit('dismiss')
  } else {
    router.back()
  }
}

/**
 * Scroll dividers. Codex only recomputes its own `--dividers` class when the
 * dialog body's *box height* changes, but our body is a fixed-height flex child
 * (so it can fill the frame), and async content (images, suggestions) grows the
 * body's scrollHeight without changing its box — so Codex never re-measures.
 * Drive the header/footer borders ourselves instead: compare the body's
 * scrollHeight against its clientHeight and toggle a class. (Adding the 1px
 * borders shrinks the body, which only makes an overflowing body overflow more,
 * so there's no observer feedback loop.)
 *
 * Watching boxes is not enough to know *when* to re-measure: every wrapper from
 * the body down (`.ob-step-viewport`, `.ob-page`, `.ob-body`) is a clamped flex
 * child, so a step's async list growing taller changes no observed box — the
 * extra height only shows up in the body's scrollHeight. So we also watch the
 * body's subtree for mutations and for late image loads, and re-measure on the
 * next frame once layout has settled.
 */
const shellEl = ref<HTMLElement | null>(null)
const bodyScrolls = ref(false)
let resizeObserver: ResizeObserver | null = null
let mutationObserver: MutationObserver | null = null
let bodyEl: HTMLElement | null = null
let measureFrame = 0

function measureScroll(): void {
  const body = bodyEl ?? shellEl.value?.querySelector<HTMLElement>('.cdx-dialog__body')
  if (!body) return
  bodyScrolls.value = body.scrollHeight - body.clientHeight > 1
}

/** Coalesce bursts of mutations/loads into one measurement after layout. */
function scheduleMeasure(): void {
  if (measureFrame) return
  measureFrame = requestAnimationFrame(() => {
    measureFrame = 0
    measureScroll()
  })
}

onMounted(() => {
  // Account creation scrolls the document (keyboard inset, long forms). Reset
  // before painting so the fixed shell is not offset by a stale scrollY.
  if (typeof window !== 'undefined') {
    window.scrollTo(0, 0)
  }

  bodyEl = shellEl.value?.querySelector<HTMLElement>('.cdx-dialog__body') ?? null
  measureScroll()
  if (!bodyEl) return

  // Box changes: the frame resizing (rotation, keyboard, toolbar show/hide).
  resizeObserver = new ResizeObserver(() => measureScroll())
  resizeObserver.observe(bodyEl)
  if (bodyEl.firstElementChild) resizeObserver.observe(bodyEl.firstElementChild)

  // Content changes: suggestions arriving, chips added/removed, steps swapping.
  mutationObserver = new MutationObserver(scheduleMeasure)
  mutationObserver.observe(bodyEl, { childList: true, subtree: true, characterData: true })

  // Thumbnails that land after their markup and grow the row they sit in.
  bodyEl.addEventListener('load', scheduleMeasure, true)
})

onBeforeUnmount(() => {
  if (measureFrame) cancelAnimationFrame(measureFrame)
  resizeObserver?.disconnect()
  mutationObserver?.disconnect()
  bodyEl?.removeEventListener('load', scheduleMeasure, true)
})

/**
 * Route the dialog's own dismiss (Esc / backdrop) through the same navigation as
 * the header button, so Esc mirrors it: dismiss on step 1, back on later steps.
 * `open` is bound constant `true` (visibility is driven by v-if at the route
 * level), so we never actually flip it — the navigation unmounts the shell.
 */
function onDialogClose(value: boolean): void {
  if (!value) onNavigate()
}
</script>

<template>
  <div
    ref="shellEl"
    class="onboarding-shell"
    :class="{
      'onboarding-shell--scrolls': bodyScrolls,
      'onboarding-shell--centred': isDesktop,
    }"
  >
    <CdxDialog
      :open="true"
      :fixed-height="!isDesktop"
      render-in-place
      :title="MESSAGES.personalizeHome"
      @update:open="onDialogClose"
    >
      <template #header>
        <div class="onboarding-shell__progress">
          <CdxButton
            class="onboarding-shell__nav"
            weight="quiet"
            size="medium"
            :aria-label="isFirst ? t('onboarding.close') : t('onboarding.goBack')"
            @click="onNavigate"
          >
            <CdxIcon :icon="isFirst ? cdxIconClose : cdxIconPrevious" />
          </CdxButton>
          <!-- Rolling counter: the " / N" stays fixed and only the current digit
               slides + fades when the step changes (T2). The header stays put. -->
          <span class="onboarding-shell__counter">
            <template v-for="part in counterParts" :key="String(part)">
              <span v-if="part === 1" class="onboarding-shell__counter-current">
                <Transition :name="counterTransition">
                  <span :key="props.current" class="onboarding-shell__counter-digit">{{
                    props.current
                  }}</span>
                </Transition>
              </span>
              <span v-else class="onboarding-shell__counter-total">{{ part }}</span>
            </template>
          </span>
        </div>
      </template>

      <slot />

      <template #footer>
        <slot name="footer" />
      </template>
    </CdxDialog>
  </div>
</template>

<style scoped>
.onboarding-shell {
  /* Pin to the visible viewport — document-flow positioning inherits scrollY
     from the account-creation screen when the user was scrolled down. */
  position: fixed;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-height: 100vh;
  min-height: 100dvh;
  --onboarding-safe-area-top: env(safe-area-inset-top, 0px);
  --onboarding-safe-area-bottom: env(safe-area-inset-bottom, 0px);
  /* Keep the 1rem frame on desktop; on notched phones use the larger inset. */
  --onboarding-top-inset: max(var(--spacing-100, 16px), var(--onboarding-safe-area-top));
  --onboarding-bottom-inset: max(var(--spacing-100, 16px), var(--onboarding-safe-area-bottom));
  background-color: var(--background-color-base);
}

@media (min-width: 480px) {
  .onboarding-shell {
    inset-inline: 0;
    margin-inline: auto;
    width: min(100%, var(--mobile-wrapper-max-width, 412px));
  }
}

/* --- Contain the teleport-disabled dialog inside the phone frame ------------
   Codex sizes the backdrop/card against the viewport (100vw / 100vh). Inside
   the fake phone column that would escape the frame, so re-anchor them to this
   wrapper. `:deep()` reaches the dialog internals because `render-in-place`
   keeps them in this component's subtree. */
.onboarding-shell :deep(.cdx-dialog-backdrop) {
  position: absolute;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding-top: var(--onboarding-top-inset);
  padding-bottom: var(--onboarding-bottom-inset);
}

.onboarding-shell :deep(.cdx-dialog) {
  width: calc(100% - 2rem);
  max-width: none;
}

.onboarding-shell :deep(.cdx-dialog--fixed-height) {
  height: calc(100% - 2rem);
}

/* Desktop: restore Codex's own width clamp so the backdrop's flex centring
   places a normal modal on the page, and give the card one height for all three
   steps — `--size-4000` (640px), or the space available when the window is
   shorter than that. A content-driven height would resize the card mid-flow
   (step 2 is the short one); holding it steady also keeps the screens' own
   fill-the-height layouts working, as they do on the phone. Content past 640px
   scrolls the body. */
.onboarding-shell--centred :deep(.cdx-dialog) {
  width: calc(100% - 2rem);
  max-width: 32rem;
  height: min(var(--size-4000, 40rem), calc(100% - 2rem));
}

/* Codex sizes the body to its content and pushes the footer down with
   `margin-top:auto`, so a short step leaves the body well short of the dialog
   height. Make the body grow to fill the available height and lay its content
   out as a flex column, so the step viewport (and the screen inside it) fills
   that height — letting a screen's growing element, e.g. Welcome's `h1`, expand
   and push the rest toward the footer. `min-height:0` keeps it scrollable when
   content overflows. */
.onboarding-shell :deep(.cdx-dialog__body) {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0;
}

/* Codex latches its own `--dividers` class on the first time the body box
   changes and never clears it (its watch only runs on box changes, which our
   fixed-height body stops producing), so its borders would linger on steps
   that fit. Suppress them and let our class be the only source of truth. */
.onboarding-shell:not(.onboarding-shell--scrolls)
  :deep(.cdx-dialog--dividers .cdx-dialog__header),
.onboarding-shell:not(.onboarding-shell--scrolls)
  :deep(.cdx-dialog--dividers .cdx-dialog__footer) {
  border: 0;
}

/* Scroll dividers, driven by our own overflow detection (see `bodyScrolls`).
   Mirrors Codex's `.cdx-dialog--dividers` borders, which don't fire reliably
   with our fixed-height body. */
.onboarding-shell--scrolls :deep(.cdx-dialog__header) {
  border-bottom: var(--border-width-base, 1px) solid var(--border-color-muted, #c8ccd1);
}

.onboarding-shell--scrolls :deep(.cdx-dialog__footer) {
  border-top: var(--border-width-base, 1px) solid var(--border-color-muted, #c8ccd1);
}

.onboarding-shell__progress {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1 1 auto;
}

/* Pull the quiet nav button back by its own inner padding so the icon optically
   aligns with the header's content edge (mirrors Codex's own close-button
   `margin-inline-start: -8px`). Logical margin so RTL flips correctly. */
.onboarding-shell__nav {
  margin-inline-start: -8px;
}

.onboarding-shell__counter {
  display: inline-flex;
  align-items: baseline;
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}

/* Clipped one-line slot the rolling digit animates within. `position:relative`
   anchors the leaving digit (absolute) so both share the slot; `min-width: 1ch`
   keeps the fixed " / N" from shifting while the slot is briefly empty mid-roll. */
.onboarding-shell__counter-current {
  position: relative;
  display: inline-block;
  min-width: 1ch;
  overflow: hidden;
  text-align: center;
  vertical-align: baseline;
}

.onboarding-shell__counter-digit {
  display: inline-block;
}
</style>
