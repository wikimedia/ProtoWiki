import type { HomeArticleCard } from './HomeArticleCards.vue'
import { LINK_RECOMMENDATION_LABEL, taskTypeForTemplates } from './editTaskTypes'
import {
  fetchLinkRecommendations,
  fetchRandomTaskPages,
  fetchTaskPages,
  fetchTemplateTasksAbout,
  type TaskPage,
} from './fetchEditTasks'
import { readDayCache, utcDayKey, writeDayCache } from './homeCache'
import { titleKey } from './useHomeSeeds'

const CACHE_SLOT = 'suggested-edits'
/** Up to four pages of three when personal; a single card for a reader with no pages. */
export const PERSONAL_SUGGESTION_COUNT = 12
export const RANDOM_SUGGESTION_COUNT = 1
const RELATED_SEED_COUNT = 5
const RELATED_PER_SEED = 4
const LINK_RECOMMENDATION_SEEDS = 3
const LINK_RECOMMENDATIONS_PER_SEED = 3
const RANDOM_POOL = 10

interface Task {
  page: TaskPage
  label: string
}

/** First task label for a page, from its maintenance templates. */
function templateTask(page: TaskPage): Task | null {
  const type = taskTypeForTemplates(page.templates)
  return type ? { page, label: type.label } : null
}

function templateTasks(pages: TaskPage[]): Task[] {
  return pages.map(templateTask).filter((task): task is Task => task !== null)
}

/** Round-robin, so the first candidates mix seeds instead of emptying one. */
function interleave<T>(lists: T[][]): T[] {
  const out: T[] = []
  for (let i = 0; lists.some((list) => i < list.length); i++) {
    for (const list of lists) if (i < list.length) out.push(list[i])
  }
  return out
}

/** One seed at a time, so each kind of lookup has a single request in flight. */
async function perSeed<T>(
  seeds: string[],
  fetchFor: (seed: string) => Promise<T[]>,
  signal: AbortSignal,
): Promise<T[][]> {
  const results: T[][] = []
  for (const seed of seeds) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    // One seed failing shouldn't cost the others.
    results.push(await fetchFor(seed).catch((error: unknown) => {
      if (signal.aborted) throw error
      return []
    }))
  }
  return results
}

/**
 * Growth's newcomer-task signals, around the reader's pages: their own pages'
 * maintenance templates (one call), articles about them carrying a task template
 * (one search per seed), and articles linking to them with an "Add a link"
 * recommendation. Mixed round-robin, own pages first.
 */
async function personalTasks(seeds: string[], signal: AbortSignal): Promise<Task[]> {
  const [own, related, linkRecommendations] = await Promise.all([
    fetchTaskPages(seeds, signal),
    perSeed(
      seeds.slice(0, RELATED_SEED_COUNT),
      (seed) => fetchTemplateTasksAbout(seed, RELATED_PER_SEED, signal),
      signal,
    ),
    perSeed(
      seeds.slice(0, LINK_RECOMMENDATION_SEEDS),
      (seed) => fetchLinkRecommendations(seed, LINK_RECOMMENDATIONS_PER_SEED, signal),
      signal,
    ),
  ])

  const linkTasks = linkRecommendations.map((pages) =>
    pages.map((page) => ({ page, label: LINK_RECOMMENDATION_LABEL })),
  )
  // Own pages first — they're what the reader already cares about — then a mix.
  return [...templateTasks(own), ...interleave([...related.map(templateTasks), ...linkTasks])]
}

/**
 * Articles with something to improve, each labelled with its task ("Find a
 * reference"…). Personal when the reader has pages to grow from (`seeds`);
 * otherwise one random suggestion.
 */
export async function loadSuggestedEdits(
  seeds: string[],
  signal: AbortSignal,
): Promise<HomeArticleCard[]> {
  const personal = seeds.length > 0
  const limit = personal ? PERSONAL_SUGGESTION_COUNT : RANDOM_SUGGESTION_COUNT

  // Random suggestions stay for the day too, so the one card doesn't change each visit.
  const cacheKey = `${utcDayKey()}|${personal ? seeds.map(titleKey).sort().join('|') : 'random'}`
  const cached = readDayCache<HomeArticleCard>(CACHE_SLOT, cacheKey)
  if (cached) return cached

  const tasks = personal
    ? await personalTasks(seeds, signal)
    : templateTasks(await fetchRandomTaskPages(RANDOM_POOL, signal))

  const seen = new Set<string>()
  const cards: HomeArticleCard[] = []
  for (const { page, label } of tasks) {
    const key = titleKey(page.title)
    if (seen.has(key) || cards.length >= limit) continue
    seen.add(key)
    cards.push({
      title: page.title,
      description: page.description,
      thumbnailUrl: page.thumbnailUrl,
      supportingText: label,
    })
  }

  writeDayCache(CACHE_SLOT, cacheKey, cards)
  return cards
}
