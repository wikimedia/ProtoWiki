/** "just now", "5m ago", "3h ago", "2d ago", "4mo ago" — compact, for card supporting text. */
export function formatAgo(timeMs: number, now = Date.now()): string {
  const minutes = Math.floor((now - timeMs) / 60_000)
  if (!Number.isFinite(minutes) || minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}
