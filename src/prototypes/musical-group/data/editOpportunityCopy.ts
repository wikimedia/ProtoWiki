export interface EditOpportunityCopy {
  title: string
  body: string
}

const EDIT_OPPORTUNITY_COPY: Record<string, EditOpportunityCopy> = {
  'Add more references': {
    title: 'Find a reference',
    body: 'Help readers understand where this information is coming from.',
  },
  'Add more internal wikilinks': {
    title: 'Add links',
    body: 'Connect this article to related topics on Wikipedia.',
  },
  'Improve article section headings': {
    title: 'Improve headings',
    body: 'Give the article clearer structure with section headings.',
  },
  'Add images or other media': {
    title: 'Add images',
    body: 'Illustrate the article with photos or other media.',
  },
  'Add an infobox': {
    title: 'Add an infobox',
    body: 'Summarize key facts in a structured infobox.',
  },
  'Add more relevant categories': {
    title: 'Add categories',
    body: 'Help readers discover this article through categories.',
  },
  'Expand the content': {
    title: 'Expand the article',
    body: 'Add more detail so the article better covers its topic.',
  },
  'Check maintenance message': {
    title: 'Resolve maintenance tags',
    body: 'Address the maintenance banner on this article.',
  },
}

export function resolveEditOpportunityCopy(need: string): EditOpportunityCopy {
  const mapped = EDIT_OPPORTUNITY_COPY[need]
  if (mapped) return mapped
  return { title: need, body: '' }
}
