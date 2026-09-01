import { useConfig } from '@/composables/useConfig'

import {
  useMusicalGroupHome,
  type PersonalizedFeedId,
} from '../../musical-group/useMusicalGroupHome'

/** Home preview only needs a few cards. */
export const WIKITA_LITE_HELP_WANTED_HOME_LIMIT = 3
export const WIKITA_LITE_TRANSLATION_HOME_COUNT = 2

export type { PersonalizedFeedId }

export function useWikitaLiteHome(options?: {
  helpWantedLimit?: number
  translationCountPerLanguage?: number
  translationLanguages?: () => string[]
  getBookmarkChangeSkipFeeds?: () => PersonalizedFeedId[]
}) {
  const { knownLanguages } = useConfig()

  return useMusicalGroupHome({
    helpWantedLimit: options?.helpWantedLimit ?? WIKITA_LITE_HELP_WANTED_HOME_LIMIT,
    translationCountPerLanguage:
      options?.translationCountPerLanguage ?? WIKITA_LITE_TRANSLATION_HOME_COUNT,
    translationLanguages:
      options?.translationLanguages ??
      (() => {
        const langs = knownLanguages.value
        return langs.length ? [langs[0]] : []
      }),
    getBookmarkChangeSkipFeeds: options?.getBookmarkChangeSkipFeeds,
    savedPagesSource: 'readingList',
  })
}
