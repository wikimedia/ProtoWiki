import { normalizeWikiPageTitleInput, type PageListKey } from '@/config'
import { useConfig } from '@/composables/useConfig'
import {
  dedupeWikiPageTitles,
  findMissingWikiPageTitles,
  resolveWikiPageTitles,
} from '@/utils/wikiPageTitles'

/**
 * Resolve mock user page lists to canonical Wikipedia titles (Action API + opensearch).
 * Persists only when every title resolves.
 */
export function useResolveUserPageList() {
  const { lang, currentUserPageLists, setCurrentUserPageList } = useConfig()

  async function resolvePageListTitles(
    titles: readonly string[],
    signal?: AbortSignal,
  ): Promise<{ resolved: string[]; notFound: string[] }> {
    const trimmed = titles.map((t) => t.trim()).filter((t) => t.length > 0)
    if (!trimmed.length) return { resolved: [], notFound: [] }

    const resolved = dedupeWikiPageTitles(
      await resolveWikiPageTitles(trimmed, { lang: lang.value, signal }),
    )

    const notFound = await findMissingWikiPageTitles(resolved, {
      lang: lang.value,
      signal,
      alreadyResolved: true,
    })

    return { resolved, notFound }
  }

  /** Titles from Action API (e.g. usercontribs) — store as-is, no title lookup. */
  function commitTrustedPageListField(field: PageListKey, titles: readonly string[]): void {
    const normalized = dedupeWikiPageTitles(
      titles.map((title) => normalizeWikiPageTitleInput(title)).filter((t) => t.length > 0),
    )
    setCurrentUserPageList(field, normalized)
  }

  async function commitPageListField(
    field: PageListKey,
    titles: readonly string[],
    signal?: AbortSignal,
  ): Promise<{ resolved: string[]; notFound: string[]; committed: boolean }> {
    const { resolved, notFound } = await resolvePageListTitles(titles, signal)
    if (notFound.length) {
      return { resolved, notFound, committed: false }
    }
    setCurrentUserPageList(field, resolved)
    return { resolved, notFound, committed: true }
  }

  /** Normalize the list already stored in config (e.g. saved-pages template load). */
  async function normalizePageListField(
    field: PageListKey,
    signal?: AbortSignal,
  ): Promise<{ resolved: string[]; notFound: string[]; committed: boolean }> {
    return commitPageListField(field, currentUserPageLists.value[field], signal)
  }

  /** User-edited mock lists only — not `editedPages` from Action API (`usercontribs`). */
  async function normalizeAllPageListFields(signal?: AbortSignal): Promise<void> {
    await normalizePageListField('watchlist', signal)
    await normalizePageListField('readingList', signal)
  }

  return {
    resolvePageListTitles,
    commitPageListField,
    commitTrustedPageListField,
    normalizePageListField,
    normalizeAllPageListFields,
  }
}
