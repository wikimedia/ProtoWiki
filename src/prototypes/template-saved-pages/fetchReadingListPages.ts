import { wikimediaApiFetchHeaders, wikiHostFromLang } from '@/config'
import { resolveWikiPageTitles, wikiPageNotFoundMessage } from '@/utils/wikiPageTitles'

const THUMBNAIL_SIZE = 320

interface PageRecord {
  pageid: number
  title: string
  description: string
  thumbnailUrl: string | null
}

export type SavedPageListItem =
  | ({
      kind: 'page'
    } & PageRecord)
  | {
      kind: 'placeholder'
      requestedTitle: string
      title: string
      description: string
    }

/** @deprecated Use SavedPageListItem */
export type SavedPageEntry = PageRecord

/** @deprecated Use {@link wikiPageNotFoundMessage} from `@/utils/wikiPageTitles`. */
export const savedPageNotFoundMessage = wikiPageNotFoundMessage

async function batchQueryPageDetails(
  titles: readonly string[],
  host: string,
  signal?: AbortSignal,
): Promise<Map<string, PageRecord>> {
  const byTitle = new Map<string, PageRecord>()
  if (!titles.length) return byTitle

  const params = new URLSearchParams({
    action: 'query',
    titles: [...new Set(titles)].join('|'),
    prop: 'pageimages|description',
    piprop: 'thumbnail',
    pithumbsize: String(THUMBNAIL_SIZE),
    pilicense: 'any',
    format: 'json',
    formatversion: '2',
    origin: '*',
  })

  const response = await fetch(`https://${host}/w/api.php?${params.toString()}`, {
    signal,
    headers: wikimediaApiFetchHeaders('saved-reading-list'),
  })

  if (!response.ok) {
    throw new Error(`Failed to load saved pages (HTTP ${response.status}).`)
  }

  const data = (await response.json()) as {
    query?: {
      pages?: Array<{
        pageid?: number
        title?: string
        missing?: boolean
        description?: string | null
        thumbnail?: { source?: string }
      }>
    }
  }

  for (const page of data.query?.pages ?? []) {
    if (page.missing || typeof page.pageid !== 'number' || !page.title) continue
    byTitle.set(page.title, {
      pageid: page.pageid,
      title: page.title,
      description: (page.description ?? '').trim(),
      thumbnailUrl: page.thumbnail?.source ?? null,
    })
  }

  return byTitle
}

/**
 * Loads saved reading-list rows in input order — real pages plus placeholders for
 * titles that cannot be resolved.
 */
export async function fetchReadingListPages(
  titles: readonly string[],
  options: { signal?: AbortSignal; lang?: string } = {},
): Promise<SavedPageListItem[]> {
  const trimmed = titles.map((t) => t.trim()).filter((t) => t.length > 0)
  if (!trimmed.length) return []

  const host = wikiHostFromLang(options.lang ?? 'en')
  const signal = options.signal

  const canonicalTitles = await resolveWikiPageTitles(trimmed, { lang: options.lang, signal })
  const details = await batchQueryPageDetails(canonicalTitles, host, signal)

  return trimmed.map((input, index) => {
    const canonical = canonicalTitles[index]
    const page = details.get(canonical)
    if (page) {
      return {
        kind: 'page',
        pageid: page.pageid,
        title: page.title,
        description: page.description,
        thumbnailUrl: page.thumbnailUrl,
      }
    }
    return {
      kind: 'placeholder',
      requestedTitle: input,
      title: input,
      description: wikiPageNotFoundMessage(input),
    }
  })
}
