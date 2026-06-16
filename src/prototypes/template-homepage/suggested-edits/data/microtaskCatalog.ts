import type { SuggestionDescriptionPart } from './veSuggestions'

export interface MicrotaskDefinition {
  id: string
  /** Label from Microtask Generator about page. */
  need: string
  /** Shorter heading for the suggestion card UI. */
  heading: string
  descriptionParts: SuggestionDescriptionPart[]
  difficulty: 'easy' | 'medium' | 'hard'
  timeEstimate: string
}

/** Task pool from https://microtask-generator.toolforge.org/about.html */
export const MICROTASK_CATALOG: MicrotaskDefinition[] = [
  {
    id: 'references',
    need: 'Add more references',
    heading: 'Find references',
    descriptionParts: [
      {
        kind: 'text',
        text: 'Add a reliable source to support an unsourced claim in this article.',
      },
    ],
    difficulty: 'easy',
    timeEstimate: '3–5 minutes',
  },
  {
    id: 'wikilinks',
    need: 'Add more internal wikilinks',
    heading: 'Add links',
    descriptionParts: [
      {
        kind: 'text',
        text: 'Link key terms to other Wikipedia articles so readers can explore related topics.',
      },
    ],
    difficulty: 'easy',
    timeEstimate: '3–5 minutes',
  },
  {
    id: 'headings',
    need: 'Improve article section headings',
    heading: 'Improve headings',
    descriptionParts: [
      {
        kind: 'text',
        text: 'Add or clarify section headings so the article is easier to scan.',
      },
    ],
    difficulty: 'easy',
    timeEstimate: '5–10 minutes',
  },
  {
    id: 'images',
    need: 'Add images or other media',
    heading: 'Add images',
    descriptionParts: [
      {
        kind: 'text',
        text: 'Find a freely licensed image or other media file to illustrate this article.',
      },
    ],
    difficulty: 'easy',
    timeEstimate: '5–10 minutes',
  },
  {
    id: 'infobox',
    need: 'Add an infobox',
    heading: 'Add an infobox',
    descriptionParts: [
      {
        kind: 'text',
        text: 'Add an infobox template with key facts about the subject.',
      },
    ],
    difficulty: 'medium',
    timeEstimate: '10–15 minutes',
  },
  {
    id: 'categories',
    need: 'Add more relevant categories',
    heading: 'Add categories',
    descriptionParts: [
      {
        kind: 'text',
        text: 'Assign Wikipedia categories so this article appears in the right topic areas.',
      },
    ],
    difficulty: 'easy',
    timeEstimate: '3–5 minutes',
  },
  {
    id: 'expand',
    need: 'Expand the content',
    heading: 'Expand article',
    descriptionParts: [
      {
        kind: 'text',
        text: 'Add well-sourced information to make this article more complete.',
      },
    ],
    difficulty: 'medium',
    timeEstimate: '15–30 minutes',
  },
  {
    id: 'maintenance',
    need: 'Check maintenance message',
    heading: 'Fix maintenance issue',
    descriptionParts: [
      {
        kind: 'text',
        text: 'Review the maintenance banner on this article and address the flagged issue.',
      },
    ],
    difficulty: 'medium',
    timeEstimate: '10–20 minutes',
  },
]

const NEED_TO_TASK = new Map(MICROTASK_CATALOG.map((task) => [task.need.toLowerCase(), task]))

export function getMicrotaskByNeed(need: string): MicrotaskDefinition | undefined {
  return NEED_TO_TASK.get(need.trim().toLowerCase())
}

/** Stable pseudo-random index from article title (consistent across refreshes). */
function hashTitle(title: string): number {
  let hash = 0
  for (let index = 0; index < title.length; index += 1) {
    hash = (hash * 31 + title.charCodeAt(index)) >>> 0
  }
  return hash
}

export function pickRandomMicrotaskForTitle(title: string): MicrotaskDefinition {
  const index = hashTitle(title) % MICROTASK_CATALOG.length
  return MICROTASK_CATALOG[index]
}

export function pickMicrotaskForTitle(
  title: string,
  need?: string | null,
): MicrotaskDefinition {
  if (need) {
    const matched = getMicrotaskByNeed(need)
    if (matched) return matched
  }
  return pickRandomMicrotaskForTitle(title)
}
