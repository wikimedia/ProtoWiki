import { wikimediaApiFetchHeaders, wikiHostFromLang } from '@/config'

export interface ForYouSlide {
  pageid: number
  /** dbkey-form title (underscores) — use for building URLs. */
  title: string
  displayTitle: string
  description: string
  extract: string
  /** Large enough to fill the slide as a full-bleed background — null if the
   * page's thumbnail is too small (or missing) to hold up at that size. */
  heroImageUrl: string | null
  /** The page's thumbnail regardless of size — shown small in the card
   * footer on slides that don't have a `heroImageUrl`. */
  thumbnailUrl: string | null
  /** Only used when `heroImageUrl` is null — a stable-ish accent for the color card. */
  cardColor: string
}

export interface ForYouStory {
  reasonLabel: string
  slides: ForYouSlide[]
}

interface RawPage {
  pageid?: number
  title?: string
  description?: string
  extract?: string
  thumbnail?: { source?: string; width?: number }
}

/** Thumbnails narrower than this look pixelated stretched full-bleed — treat
 * them as "no hero image" and show them small in the card footer instead. */
const MIN_HERO_WIDTH = 400

interface RawQueryResponse {
  query?: { pages?: Record<string, RawPage> }
}

const SLIDES_PER_STORY = 5
const STORY_COUNT = 6

const CARD_COLORS = [
  '#7a3b3b',
  '#5c4570',
  '#3b5c47',
  '#3b4a72',
  '#72543b',
  '#3b6272',
  '#6b3b5c',
  '#4a5c3b',
]

interface InterestTopic {
  label: string
  seeds: string[]
}

const INTEREST_TOPICS: InterestTopic[] = [
  { label: 'Visual arts', seeds: ['Painting', 'Vincent van Gogh', 'Frida Kahlo', 'Sculpture'] },
  { label: 'History', seeds: ['Ancient Rome', 'World War II', 'Industrial Revolution', 'Silk Road'] },
  { label: 'Science', seeds: ['Quantum mechanics', 'Charles Darwin', 'DNA', 'Black hole'] },
  { label: 'Nature', seeds: ['Rainforest', 'Coral reef', 'Bird migration', 'Volcano'] },
  { label: 'Music', seeds: ['Jazz', 'The Beatles', 'Classical music', 'Hip hop music'] },
  { label: 'Film', seeds: ['Alfred Hitchcock', 'Science fiction film', 'Akira Kurosawa', 'Animation'] },
  { label: 'Sports', seeds: ['Association football', 'Olympic Games', 'Tennis', 'Marathon'] },
  { label: 'Literature', seeds: ['Science fiction', 'William Shakespeare', 'Poetry', 'Mythology'] },
]

function randomInt(max: number): number {
  return Math.floor(Math.random() * max)
}

function pick<T>(pool: T[]): T {
  return pool[randomInt(pool.length)]
}

function cardColorFor(pageid: number): string {
  return CARD_COLORS[pageid % CARD_COLORS.length]
}

function mapPage(raw: RawPage): ForYouSlide | null {
  if (typeof raw.pageid !== 'number' || typeof raw.title !== 'string') return null
  const thumbnailUrl = raw.thumbnail?.source ?? null
  const isHeroSized = (raw.thumbnail?.width ?? 0) >= MIN_HERO_WIDTH
  return {
    pageid: raw.pageid,
    title: raw.title,
    displayTitle: raw.title,
    description: raw.description ?? '',
    extract: (raw.extract ?? '').trim(),
    heroImageUrl: isHeroSized ? thumbnailUrl : null,
    thumbnailUrl,
    cardColor: cardColorFor(raw.pageid),
  }
}

async function fetchActionApi(
  host: string,
  params: Record<string, string>,
  signal: AbortSignal | undefined,
): Promise<RawPage[]> {
  const query = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    prop: 'pageimages|description|extracts',
    exintro: '1',
    explaintext: '1',
    exchars: '400',
    piprop: 'thumbnail',
    pithumbsize: '1000',
    ...params,
  })

  const response = await fetch(`https://${host}/w/api.php?${query.toString()}`, {
    signal,
    headers: wikimediaApiFetchHeaders('for-you-feed'),
  })
  if (!response.ok) return []

  const data = (await response.json()) as RawQueryResponse
  return Object.values(data.query?.pages ?? {})
}

async function fetchRandomSeeds(
  host: string,
  count: number,
  signal: AbortSignal | undefined,
): Promise<RawPage[]> {
  return fetchActionApi(
    host,
    { generator: 'random', grnnamespace: '0', grnlimit: String(count) },
    signal,
  )
}

async function fetchMoreLike(
  host: string,
  seedTitle: string,
  limit: number,
  signal: AbortSignal | undefined,
): Promise<RawPage[]> {
  return fetchActionApi(
    host,
    {
      generator: 'search',
      gsrsearch: `morelike:${seedTitle}`,
      gsrlimit: String(limit),
      gsrnamespace: '0',
    },
    signal,
  )
}

/** Builds a fresh, randomized "For you" feed — real Wikipedia articles, fake personalization. */
export async function fetchForYouStories(
  options: { signal?: AbortSignal; lang?: string } = {},
): Promise<ForYouStory[]> {
  const lang = options.lang ?? 'en'
  const host = wikiHostFromLang(lang)
  const { signal } = options

  const readSeedCount = Math.ceil(STORY_COUNT / 2)
  const [randomSeeds] = await Promise.all([fetchRandomSeeds(host, readSeedCount, signal)])

  const storyPlans = Array.from({ length: STORY_COUNT }, (_, index) => {
    if (index % 2 === 0 && randomSeeds[index / 2]) {
      const seed = randomSeeds[index / 2]
      return {
        reasonLabel: `Because you read: ${seed.title}`,
        searchSeedTitle: seed.title as string,
      }
    }
    const topic = pick(INTEREST_TOPICS)
    return {
      reasonLabel: `Because of your interest: ${topic.label}`,
      searchSeedTitle: pick(topic.seeds),
    }
  })

  const stories = await Promise.all(
    storyPlans.map(async (plan) => {
      const pages = await fetchMoreLike(host, plan.searchSeedTitle, SLIDES_PER_STORY, signal)
      const slides = pages.map(mapPage).filter((slide): slide is ForYouSlide => slide !== null)
      return { reasonLabel: plan.reasonLabel, slides }
    }),
  )

  return stories.filter((story) => story.slides.length > 0)
}
