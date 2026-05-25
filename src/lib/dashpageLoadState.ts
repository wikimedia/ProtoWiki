/** Shared load-state helper for dashpage live-fetch modules. */

export function shouldShowDashpageLoadPrompt(
  hasStarted: boolean,
  hasRenderableData: boolean,
): boolean {
  return !hasStarted && !hasRenderableData
}
