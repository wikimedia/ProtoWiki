import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Keeps form fields and submit buttons reachable when the soft keyboard opens
 * inside in-app WebViews (e.g. the Userlytics test browser).
 *
 * The problem: pages here are sized with `min-height: 100vh/100dvh`, so a short
 * form is exactly one screen tall — there is nothing to scroll. Chrome on
 * Android resizes/pans its viewport for the keyboard, but a WebView whose host
 * app uses `adjustPan`/`adjustNothing` just overlays the keyboard: `vh`/`dvh`
 * never shrink and no scroll overflow is ever created, so the bottom of the
 * form stays trapped behind the keyboard.
 *
 * The fix: expose a `--keyboard-inset` custom property (read as `padding-bottom`
 * on the scrolling content) so there is always room to scroll the focused field
 * and the button above the keyboard.
 *  - When the VisualViewport API reports the keyboard, use its exact height.
 *  - Otherwise fall back to a fixed inset the moment a field is focused, which
 *    guarantees overflow even when the WebView reports nothing.
 */

// Fixed inset used when the WebView never reports a real keyboard height.
// Generous enough to clear a typical Android keyboard on a phone-width screen.
const FALLBACK_INSET_PX = 320

const INSET_PROPERTY = '--keyboard-inset'

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

export function useKeyboardInset(): void {
  const root = typeof document !== 'undefined' ? document.documentElement : null
  const viewport = typeof window !== 'undefined' ? window.visualViewport : null

  function setInset(px: number): void {
    root?.style.setProperty(INSET_PROPERTY, `${Math.max(0, Math.round(px))}px`)
  }

  // True keyboard height from the VisualViewport API, when the browser reports it.
  function measuredInset(): number {
    if (!viewport) return 0
    return window.innerHeight - viewport.height - viewport.offsetTop
  }

  function onViewportChange(): void {
    setInset(measuredInset())
  }

  function applyInsetFor(target: EventTarget | null): void {
    if (!isTextEntry(target)) return
    // If the viewport already shrank for the keyboard, that measurement wins;
    // otherwise the WebView isn't reporting it, so force a fallback inset.
    if (measuredInset() <= 0) {
      setInset(FALLBACK_INSET_PX)
    }
    // Let the padding apply, then bring the focused field into view.
    requestAnimationFrame(() => {
      if (target instanceof HTMLElement) {
        target.scrollIntoView({ block: 'center' })
      }
    })
  }

  function onFocusIn(event: FocusEvent): void {
    applyInsetFor(event.target)
  }

  function onFocusOut(): void {
    // Defer so focus moving between two fields doesn't briefly collapse the inset.
    requestAnimationFrame(() => {
      if (!isTextEntry(document.activeElement)) {
        setInset(measuredInset())
      }
    })
  }

  onMounted(() => {
    if (!root) return
    setInset(measuredInset())
    viewport?.addEventListener('resize', onViewportChange)
    viewport?.addEventListener('scroll', onViewportChange)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    // A field may already be focused before this listener attached — notably the
    // autofocused username field, whose focus fires on child mount, before this
    // parent's onMounted. Apply the inset for it now so the very first field is
    // reachable, not just the next one the user taps.
    if (isTextEntry(document.activeElement)) {
      applyInsetFor(document.activeElement)
    }
  })

  onBeforeUnmount(() => {
    viewport?.removeEventListener('resize', onViewportChange)
    viewport?.removeEventListener('scroll', onViewportChange)
    document.removeEventListener('focusin', onFocusIn)
    document.removeEventListener('focusout', onFocusOut)
    root?.style.removeProperty(INSET_PROPERTY)
  })
}
