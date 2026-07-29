import {
  useMusicalGroupHome,
  type PersonalizedFeedId,
} from '../../musical-group/useMusicalGroupHome'

/** Home preview only needs a few cards. */
export const WIKITA_LITE_HELP_WANTED_HOME_LIMIT = 3

export type { PersonalizedFeedId }

export function useWikitaLiteHome(options?: {
  helpWantedLimit?: number
  getBookmarkChangeSkipFeeds?: () => PersonalizedFeedId[]
}) {
  return useMusicalGroupHome({
    helpWantedLimit: options?.helpWantedLimit ?? WIKITA_LITE_HELP_WANTED_HOME_LIMIT,
    getBookmarkChangeSkipFeeds: options?.getBookmarkChangeSkipFeeds,
  })
}
