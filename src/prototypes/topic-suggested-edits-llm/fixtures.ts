export const PAGE_COUNT = 15

export type Step = 'topics' | 'feed'

export const STORAGE_KEY = 'protowiki-topic-suggested-edits-llm-v1'

export const QUICK_SUGGESTIONS_STORAGE_KEY =
  'protowiki-topic-suggested-edits-llm-quick-suggestions-v5'

export type PageResolutionOutcome = 'miss' | 'hit' | 'retry' | 'pick'

export interface PageResolutionStep {
  label: string
  query?: string
  outcome: PageResolutionOutcome
  detail?: string
}
