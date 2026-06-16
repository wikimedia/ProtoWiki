export type InterestsChipKind = 'page' | 'topic'

export interface InterestsChipEntry {
  id: string
  label: string
  selected: boolean
  kind: InterestsChipKind
  pinned?: boolean
  categoryId?: string
}

export interface InterestsPersonalization {
  editingHistory: boolean
  watchlist: boolean
  readingList: boolean
}

export interface InterestsSettings {
  personalization: InterestsPersonalization
  chips: InterestsChipEntry[]
}

export interface InterestsCatalogTopic {
  id: string
  label: string
  categoryId: string
  categoryLabel: string
}

export interface InterestsCatalogCategory {
  id: string
  label: string
}

export const MAX_INTEREST_CHIPS = 10

export const TOPIC_CATEGORY_DEFINITIONS: InterestsCatalogCategory[] = [
  { id: 'culture', label: 'Culture' },
  { id: 'history-and-society', label: 'History and Society' },
  { id: 'science-technology-math', label: 'Science, Technology, and Math' },
  { id: 'regions', label: 'Regions' },
]

const TOPIC_LABELS_BY_CATEGORY: Record<string, string[]> = {
  culture: [
    'Architecture',
    'Art',
    'Fashion',
    'Entertainment',
    'Comics & anime',
    'Literature',
    'Music',
    'Sports',
    'TV/Film',
    'Video games',
  ],
  'history-and-society': [
    'Biography (all)',
    'Biography (women)',
    'Business & economics',
    'Education',
    'Food & drink',
    'Military & warfare',
    'History',
    'Philosophy & religion',
    'Politics & government',
    'Society',
    'Transportation',
  ],
  'science-technology-math': [
    'Biology',
    'Computers & internet',
    'Chemistry',
    'Earth & environment',
    'Engineering',
    'General science',
    'Mathematics',
    'Medicine & health',
    'Physics',
    'Technology',
  ],
  regions: [
    'Africa',
    'Asia',
    'Central America',
    'Europe',
    'North America',
    'Oceania',
    'South America',
  ],
}

/** Starter chips shown on first join (all unticked). */
export const STARTER_TOPIC_CHIP_IDS = [
  // 'culture:art',
  // 'culture:music',
  // 'history-and-society:history',
  // 'culture:sports',
  // 'science-technology-math:technology',
] as const

export function slugifyInterestsLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function chipKey(kind: InterestsChipKind, id: string): string {
  return `${kind}:${id}`
}

export function buildTopicCatalog(): InterestsCatalogTopic[] {
  const catalog: InterestsCatalogTopic[] = []

  for (const category of TOPIC_CATEGORY_DEFINITIONS) {
    for (const label of TOPIC_LABELS_BY_CATEGORY[category.id] ?? []) {
      catalog.push({
        id: `${category.id}:${slugifyInterestsLabel(label)}`,
        label,
        categoryId: category.id,
        categoryLabel: category.label,
      })
    }
  }

  return catalog
}

export const INTERESTS_TOPIC_CATALOG = buildTopicCatalog()

function pageChip(id: string, label: string, selected: boolean): InterestsChipEntry {
  return { id, label, selected, kind: 'page' }
}

function topicChipFromCatalog(entry: InterestsCatalogTopic, selected = false): InterestsChipEntry {
  return {
    id: entry.id,
    label: entry.label,
    selected,
    kind: 'topic',
    categoryId: entry.categoryId,
  }
}

function buildDefaultTopicChips(): InterestsChipEntry[] {
  const byId = new Map(INTERESTS_TOPIC_CATALOG.map((entry) => [entry.id, entry]))
  return STARTER_TOPIC_CHIP_IDS.map((id) => {
    const entry = byId.get(id)
    if (!entry) {
      throw new Error(`Missing starter topic: ${id}`)
    }
    return topicChipFromCatalog(entry, false)
  })
}

function buildDefaultChips(): InterestsChipEntry[] {
  return [
    // pageChip('gorillaz', 'Gorillaz', true),
    // pageChip('dsei', 'DSEI', true),
    // pageChip('wet-leg', 'Wet Leg', false),
    // pageChip('dada', 'Dada', false),
    // pageChip('surrealism', 'Surrealism', false),
    ...buildDefaultTopicChips(),
  ]
}

export const DEFAULT_INTERESTS_SETTINGS: InterestsSettings = {
  personalization: {
    editingHistory: true,
    watchlist: true,
    readingList: true,
  },
  chips: buildDefaultChips(),
}

export function getCatalogTopicById(topicId: string): InterestsCatalogTopic | undefined {
  return INTERESTS_TOPIC_CATALOG.find((entry) => entry.id === topicId)
}

export function getCatalogCategoryById(categoryId: string): InterestsCatalogCategory | undefined {
  return TOPIC_CATEGORY_DEFINITIONS.find((entry) => entry.id === categoryId)
}

export function getCatalogTopicsForCategory(categoryId: string): InterestsCatalogTopic[] {
  return INTERESTS_TOPIC_CATALOG.filter((entry) => entry.categoryId === categoryId)
}
