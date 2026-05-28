export const DISPLAY_HEADING_BY_TYPE: Record<string, string> = {
  addReference: 'Add reference',
  citationNeeded: 'Add citation needed',
  convertReference: 'Convert reference',
  disambiguation: 'Fix disambiguation link',
  doubleBold: 'Remove bold formatting',
  duplicateLink: 'Remove duplicate link',
  externalLink: 'Remove external link',
  fakeHeading: 'Convert fake heading',
  imageCaption: 'Improve image caption',
  redirect: 'Replace redirect link',
  requiredTemplateParam: 'Complete the citation',
  suggestedLink: 'Add link',
  textMatch: 'Rewrite flagged text',
  tone: 'Adjust tone',
  yearLink: 'Fix year link',
}

export function formatSuggestionType(suggestionType: string): string {
  const withSpaces = suggestionType
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
  if (!withSpaces) return 'Suggestion'
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
}

export function headingForSuggestionType(suggestionType: string): string {
  return DISPLAY_HEADING_BY_TYPE[suggestionType] ?? formatSuggestionType(suggestionType)
}
