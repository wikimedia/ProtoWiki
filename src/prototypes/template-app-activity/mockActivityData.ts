/**
 * Everything on the Activity page is personal-account usage data — there is no
 * public API for it, so this template invents plausible numbers/strings
 * client-side instead of fetching anything. Regenerated on every page load.
 */

const TOP_CATEGORIES_POOL: string[] = [
  'Grammy Award winners',
  'Living people',
  '1996 establishments in Texas',
  '20th-century American novelists',
  'British female singers',
  'Association football forwards',
  'Nobel laureates in Physics',
  'State capitals in the United States',
  'Ivy League alumni',
  'Film directors from California',
]

interface MostViewedSeed {
  title: string
  description: string
  hasThumb: boolean
}

const MOST_VIEWED_POOL: MostViewedSeed[] = [
  { title: 'August 11', description: 'Day of the year', hasThumb: false },
  { title: 'Chad Wackerman', description: 'American drummer (born 1960)', hasThumb: true },
  { title: 'Tal Wilkenfeld', description: 'Australian musician', hasThumb: true },
  { title: 'March 3', description: 'Day of the year', hasThumb: false },
  {
    title: 'Nina Simone',
    description: 'American singer, songwriter and pianist (1933–2003)',
    hasThumb: true,
  },
  {
    title: 'List of state capitals in the United States',
    description: 'Wikimedia list article',
    hasThumb: false,
  },
]

interface HistorySeed {
  title: string
  description: string
}

const HISTORY_POOL: HistorySeed[] = [
  { title: 'Bioluminescence', description: 'Production and emission of light by a living organism' },
  {
    title: 'Terracotta Army',
    description: 'Collection of terracotta sculptures depicting the armies of Qin Shi Huang',
  },
  { title: 'Golden Gate Bridge', description: 'Suspension bridge spanning the Golden Gate strait' },
  {
    title: 'Rosetta Stone',
    description: 'Ancient Egyptian stele inscribed with a decree in three scripts',
  },
  { title: 'Aurora', description: "Natural light display in Earth's sky" },
  { title: 'Sourdough', description: 'Bread made by fermentation of dough using wild yeast' },
  { title: 'Great Barrier Reef', description: "World's largest coral reef system" },
  { title: 'Origami', description: 'Japanese art of paper folding' },
  {
    title: 'Mount Kilimanjaro',
    description: 'Dormant volcano in Tanzania, the highest mountain in Africa',
  },
  {
    title: 'Morse code',
    description: 'Method of encoding text using standardized signal patterns',
  },
  {
    title: 'Bermuda Triangle',
    description: 'Loosely defined region in the western North Atlantic Ocean',
  },
  { title: 'Voyager 1', description: 'Space probe launched by NASA in 1977' },
  { title: 'Meerkat', description: 'Small mongoose found in southern Africa' },
  { title: 'Stonehenge', description: 'Prehistoric monument in Wiltshire, England' },
  {
    title: 'Tessellation',
    description: 'Tiling of a plane using geometric shapes with no overlaps',
  },
  { title: 'Bay of Fundy', description: 'Bay between New Brunswick and Nova Scotia' },
  { title: 'Kintsugi', description: 'Japanese art of repairing broken pottery with gold' },
  { title: 'Petrichor', description: 'Earthy scent produced by rain falling on dry soil' },
]

export interface HistoryEntry {
  title: string
  description: string
  /** `true` when the page was reached by following a link rather than searching. */
  viaLink: boolean
  /** Populated asynchronously from the real article's thumbnail — `null` until loaded. */
  thumbnailUrl: string | null
}

export interface HistoryGroup {
  dateLabel: string
  entries: HistoryEntry[]
}

export interface MostViewedEntry {
  title: string
  description: string
  hasThumb: boolean
  /** Populated asynchronously from the real article's thumbnail — `null` until loaded. */
  thumbnailUrl: string | null
  viewCount: number
  sparkline: number[]
}

