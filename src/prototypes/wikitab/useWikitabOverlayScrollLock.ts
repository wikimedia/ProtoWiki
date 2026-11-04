import { onUnmounted, watch, type Ref } from 'vue'

/** Page `scrollY` before an overlay hides the feed / locks overflow. */
let savedScrollY = 0
let hasScrollSnapshot = false

/**
 * Call from overlay open paths *before* `overlayOpen` hides the main page.
 * `overflow: hidden` and `v-show` on the feed can clear `window.scrollY` before
 * the panel activates — without this, unlock restores 0 and title-match starts wrong.
 */
export function snapshotWikitabOverlayScrollY(): void {
  savedScrollY = window.scrollY
  hasScrollSnapshot = true
}

/**
 * Lock document scroll while `active` is true for a fullscreen `.wikitab-panel`.
 *
 * CSS for `lockClass` should set `overflow: hidden; scrollbar-gutter: auto`.
 * Panels keep their own `scrollbar-gutter: stable` (see `.wikitab-panel`).
 *
 * Restores the snapshotted `scrollY` on unlock so close-handlers (title match)
 * run from the pre-open place.
 */
export function useWikitabOverlayScrollLock(
  lockClass: string,
  active: Ref<boolean>,
): void {
  watch(
    active,
    (isActive, wasActive) => {
      const root = document.documentElement
      if (isActive) {
        if (!hasScrollSnapshot) {
          savedScrollY = window.scrollY
          hasScrollSnapshot = true
        }
        root.classList.add(lockClass)
        return
      }
      if (wasActive) {
        root.classList.remove(lockClass)
        // `flush: 'post'` so in-place module screens are back in document flow
        // before we restore — otherwise max scrollY is clamped while they're fixed.
        window.scrollTo({ top: savedScrollY, left: 0, behavior: 'instant' })
        hasScrollSnapshot = false
      }
    },
    { immediate: true, flush: 'post' },
  )

  onUnmounted(() => {
    document.documentElement.classList.remove(lockClass)
    if (hasScrollSnapshot) {
      window.scrollTo({ top: savedScrollY, left: 0, behavior: 'instant' })
      hasScrollSnapshot = false
    }
  })
}
