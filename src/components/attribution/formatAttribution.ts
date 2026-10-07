/** Compact number for trust signals (e.g. 40822 → "41K"). */
export function formatCompactCount(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000
    return `${millions >= 10 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, '')}M`
  }
  if (value >= 10_000) {
    return `${Math.round(value / 1000)}K`
  }
  if (value >= 1000) {
    const thousands = value / 1000
    return `${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1).replace(/\.0$/, '')}K`
  }
  return String(value)
}

const SIX_WEEKS_DAYS = 42

function padTwoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

/** Day-first (DD/MM) for en-GB or Europe timezone; otherwise month-first (MM/DD). */
export function prefersDayFirstDate(): boolean {
  if (typeof navigator === 'undefined') return false

  const locale = navigator.language ?? 'en-US'
  if (locale.toLowerCase().startsWith('en-gb')) return true

  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (timeZone.startsWith('Europe/')) return true
  } catch {
    // Ignore — fall through to month-first default.
  }

  return false
}

function formatCompactCalendarDate(date: Date, includeYear: boolean, dayFirst: boolean): string {
  const month = padTwoDigits(date.getMonth() + 1)
  const day = padTwoDigits(date.getDate())
  const datePart = dayFirst ? `${day}/${month}` : `${month}/${day}`
  if (!includeYear) return datePart
  return `${datePart}/${date.getFullYear()}`
}

/** Relative duration only — e.g. "4w ago", "just now" (no "Updated" prefix). */
export function formatRelativeUpdateDuration(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.round(diffMs / 60_000)
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 48) return `${diffHours}h ago`

  const diffDays = Math.max(1, Math.round(diffHours / 24))
  if (diffDays < 7) return `${diffDays}d ago`

  if (diffDays < 365) {
    const weeks = Math.max(1, Math.round(diffDays / 7))
    return `${weeks}w ago`
  }

  const years = Math.max(1, Math.round(diffDays / 365))
  return `${years}y ago`
}

/**
 * Wikitab search card last-update label — relative up to 6 weeks, then a compact date.
 * > 6 weeks and < 1 year: MM/DD or DD/MM; ≥ 1 year: MM/DD/YYYY or DD/MM/YYYY.
 */
export function formatSearchLastUpdatedLabel(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.round(diffMs / 60_000)
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 48) return `${diffHours}h ago`

  const diffDays = Math.max(1, Math.round(diffHours / 24))
  if (diffDays <= SIX_WEEKS_DAYS) {
    if (diffDays < 7) return `${diffDays}d ago`
    const weeks = Math.max(1, Math.round(diffDays / 7))
    return `${weeks}w ago`
  }

  return formatCompactCalendarDate(date, diffDays >= 365, prefersDayFirstDate())
}

/** Relative "Updated …" from an ISO timestamp. */
export function formatRelativeUpdate(iso: string): string {
  const duration = formatRelativeUpdateDuration(iso)
  if (duration === iso) return iso
  return duration === 'just now' ? 'Updated just now' : `Updated ${duration}`
}

/** Tooltip for compact page-view count in search cards. */
export function pageViewsTooltip(count: number): string {
  return `${count.toLocaleString()} views this month`
}

/** Tooltip for compact reference count in search cards. */
export function referenceCountTooltip(count: number): string {
  return `${count.toLocaleString()} reference${count === 1 ? '' : 's'}`
}

/** Tooltip for compact last-update label in search cards. */
export function formatLastUpdatedTooltip(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return `Last updated ${iso}`

  const formatted = date.toLocaleString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  return `Last updated ${formatted}`
}

export function isTrending(signals: {
  trust_and_relevance?: {
    trending?: {
      top?: { read?: boolean; edited?: boolean; read_and_edited?: boolean }
    }
  }
}): boolean {
  const top = signals.trust_and_relevance?.trending?.top
  if (!top) return false
  return Boolean(top.read || top.edited || top.read_and_edited)
}

export function brandMarkLogo(signals: {
  essential: { default_brand_marks?: { type: string; url: string; name: string }[] }
}): { url: string; name: string } | null {
  const marks = signals.essential.default_brand_marks
  if (!marks?.length) return null
  // Prefer the site icon (W mark) over the full project logo (globe).
  const icon = marks.find((mark) => mark.type === 'icon')
  if (icon) return { url: icon.url, name: icon.name }
  const logo = marks.find((mark) => mark.type === 'logo')
  if (logo) return { url: logo.url, name: logo.name }
  const pick = marks[0]
  return pick ? { url: pick.url, name: pick.name } : null
}

export function sourceLabel(signals: {
  essential: { source_wiki?: { site_name?: string; project_family?: string } }
}): string {
  const wiki = signals.essential.source_wiki
  if (wiki?.project_family === 'wikipedia') return 'Wikipedia'
  return wiki?.site_name ?? 'Wikipedia'
}

/** Canonical /wiki/ URL for display; href should still use essential.link (with wprov). */
export function canonicalArticleDisplayUrl(signals: {
  essential: { title: string; link: string }
}): string {
  const slug = encodeURIComponent(signals.essential.title.replace(/ /g, '_'))
  try {
    const origin = new URL(signals.essential.link).origin
    return `${origin}/wiki/${slug}`
  } catch {
    return signals.essential.link
  }
}

/** Search scenario copy — reference count in result footer. */
export function searchReferenceLabel(count: number): string {
  const display = count < 1000 ? String(count) : formatCompactCount(count)
  return `${display} references`
}

export function searchContributorLabel(count: number): string {
  return `${formatCompactCount(count)} contributor${count === 1 ? '' : 's'}`
}

export function searchPageViewsLabel(count: number): string {
  return `${formatCompactCount(count)} views last month`
}
