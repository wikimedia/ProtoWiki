import { t } from '@/i18n'

export interface EditOpportunityCopy {
  title: string
  body: string
}

/*
 * Keyed by the quality-check `need`, which the API returns in English. Copy is
 * resolved when a card is built, so it reads in the interface language.
 */
const EDIT_OPPORTUNITY_COPY: Record<string, () => EditOpportunityCopy> = {
  'Add more references': () => ({
    title: t('feed.editOpportunityReferenceTitle'),
    body: t('feed.editOpportunityReferenceBody'),
  }),
  'Add more internal wikilinks': () => ({
    title: t('feed.editOpportunityLinksTitle'),
    body: t('feed.editOpportunityLinksBody'),
  }),
  'Improve article section headings': () => ({
    title: t('feed.editOpportunityHeadingsTitle'),
    body: t('feed.editOpportunityHeadingsBody'),
  }),
  'Add images or other media': () => ({
    title: t('feed.editOpportunityImagesTitle'),
    body: t('feed.editOpportunityImagesBody'),
  }),
  'Add an infobox': () => ({
    title: t('feed.editOpportunityInfoboxTitle'),
    body: t('feed.editOpportunityInfoboxBody'),
  }),
  'Add more relevant categories': () => ({
    title: t('feed.editOpportunityCategoriesTitle'),
    body: t('feed.editOpportunityCategoriesBody'),
  }),
  'Expand the content': () => ({
    title: t('feed.editOpportunityExpandTitle'),
    body: t('feed.editOpportunityExpandBody'),
  }),
  'This article is too short, try to expand the content': () => ({
    title: t('feed.editOpportunityExpandTitle'),
    body: t('feed.editOpportunityExpandBody'),
  }),
}

/** Needs we skip when surfacing an edit card (maintenance banners are not actionable for readers). */
const EXCLUDED_EDIT_OPPORTUNITY_NEEDS = new Set([
  'Check maintenance message',
  'Check article for a maintenance message',
])

export function isExcludedEditOpportunityNeed(need: string): boolean {
  return EXCLUDED_EDIT_OPPORTUNITY_NEEDS.has(need)
}

export function resolveEditOpportunityCopy(need: string): EditOpportunityCopy {
  const mapped = EDIT_OPPORTUNITY_COPY[need]
  if (mapped) return mapped()
  return { title: need, body: '' }
}
