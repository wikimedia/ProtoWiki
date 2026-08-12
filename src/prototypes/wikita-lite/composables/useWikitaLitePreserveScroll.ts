/** Capture / restore window scroll around UI that can nudge scroll position (menus, reorder). */
export function useWikitaLitePreserveScroll() {
  let snapshot: number | null = null

  function captureScroll(): void {
    if (typeof window === 'undefined') return
    snapshot = window.scrollY
  }

  function restoreScroll(): void {
    if (typeof window === 'undefined' || snapshot === null) return

    const y = snapshot
    snapshot = null

    const apply = (): void => {
      if (window.scrollY !== y) {
        window.scrollTo(0, y)
      }
    }

    requestAnimationFrame(() => {
      apply()
      requestAnimationFrame(apply)
    })
    window.setTimeout(apply, 0)
  }

  function preserveScrollFor(action: () => void): void {
    captureScroll()
    action()
    restoreScroll()
  }

  return {
    captureScroll,
    restoreScroll,
    preserveScrollFor,
  }
}
