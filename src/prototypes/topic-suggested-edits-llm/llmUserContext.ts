import {
  configUserDisplayName,
  normalizeLang,
  normalizeWikiUsername,
  type ConfigUser,
  type UserPageLists,
} from '@/lib/config'
import { getPortfolioCache, setPortfolioCache } from '@/lib/dashpagePortfolioCache'
import {
  FetchUserEditedPageTitlesError,
  fetchUserEditedPageTitles,
} from '@/lib/fetchUserEditedPageTitles'

export interface LlmUserContext {
  user: ConfigUser
  displayName: string
  lang: string
  realUsername?: string
  editedPages: string[]
  readingList: string[]
  watchlist: string[]
}

const LIST_SLICE = 15

function userPersonaLabel(user: ConfigUser): string {
  switch (user) {
    case 'logged-out':
      return 'logged out (no account)'
    case 'new':
      return 'new editor (few or no prior edits)'
    case 'experienced':
      return 'experienced editor'
    case 'real':
      return 'logged-in Wikipedia user'
  }
}

export function wikiProjectLabel(lang: string): string {
  const code = normalizeLang(lang)
  return code === 'en' ? 'English Wikipedia' : `${code} Wikipedia`
}

export function buildLlmUserContext(
  user: ConfigUser,
  lang: string,
  realUsername: string,
  lists: UserPageLists,
  editedPages: string[] = lists.editedPages,
): LlmUserContext {
  const normalizedUsername = normalizeWikiUsername(realUsername)
  return {
    user,
    displayName: configUserDisplayName(user, realUsername),
    lang: normalizeLang(lang),
    ...(user === 'real' && normalizedUsername ? { realUsername: normalizedUsername } : {}),
    editedPages,
    readingList: lists.readingList,
    watchlist: lists.watchlist,
  }
}

export function formatLlmUserContextSection(ctx: LlmUserContext): string {
  const lines = [
    'About the volunteer:',
    `- Persona: ${userPersonaLabel(ctx.user)}`,
    `- Wikipedia project: ${wikiProjectLabel(ctx.lang)} (${ctx.lang})`,
  ]

  if (ctx.realUsername) {
    lines.push(`- Username: ${ctx.realUsername}`)
  }

  if (ctx.editedPages.length) {
    lines.push(`- Pages they have edited: ${JSON.stringify(ctx.editedPages.slice(0, LIST_SLICE))}`)
  }

  if (ctx.readingList.length) {
    lines.push(`- Reading list: ${JSON.stringify(ctx.readingList.slice(0, LIST_SLICE))}`)
  }

  if (ctx.watchlist.length) {
    lines.push(`- Watchlist: ${JSON.stringify(ctx.watchlist.slice(0, LIST_SLICE))}`)
  }

  if (!ctx.editedPages.length && !ctx.readingList.length && !ctx.watchlist.length) {
    lines.push('- No saved reading list, watchlist, or edit history in prototype config.')
  }

  return lines.join('\n')
}

export async function resolveLlmUserContext(
  user: ConfigUser,
  lang: string,
  realUsername: string,
  lists: UserPageLists,
  signal?: AbortSignal,
): Promise<LlmUserContext> {
  let editedPages = lists.editedPages

  if (user === 'real') {
    const username = normalizeWikiUsername(realUsername)
    const activeLang = normalizeLang(lang)

    if (username.length) {
      const cachedPortfolio = getPortfolioCache(username, activeLang)
      if (cachedPortfolio?.titles?.length) {
        editedPages = cachedPortfolio.titles
      } else {
        try {
          editedPages = await fetchUserEditedPageTitles(username, {
            lang: activeLang,
            signal,
          })
          setPortfolioCache(username, editedPages, activeLang)
        } catch (caught) {
          if (caught instanceof FetchUserEditedPageTitlesError && caught.code === 'aborted') {
            throw caught
          }
          editedPages = []
        }
      }
    } else {
      editedPages = []
    }
  }

  return buildLlmUserContext(user, lang, realUsername, lists, editedPages)
}
