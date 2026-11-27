import { fetchArticleBody } from '@/components/article/shared/fetchArticleBody'

/** The section a link points at (`[[Blog#History]]`), with the opening of its text. */
export interface WikilinkCardSection {
  /** The link's fragment, as the heading's anchor id (e.g. `History`). */
  anchor: string
  /** The heading's visible text. */
  heading: string
  /** The section's first paragraph, as plain text (no reference markers). */
  excerpt: string
}

/**
 * Data for the custom link preview card: REST page summary + two revision lookups, plus the
 * linked section's excerpt (from the cached article HTML) for section links.
 */
export interface WikilinkCardData {
  title: string
  extract: string
  /** Wikipedia's HTML summary (bolds the title, like the native preview). */
  extractHtml?: string
  url: string
  /** The page's revision history. */
  historyUrl: string
  image?: string
  /** ISO timestamp of the page's first revision. */
  createdAt?: string
  /** Revisions in the last 7 days. */
  editsThisWeek?: number
  /** Set for section links whose section was found. */
  section?: WikilinkCardSection
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
/**
 * Card is 450px wide, so 2× is 900px. Wikimedia only serves thumbnails at
 * $wgThumbnailSteps widths (…, 500, 960, 1280, …), so ask for the next step up.
 */
const IMAGE_WIDTH = 960

function pickImage(page: any): string | undefined {
  const thumb = page.thumbnail
  const original = page.originalimage
  if (!thumb?.source) return undefined
  if (original?.source && original.width <= IMAGE_WIDTH) return original.source
  return thumb.source.replace(/\/\d+px-/, `/${IMAGE_WIDTH}px-`)
}

async function queryRevisions(
  wiki: string,
  title: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<{ timestamp: string }[]> {
  const search = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    prop: 'revisions',
    rvprop: 'timestamp',
    redirects: '1',
    titles: title,
    ...params,
  })
  const response = await fetch(`${wiki}/w/api.php?${search}`, { signal })
  if (!response.ok) return []
  const data = await response.json()
  return data?.query?.pages?.[0]?.revisions ?? []
}

/** Wait for an image to load (or fail), so the card appears with it; capped so a slow image can't hold the card back. */
function preloadImage(src: string, timeoutMs = 1000): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = img.onerror = () => resolve()
    setTimeout(resolve, timeoutMs)
    img.src = src
  })
}

const cache = new Map<string, Promise<WikilinkCardData | null>>()

/**
 * Resolves to null when there's no page to preview. Cached per title (and section), so
 * hovering a link again is instant. Not abortable on purpose: a hover that ends early still
 * warms the cache.
 */
export function fetchCardData(
  wiki: string,
  title: string,
  section = '',
): Promise<WikilinkCardData | null> {
  const key = `${wiki}|${title}|${section}`
  let pending = cache.get(key)
  if (!pending) {
    pending = loadCardData(wiki, title, section).catch(() => null)
    pending.then((data) => {
      if (!data) cache.delete(key)
    })
    cache.set(key, pending)
  }
  return pending
}

/**
 * The opening of a section, from the article's Parsoid HTML (the same cached fetch the article
 * panel uses). Undefined if the section can't be found or has no paragraph.
 */
async function loadSection(
  wiki: string,
  title: string,
  section: string,
): Promise<WikilinkCardSection | undefined> {
  const anchor = section.trim().replace(/ /g, '_')
  const body = await fetchArticleBody(title, new URL(wiki).host)
  const doc = new DOMParser().parseFromString(body.html, 'text/html')
  const target = doc.getElementById(anchor)
  const heading = target?.closest('h1, h2, h3, h4, h5, h6') ?? target
  const sectionEl = heading?.closest('section')
  if (!heading || !sectionEl) return undefined
  const paragraphs = [
    ...sectionEl.querySelectorAll(':scope > p'),
    ...sectionEl.querySelectorAll('p'),
  ]
  for (const paragraph of paragraphs) {
    const clone = paragraph.cloneNode(true) as HTMLElement
    clone.querySelectorAll('sup.reference, .mw-ref, style, .noprint').forEach((el) => el.remove())
    const excerpt = (clone.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (excerpt) return { anchor, heading: (heading.textContent ?? section).trim(), excerpt }
  }
  return undefined
}

async function loadCardData(
  wiki: string,
  title: string,
  section: string,
): Promise<WikilinkCardData | null> {
  const summaryUrl = `${wiki}/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`
  // All the requests at once; the revision queries follow redirects themselves.
  const [page, first, recent, sectionData] = await Promise.all([
    fetch(summaryUrl).then((response) => (response.ok ? response.json() : null)),
    queryRevisions(wiki, title, { rvdir: 'newer', rvlimit: '1' }).catch(() => []),
    queryRevisions(wiki, title, {
      rvlimit: 'max',
      rvend: new Date(Date.now() - WEEK_MS).toISOString(),
    }).catch(() => null),
    section ? loadSection(wiki, title, section).catch(() => undefined) : undefined,
  ])
  if (!page) return null
  const canonical: string = page.title || title
  const image = pickImage(page)
  if (image) await preloadImage(image)

  return {
    title: canonical,
    extract: page.extract || '',
    extractHtml: page.extract_html || undefined,
    url:
      (page.content_urls?.desktop?.page ||
        `${wiki}/wiki/${encodeURIComponent(canonical.replace(/ /g, '_'))}`) +
      (sectionData ? `#${encodeURIComponent(sectionData.anchor)}` : ''),
    historyUrl: `${wiki}/w/index.php?${new URLSearchParams({ title: canonical, action: 'history' })}`,
    image,
    createdAt: first[0]?.timestamp,
    editsThisWeek: recent ? recent.length : undefined,
    section: sectionData,
  }
}