export interface ActivityData {
  username: string
  readingMinutesThisWeek: number
  articlesReadThisMonth: number
  articlesSavedThisMonth: number
  topCategories: string[]
  editsThisMonthChart: number[]
  editsThisMonth: number
  viewsOnEditedArticles: number
  viewsChart: number[]
  totalEditsAcrossProjects: number
  gamesPlayed: number
  currentStreak: number | null
  bestStreakGames: number | null
  averageScore: number | null
  contributionsThisMonth: number
  contributionsLastMonth: number
  allTimeTotalEdits: number
  allTimeBestStreakDays: number
  allTimeThanks: number
  lastEditedLabel: string
  recentActivityChart: number[]
  recentActivityEdits: number
  mostViewed: MostViewedEntry[]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function sample<T>(pool: T[], count: number): T[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, pool.length))
}

/** Mostly-flat bar chart with the occasional small spike, matching a quiet edit history. */
function buildMostlyFlatChart(days: number, spikeChance: number): number[] {
  return Array.from({ length: days }, () => (Math.random() < spikeChance ? randomInt(20, 100) : 0))
}

function buildSparkline(points: number, endsHigh: boolean): number[] {
  const values = Array.from({ length: points }, () => randomInt(5, 30))
  if (endsHigh) {
    values[values.length - 1] = randomInt(70, 100)
    values[values.length - 2] = randomInt(40, 70)
  }
  return values
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function buildHistoryGroups(): HistoryGroup[] {
  const dayOffsets = [0, 3, 8, 20, 35].filter(() => Math.random() > 0.1)
  const pool = [...HISTORY_POOL].sort(() => Math.random() - 0.5)
  let cursor = 0

  return dayOffsets.map((offset) => {
    const date = new Date()
    date.setDate(date.getDate() - offset)

    const entryCount = randomInt(1, 2)
    const entries: HistoryEntry[] = []
    for (let i = 0; i < entryCount; i += 1) {
      const seed = pool[cursor % pool.length]
      cursor += 1
      entries.push({
        title: seed.title,
        description: seed.description,
        viaLink: Math.random() < 0.3,
        thumbnailUrl: null,
      })
    }

    return { dateLabel: formatDateLabel(date), entries }
  })
}

function buildMostViewed(): MostViewedEntry[] {
  return sample(MOST_VIEWED_POOL, 3).map((seed) => ({
    ...seed,
    thumbnailUrl: null,
    viewCount: randomInt(500, 45000),
    sparkline: buildSparkline(8, Math.random() > 0.3),
  }))
}

const lastEditedFormatter = new Intl.DateTimeFormat('en-US', {
  month: '2-digit',
  day: '2-digit',
  year: 'numeric',
})

function randomPastDate(maxDaysAgo: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - randomInt(1, maxDaysAgo))
  return date
}

export function generateActivityData(): ActivityData {
  const contributionsThisMonth = Math.random() < 0.7 ? 0 : randomInt(1, 6)

  return {
    username: 'Username',
    readingMinutesThisWeek: randomInt(0, 240),
    articlesReadThisMonth: randomInt(1, 40),
    articlesSavedThisMonth: randomInt(0, 25),
    topCategories: sample(TOP_CATEGORIES_POOL, 3),
    editsThisMonthChart: buildMostlyFlatChart(30, 0.05),
    editsThisMonth: contributionsThisMonth,
    viewsOnEditedArticles: randomInt(1000, 120000),
    viewsChart: buildSparkline(20, true),
    totalEditsAcrossProjects: randomInt(0, 60),
    gamesPlayed: randomInt(0, 12),
    currentStreak: Math.random() < 0.6 ? null : randomInt(1, 14),
    bestStreakGames: Math.random() < 0.6 ? null : randomInt(1, 30),
    averageScore: Math.random() < 0.6 ? null : randomInt(1, 5),
    contributionsThisMonth,
    contributionsLastMonth: randomInt(0, 5),
    allTimeTotalEdits: randomInt(0, 80),
    allTimeBestStreakDays: randomInt(0, 10),
    allTimeThanks: randomInt(0, 30),
    lastEditedLabel: lastEditedFormatter.format(randomPastDate(700)),
    recentActivityChart: buildMostlyFlatChart(30, 0.05),
    recentActivityEdits: Math.random() < 0.7 ? 0 : randomInt(1, 8),
    mostViewed: buildMostViewed(),
  }
}

export function generateHistoryGroups(): HistoryGroup[] {
  return buildHistoryGroups()
}
