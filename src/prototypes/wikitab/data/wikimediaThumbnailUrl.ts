/** 96px card slot × ~2 for retina. */
export const WIKITAB_FEED_CARD_THUMB_WIDTH = 200

/** 40px Codex menu slot × 3 for retina. */
export const WIKITAB_SEARCH_POPOVER_THUMB_WIDTH = 120

/** Normalize protocol-relative Commons / wiki thumbnail URLs. */
export function normalizeWikimediaThumbnailUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  return url.startsWith('//') ? `https:${url}` : url
}

/**
 * Request at least `minWidth` px from a Commons thumb URL (`…/220px-File.jpg`).
 * No-op when the path has no `Npx-` segment.
 */
export function wikimediaThumbnailAtLeast(
  url: string | undefined,
  minWidth: number,
): string | undefined {
  const normalized = normalizeWikimediaThumbnailUrl(url)
  if (!normalized) return undefined

  return normalized.replace(/\/(\d+)px-([^/?#]+)(?:[?#].*)?$/, (_match, width, rest) => {
    const current = parseInt(width, 10)
    const target = Number.isFinite(current) ? Math.max(current, minWidth) : minWidth
    return `/${target}px-${rest}`
  })
}
