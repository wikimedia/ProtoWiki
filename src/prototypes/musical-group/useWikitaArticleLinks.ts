import { ref, type Ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  enwikiArticleUrl,
  enwikiTitlesMatch,
  fetchWikibaseItemId,
  fetchWikibaseItemIds,
  isExternalHref,
  normalizeEnwikiTitle,
  parseEnwikiArticleLink,
  resolveExternalUrl,
} from './data/enwikiTitle'
import type { WikitaArticleBlock } from './data/parseWikitaArticle'
import { collectArticleLinkTitles } from './data/parseWikitaArticle'
import { scrollMusicalGroupPageToElement } from './musicalGroupScrollOffset'
import { useMusicalGroupRoute } from './useMusicalGroupRoute'

const qidCache = new Map<string, string | undefined>()
const MAX_PREFETCH_TITLES = 20

export function useWikitaArticleLinks(
  articleRoot: Ref<HTMLElement | null>,
  currentTitle: () => string | undefined,
) {
  const router = useRouter()
  const { itemRoute } = useMusicalGroupRoute()
  const resolving = ref(false)

  function scrollToFragment(fragment: string): boolean {
    const root = articleRoot.value
    if (!root || !fragment) return false

    const id = decodeURIComponent(fragment)
    const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id
    const target =
      root.querySelector(`#${escaped}`) ??
      root.querySelector(`[id="${id.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`)

    if (!target) return false

    const scrollRoot = root.closest('.musical-group-page') as HTMLElement | null
    if (scrollRoot) {
      scrollMusicalGroupPageToElement(scrollRoot, target)
      return true
    }

    target.scrollIntoView({ behavior: 'instant', block: 'start' })
    return true
  }

  function isSamePageLink(linkTitle: string | null, fragment: string | null): boolean {
    if (!fragment) return false
    const articleTitle = currentTitle()
    if (!linkTitle) return true
    if (!articleTitle) return false
    return enwikiTitlesMatch(linkTitle, articleTitle)
  }

  function rememberQid(title: string, qid: string | undefined): void {
    qidCache.set(normalizeEnwikiTitle(title).toLowerCase(), qid)
  }

  function cachedQid(title: string): string | undefined | null {
    const key = normalizeEnwikiTitle(title).toLowerCase()
    if (!qidCache.has(key)) return null
    return qidCache.get(key)
  }

  async function prefetchLinkTargets(blocks: WikitaArticleBlock[], signal?: AbortSignal): Promise<void> {
    const titles = collectArticleLinkTitles(blocks).slice(0, MAX_PREFETCH_TITLES)
    if (!titles.length) return

    const unresolved = titles.filter((title) => cachedQid(title) === null)
    if (!unresolved.length) return

    const batch = await fetchWikibaseItemIds(unresolved, signal)
    for (const [title, qid] of batch) {
      rememberQid(title, qid)
    }
  }

  async function resolveQid(title: string, signal?: AbortSignal): Promise<string | undefined> {
    const cached = cachedQid(title)
    if (cached !== null) return cached ?? undefined

    const qid = await fetchWikibaseItemId(title, signal)
    rememberQid(title, qid)
    return qid
  }

  async function onArticleClick(event: MouseEvent): Promise<void> {
    const anchor = (event.target as Element | null)?.closest('a')
    if (!anchor) return

    const href = anchor.getAttribute('href') ?? ''
    if (!href) return

    const { title, fragment } = parseEnwikiArticleLink(href)

    if (isSamePageLink(title, fragment)) {
      event.preventDefault()
      scrollToFragment(fragment!)
      return
    }

    if (isExternalHref(href)) {
      event.preventDefault()
      window.open(resolveExternalUrl(href), '_blank', 'noopener,noreferrer')
      return
    }

    if (!title) return

    event.preventDefault()

    if (resolving.value) return
    resolving.value = true

    try {
      const qid = await resolveQid(title)
      if (qid) {
        await router.replace(itemRoute(qid))
        return
      }

      window.open(enwikiArticleUrl(title), '_blank', 'noopener,noreferrer')
    } finally {
      resolving.value = false
    }
  }

  return {
    onArticleClick,
    prefetchLinkTargets,
  }
}
