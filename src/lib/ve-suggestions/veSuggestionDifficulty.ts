/** FakeMediaWiki VeSuggestions change-size judgements (by suggestion type). */
export type SuggestionChangeSize = 'easy' | 'medium' | 'hard'

export const CHANGE_SIZE_BY_SUGGESTION_TYPE: Record<string, SuggestionChangeSize> = {
  addReference: 'medium',
  citationNeeded: 'medium',
  convertReference: 'easy',
  disambiguation: 'easy',
  doubleBold: 'easy',
  duplicateLink: 'easy',
  externalLink: 'easy',
  fakeHeading: 'easy',
  imageCaption: 'medium',
  redirect: 'easy',
  requiredTemplateParam: 'easy',
  suggestedLink: 'easy',
  textMatch: 'hard',
  tone: 'hard',
  yearLink: 'easy',
}

export const CHANGE_SIZE_COLORS: Record<SuggestionChangeSize, string> = {
  easy: '#14866d',
  medium: '#ac6600',
  hard: '#b32424',
}

export function changeSizeForSuggestionType(suggestionType: string): SuggestionChangeSize {
  return CHANGE_SIZE_BY_SUGGESTION_TYPE[suggestionType] ?? 'medium'
}
