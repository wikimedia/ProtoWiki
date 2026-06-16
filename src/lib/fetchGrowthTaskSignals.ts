import { normalizeLang, wikiHostFromLang, wikimediaApiFetchHeaders } from '@/config'

import { normalizeTitleKey } from './fetchMorelike'

/**
 * Per-page signals read from an article's CirrusSearch index document
 * (`prop=cirrusdoc`). These are the same raw signals the Wikimedia Growth
 * team's newcomer-task search keys on: maintenance templates, dated maintenance
 * tracking categories, structured-task `recommendation.*` weighted tags,
 * section headings, outgoing-link density, and article size.
 */
export interface GrowthTaskSignals {
  templates: string[]
  categories: string[]
  weightedTags: string[]
  headings: string[]
  outgoingLinkCount: number
  textBytes: number
}

export class GrowthTaskSignalsError extends Error {
  constructor(
    message: string,
    public readonly code: 'aborted' | 'http' | 'empty',
  ) {
    super(message)
    this.name = 'GrowthTaskSignalsError'
  }
}

interface CirrusDocSource {
  template?: string[]
  category?: string[]
  weighted_tags?: string[]
  heading?: string[]
  outgoing_link?: string[]
  text_bytes?: number
}

interface CirrusDocPage {
  title?: string
  cirrusdoc?: Array<{ source?: CirrusDocSource }>
}

interface CirrusDocResponse {
  error?: { code?: string; info?: string }
  query?: { pages?: CirrusDocPage[] }
}

function buildSignalsRequestUrl(titles: string[], lang: string): string {
  const wikiHost = wikiHostFromLang(lang)
  const params = new URLSearchParams({
    action: 'query',
    prop: 'cirrusdoc',
    titles: titles.join('|'),
    format: 'json',
    formatversion: '2',
    origin: '*',
  })
  return `https://${wikiHost}/w/api.php?${params.toString()}`
}

function mapSource(source: CirrusDocSource | undefined): GrowthTaskSignals {
  return {
    templates: source?.template ?? [],
    categories: source?.category ?? [],
    weightedTags: source?.weighted_tags ?? [],
    headings: source?.heading ?? [],
    outgoingLinkCount: source?.outgoing_link?.length ?? 0,
    textBytes: typeof source?.text_bytes === 'number' ? source.text_bytes : 0,
  }
}

/**
 * Batch-fetch CirrusSearch signals for up to 50 titles in a single request,
 * keyed by `normalizeTitleKey`. Pages without a cirrusdoc are simply absent
 * from the returned map.
 */
export async function fetchGrowthTaskSignals(
  titles: string[],
  options: { lang?: string; signal?: AbortSignal } = {},
): Promise<Map<string, GrowthTaskSignals>> {
  if (options.signal?.aborted) {
    throw new GrowthTaskSignalsError('Request aborted', 'aborted')
  }

  const uniqueTitles = [...new Set(titles.map((title) => title.trim()).filter(Boolean))]
  if (!uniqueTitles.length) {
    throw new GrowthTaskSignalsError('No titles to check', 'empty')
  }

  const lang = normalizeLang(options.lang ?? 'en')
  const requestUrl = buildSignalsRequestUrl(uniqueTitles, lang)

  let response: Response
  try {
    response = await fetch(requestUrl, {
      signal: options.signal,
      headers: wikimediaApiFetchHeaders('growth-task-signals'),
    })
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new GrowthTaskSignalsError('Request aborted', 'aborted')
    }
    throw error
  }

  if (!response.ok) {
    throw new GrowthTaskSignalsError(`Signals fetch failed (HTTP ${response.status})`, 'http')
  }

  const data = (await response.json()) as CirrusDocResponse
  if (data.error) {
    throw new GrowthTaskSignalsError(data.error.info ?? data.error.code ?? 'Signals fetch failed', 'http')
  }

  const signalsByTitle = new Map<string, GrowthTaskSignals>()
  for (const page of data.query?.pages ?? []) {
    if (!page.title) continue
    const source = page.cirrusdoc?.[0]?.source
    if (!source) continue
    signalsByTitle.set(normalizeTitleKey(page.title), mapSource(source))
  }

  return signalsByTitle
}
