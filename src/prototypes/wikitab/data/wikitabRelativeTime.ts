/** MediaWiki API timestamps: ISO or `YYYY-MM-DD HH:MM:SS` (UTC). */
export function parseMediaWikiTimestamp(timestamp: string): Date {
  const trimmed = timestamp.trim()
  if (!trimmed.length) return new Date(Number.NaN)
  if (trimmed.includes('T')) {
    return new Date(trimmed.endsWith('Z') ? trimmed : `${trimmed}Z`)
  }
  return new Date(trimmed.replace(' ', 'T') + 'Z')
}

/**
 * Compact relative time for Wikitab cards and search — e.g. `Just now`, `4w ago`.
 */
export function formatWikitabRelativeTime(isoTimestamp: string): string {
  const then = parseMediaWikiTimestamp(isoTimestamp).getTime()
  if (Number.isNaN(then)) return '—'
  const diffMs = Date.now() - then
  if (diffMs < 0) return 'Just now'

  const minutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 365)}y ago`
}

/** Alias for {@link formatWikitabRelativeTime} (activity / edit cards). */
export const formatWikitabEditRelativeTime = formatWikitabRelativeTime
