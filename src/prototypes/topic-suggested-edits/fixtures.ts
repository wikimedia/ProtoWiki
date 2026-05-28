export const DEFAULT_TOPIC_PILLS = ['Wet Leg', 'Surrealism']

export type Step = 'topics' | 'feed'

export type TopicKind = 'page' | 'search'

export const MORELIKE_LIMIT = 6

/** Full-text search topics: how many Cirrus hits to run VE suggestions on. */
export const SEARCH_TOPIC_PAGE_LIMIT = 10

export function capitalizeInterestLabel(input: string): string {
  const trimmed = input.trim()
  if (!trimmed.length) return trimmed
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

export function defaultTopicKinds(pills: string[]): Record<string, TopicKind> {
  return Object.fromEntries(pills.map((pill) => [pill, 'page']))
}
