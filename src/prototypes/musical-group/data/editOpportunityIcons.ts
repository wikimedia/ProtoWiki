import type { Icon } from '@wikimedia/codex-icons'
import {
  cdxIconEdit,
  cdxIconImage,
  cdxIconLink,
  cdxIconListBullet,
  cdxIconReference,
  cdxIconTag,
  cdxIconTemplateAdd,
} from '@wikimedia/codex-icons'

const EDIT_OPPORTUNITY_ICONS: Record<string, Icon> = {
  'Add more references': cdxIconReference,
  'Add more internal wikilinks': cdxIconLink,
  'Improve article section headings': cdxIconListBullet,
  'Add images or other media': cdxIconImage,
  'Add an infobox': cdxIconTemplateAdd,
  'Add more relevant categories': cdxIconTag,
  'Expand the content': cdxIconEdit,
  'This article is too short, try to expand the content': cdxIconEdit,
}

export function resolveEditOpportunityIcon(need: string): Icon {
  return EDIT_OPPORTUNITY_ICONS[need] ?? cdxIconEdit
}
