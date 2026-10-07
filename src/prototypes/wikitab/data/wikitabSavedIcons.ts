import type { Icon } from '@wikimedia/codex-icons'
import {
  cdxIconCalendar,
  cdxIconChartLine,
  cdxIconEdit,
  cdxIconImage,
  cdxIconLightbulb,
  cdxIconLink,
  cdxIconListBullet,
  cdxIconReference,
  cdxIconSpeechBubbles,
  cdxIconTag,
  cdxIconTemplateAdd,
} from '@wikimedia/codex-icons'

/** Serializable icon ids stored on saved cards. */
export type WikitabSavedIconId =
  | 'chartLine'
  | 'calendar'
  | 'link'
  | 'lightbulb'
  | 'speechBubbles'
  | 'edit'
  | 'reference'
  | 'image'
  | 'listBullet'
  | 'templateAdd'
  | 'tag'

const ICON_BY_ID: Record<WikitabSavedIconId, Icon> = {
  chartLine: cdxIconChartLine,
  calendar: cdxIconCalendar,
  link: cdxIconLink,
  lightbulb: cdxIconLightbulb,
  speechBubbles: cdxIconSpeechBubbles,
  edit: cdxIconEdit,
  reference: cdxIconReference,
  image: cdxIconImage,
  listBullet: cdxIconListBullet,
  templateAdd: cdxIconTemplateAdd,
  tag: cdxIconTag,
}

const ID_BY_ICON = new Map<Icon, WikitabSavedIconId>(
  Object.entries(ICON_BY_ID).map(([id, icon]) => [icon, id as WikitabSavedIconId]),
)

/** Maps edit-opportunity label strings to saved icon ids. */
const EDIT_OPPORTUNITY_ICON_IDS: Record<string, WikitabSavedIconId> = {
  'Add more references': 'reference',
  'Add more internal wikilinks': 'link',
  'Improve article section headings': 'listBullet',
  'Add images or other media': 'image',
  'Add an infobox': 'templateAdd',
  'Add more relevant categories': 'tag',
  'Expand the content': 'edit',
  'This article is too short, try to expand the content': 'edit',
}

export function resolveSavedIcon(id: WikitabSavedIconId | undefined): Icon | undefined {
  if (!id) return undefined
  return ICON_BY_ID[id]
}

export function iconToSavedId(icon: Icon): WikitabSavedIconId | undefined {
  return ID_BY_ICON.get(icon)
}

export function editOpportunityLabelToSavedIconId(label: string): WikitabSavedIconId {
  return EDIT_OPPORTUNITY_ICON_IDS[label] ?? 'edit'
}

export function isWikitabSavedIconId(value: string): value is WikitabSavedIconId {
  return value in ICON_BY_ID
}
