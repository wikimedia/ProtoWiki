import type { WikitabSearchContributeItem } from './fetchWikitabSearchContribute'
import {
  wikitabCardSaveArticleMenuOption,
  type WikitabSaveArticleMenuLookup,
} from './savedCardHelpers'
import { searchContributeItemToCardData } from './wikitabCardPayloadMappers'
import { wikitabCardFeedMenuItems } from './wikitabCardMenuItems'
import { wikitabCardBindProps } from './wikitabCardPresentation'
export function wikitabCardPropsForSearchContributeItem(
  item: WikitabSearchContributeItem,
  options: {
    isSaved?: boolean
    saveArticleMenuLookup?: WikitabSaveArticleMenuLookup
  } = {},
): Record<string, unknown> {
  return wikitabCardBindProps('suggestion', {
    card: {
      ...searchContributeItemToCardData(item),
      pageid: item.pageid,
    },
    menu: wikitabCardFeedMenuItems({
      save: { isSaved: options.isSaved, primitiveId: 'suggestion' },
      saveArticle: options.saveArticleMenuLookup
        ? wikitabCardSaveArticleMenuOption(item.seedArticle, options.saveArticleMenuLookup)
        : false,
    }),
  })
}
