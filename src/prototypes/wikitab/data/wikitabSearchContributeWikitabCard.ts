import type { WikitabSearchContributeItem } from './fetchWikitabSearchContribute'
import { wikitabCardSaveArticleMenuOption } from './savedCardHelpers'
import { searchContributeItemToCardData } from './wikitabCardPayloadMappers'
import { wikitabCardFeedMenuItems } from './wikitabCardMenuItems'
import { wikitabCardBindProps } from './wikitabCardPresentation'
import { seedArticle } from './wikitabSeedArticle'

export function wikitabCardPropsForSearchContributeItem(
  item: WikitabSearchContributeItem,
  options: {
    isSaved?: boolean
    isCardSaved?: (id: string) => boolean
  } = {},
): Record<string, unknown> {
  const articleSeed = seedArticle(item.articleTitle, 'self')
  return wikitabCardBindProps('suggestion', {
    card: {
      ...searchContributeItemToCardData(item),
      pageid: item.pageid,
    },
    menu: wikitabCardFeedMenuItems({
      save: { isSaved: options.isSaved },
      saveArticle: options.isCardSaved
        ? wikitabCardSaveArticleMenuOption(articleSeed, options.isCardSaved)
        : false,
    }),
  })
}
