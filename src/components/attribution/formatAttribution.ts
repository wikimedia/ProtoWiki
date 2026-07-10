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

/** Relative "Updated …" from an ISO timestamp. */
export function formatRelativeUpdate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.round(diffMs / 60_000)
  if (diffMinutes < 1) return 'Updated just now'
  if (diffMinutes < 60) return `Updated ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 48) return `Updated ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`

  const diffDays = Math.round(diffHours / 24)
  if (diffDays < 14) return `Updated ${diffDays} day${diffDays === 1 ? '' : 's'} ago`

  return `Last update ${date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })}`
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
