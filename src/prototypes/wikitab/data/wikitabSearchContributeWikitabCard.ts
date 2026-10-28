import type { WikitabSearchContributeItem } from './fetchWikitabSearchContribute'
import { searchContributeItemToCardData } from './wikitabCardPayloadMappers'
import { wikitabCardSaveMenuItem } from './wikitabCardMenuItems'
import { wikitabCardBindProps } from './wikitabCardPresentation'

export function wikitabCardPropsForSearchContributeItem(
  item: WikitabSearchContributeItem,
  options: { isSaved?: boolean } = {},
): Record<string, unknown> {
  return wikitabCardBindProps('suggestion', {
    card: {
      ...searchContributeItemToCardData(item),
      pageid: item.pageid,
    },
    menu: [wikitabCardSaveMenuItem({ isSaved: options.isSaved })],
  })
}
