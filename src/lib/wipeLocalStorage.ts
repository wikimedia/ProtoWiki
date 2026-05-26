/** Clear persisted browser state after unrecoverable load/parse failures. */
export function wipeLocalStorage(): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.clear()
  } catch {
    // Private mode or blocked storage — ignore.
  }
}
