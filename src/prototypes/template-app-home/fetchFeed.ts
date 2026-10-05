import { wikimediaApiFetchHeaders, wikiHostFromLang } from '@/config'

export interface FeedTfa {
  /** dbkey-form title (underscores) — use for building URLs. */
  title: string
  displayTitle: string
  description: string
  extractHtml: string
  thumbnailUrl: string | null
}

export interface FeedMostReadArticle {
  pageid: number
  /** dbkey-form title (underscores) — use for building URLs. */
  title: string
  displayTitle: string
  description: string
  thumbnailUrl: string | null
  views: number
  rank: number
  trend: 'up' | 'down' | 'flat'
}

export interface FeedNewsStory {
  storyHtml: string
  thumbnailUrl: string | null
}

export interface FeedOnThisDayPage {
  pageid: number
  /** dbkey-form title (underscores) — use for building URLs. */
  title: string
  displayTitle: string
  description: string
  thumbnailUrl: string | null
}

export interface FeedOnThisDay {
  year: number
  text: string
  pages: FeedOnThisDayPage[]
}

export interface FeedImage {
  thumbnailUrl: string | null
  descriptionHtml: string
  artistHtml: string
  licenseType: string
  licenseUrl: string
}

export interface Feed {
  dateLabel: string
  tfa: FeedTfa | null
  mostRead: FeedMostReadArticle[]
  dyk: string[]
  news: FeedNewsStory[]
  onThisDay: FeedOnThisDay[]
  image: FeedImage | null
}

interface RawSummaryLike {
  pageid?: number
  title?: string
  normalizedtitle?: string
  description?: string
  extract_html?: string
  thumbnail?: { source?: string }
}

interface RawViewHistoryPoint {
  views?: number
}

interface RawMostReadArticle extends RawSummaryLike {
  views?: number
  rank?: number
  view_history?: RawViewHistoryPoint[]
}

interface RawNewsItem {
  story?: string
  links?: RawSummaryLike[]
}

interface RawOnThisDayItem {
  year?: number
  text?: string
  pages?: RawSummaryLike[]
}

interface RawFeed {
  tfa?: RawSummaryLike
  mostread?: { articles?: RawMostReadArticle[] }
  dyk?: Array<{ html?: string }>
  news?: RawNewsItem[]
  onthisday?: RawOnThisDayItem[]
  image?: {
    thumbnail?: { source?: string }
    description?: { html?: string }
    artist?: { html?: string }
    license?: { type?: string; url?: string }
  }
}

function trendFromHistory(history: RawViewHistoryPoint[] | undefined): 'up' | 'down' | 'flat' {
  if (!history || history.length < 2) return 'flat'
  const last = history[history.length - 1]?.views ?? 0
  const prev = history[history.length - 2]?.views ?? 0
  if (last > prev) return 'up'
  if (last < prev) return 'down'
  return 'flat'
}

function mapSummary(raw: RawSummaryLike | undefined): FeedOnThisDayPage | null {
  if (!raw || typeof raw.pageid !== 'number' || typeof raw.title !== 'string') return null
  return {
    pageid: raw.pageid,
    title: raw.title,
    displayTitle: raw.normalizedtitle ?? raw.title.replace(/_/g, ' '),
    description: raw.description ?? '',
    thumbnailUrl: raw.thumbnail?.source ?? null,
  }
}

const dateLabelFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

/** Loads today's real Community feed — the same REST feed the Wikipedia apps use. */
export async function fetchFeed(options: { signal?: AbortSignal; lang?: string } = {}): Promise<Feed> {
  const lang = options.lang ?? 'en'
  const host = wikiHostFromLang(lang)

  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  const response = await fetch(`https://${host}/api/rest_v1/feed/featured/${year}/${month}/${day}`, {
    signal: options.signal,
    headers: {
      Accept: 'application/json',
      ...wikimediaApiFetchHeaders('explore-feed'),
    },
  })

  if (!response.ok) {
    throw new Error('Failed to load the feed.')
  }

  const data = (await response.json()) as RawFeed

  const tfa: FeedTfa | null =
    data.tfa && typeof data.tfa.title === 'string'
      ? {
          title: data.tfa.title,
          displayTitle: data.tfa.normalizedtitle ?? data.tfa.title.replace(/_/g, ' '),
          description: data.tfa.description ?? '',
          extractHtml: data.tfa.extract_html ?? '',
          thumbnailUrl: data.tfa.thumbnail?.source ?? null,
        }
      : null

  const mostRead: FeedMostReadArticle[] = (data.mostread?.articles ?? [])
    .filter((article): article is RawMostReadArticle => typeof article.pageid === 'number')
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .slice(0, 5)
    .map((article) => ({
      pageid: article.pageid as number,
      title: article.title ?? '',
      displayTitle: article.normalizedtitle ?? (article.title ?? '').replace(/_/g, ' '),
      description: article.description ?? '',
      thumbnailUrl: article.thumbnail?.source ?? null,
      views: article.views ?? 0,
      rank: article.rank ?? 0,
      trend: trendFromHistory(article.view_history),
    }))

  const dyk = (data.dyk ?? [])
    .map((entry) => entry.html)
    .filter((html): html is string => typeof html === 'string' && html.length > 0)
    .slice(0, 3)

  const news: FeedNewsStory[] = (data.news ?? []).slice(0, 5).map((item) => ({
    storyHtml: item.story ?? '',
    thumbnailUrl: item.links?.[0]?.thumbnail?.source ?? null,
  }))

  const onThisDay: FeedOnThisDay[] = (data.onthisday ?? [])
    .filter((item): item is Required<Pick<RawOnThisDayItem, 'year' | 'text'>> & RawOnThisDayItem =>
      typeof item.year === 'number' && typeof item.text === 'string',
    )
    .slice(0, 5)
    .map((item) => ({
      year: item.year,
      text: item.text,
      pages: (item.pages ?? [])
        .map(mapSummary)
        .filter((page): page is FeedOnThisDayPage => page !== null),
    }))

  const image: FeedImage | null =
    data.image && (data.image.thumbnail?.source || data.image.description?.html)
      ? {
          thumbnailUrl: data.image.thumbnail?.source ?? null,
          descriptionHtml: data.image.description?.html ?? '',
          artistHtml: data.image.artist?.html ?? '',
          licenseType: data.image.license?.type ?? '',
          licenseUrl: data.image.license?.url ?? '',
        }
      : null

  return {
    dateLabel: `Today - ${dateLabelFormatter.format(now)}`,
    tfa,
    mostRead,
    dyk,
    news,
    onThisDay,
    image,
  }
}
