/** Find a per-page override by input or resolved title (case-insensitive). */
export function findPlanOverrideForTitles<T>(
  inputTitle: string,
  resolvedTitle: string,
  inlineOverrides: Record<string, T>,
  mapOverrides: Record<string, T>,
): T | undefined {
  const inline =
    findByTitleKey(inlineOverrides, inputTitle) ??
    findByTitleKey(inlineOverrides, resolvedTitle)
  if (inline !== undefined) return inline

  return (
    findByTitleKey(mapOverrides, inputTitle) ??
    findByTitleKey(mapOverrides, resolvedTitle)
  )
}

function findByTitleKey<T>(record: Record<string, T>, title: string): T | undefined {
  const normalized = title.trim().toLowerCase()
  if (!normalized.length) return undefined

  for (const [key, value] of Object.entries(record)) {
    if (key.trim().toLowerCase() === normalized) return value
  }

  return undefined
}

/** Merge override maps for display counts — tighter layer wins on key collision. */
export function mergePlanOverrides<T>(
  mapOverrides: Record<string, T>,
  inlineOverrides: Record<string, T>,
): Record<string, T> {
  return { ...mapOverrides, ...inlineOverrides }
}
