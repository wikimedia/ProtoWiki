export type WikitabShowMoreDisabledOptions = {
  itemCount: number
  /** May include orchestration flags (`!isLoaded`, pendingOnHome); must not disable once cards exist. */
  loading?: boolean
  pending?: boolean
  fillingInitial?: boolean
  loadingMore?: boolean
  revealing?: boolean
}

/**
 * When to grey out desktop Show more. Disabled only in the empty skeleton phase,
 * or while a user-initiated page fetch is in flight.
 */
export function wikitabShowMoreDisabled(options: WikitabShowMoreDisabledOptions): boolean {
  if (options.loadingMore || options.revealing) return true
  if (options.itemCount > 0) return false
  return Boolean(options.loading || options.pending || options.fillingInitial)
}
