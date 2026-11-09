/**
 * Saved articles seed Daily reads, Recent edits, Help wanted and Active
 * discussions. Each saved seed belongs to the wiki it was saved on
 * (`WikitabSavedArticleSeed.lang`), but those modules fetch from this page
 * load's wiki — so every seed is resolved to the target wiki first:
 *
 * - **Same wiki** — kept as-is, except titles containing `:` are checked against
 *   the wiki itself (`ns === 0`). That catches localized namespaces the English
 *   prefix list in `isMainNamespaceArticleTitle` can't (`Datei:`, `Discussion:`).
 * - **Other wiki** — the Wikidata item's sitelink for the target wiki
 *   (`wbgetentities` by source-site title). No sitelink → the seed is dropped
 *   for this wiki; the saved item itself is untouched.
 *
 * Results are cached per target language (`wikitab-seed-resolve-cache-v1:<lang>`),
 * keyed by `<sourceLang>:<titleKey>`. Network failures are never cached.
 */
import { wikiHostFromLang, wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'

import type { WikitabSavedArticleSeed } from './savedCardHelpers'
import { readCacheJsonUnlessBypassed, wikitabCacheKey, writeCacheJson } from './wikitabCacheHelpers'
import { articleTitleKey } from './wikitabHtml'

export const CACHE_KEY = 'wikitab-seed-resolve-cache-v1'

/** Sitelinks and namespaces barely change — a week keeps lookups rare. */
const RESOLVE_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** Action API / Wikidata `titles` batch limit for anonymous clients. */
const BATCH_SIZE = 50

/** Cap the stored map so a long-lived saved list can't grow it forever. */
const MAX_CACHE_ENTRIES = 500

const PURPOSE = 'wikitab-seed-resolve'

interface ResolvedEntry {
  /** Target-wiki title, or null when the target wiki has no such article. */
  title: string | null
  at: number
}

type ResolveCache = Record<string, ResolvedEntry>

function sourceKey(seed: Pick<WikitabSavedArticleSeed, 'lang' | 'titleKey'>): string {
  return `${seed.lang}:${seed.titleKey}`
}

/** Wikidata site id for a Wikipedia language (`zh-yue` → `zh_yuewiki`). */
function wikidataSiteId(lang: string): string {
  return `${lang.replace(/-/g, '_')}wiki`
}

function readResolveCache(targetLang: string): ResolveCache {
  const raw = readCacheJsonUnlessBypassed(wikitabCacheKey(CACHE_KEY, targetLang))
  return raw && typeof raw === 'object' ? (raw as ResolveCache) : {}
}

function writeResolveCache(targetLang: string, additions: ResolveCache): void {
  if (!Object.keys(additions).length) return
  // Re-read so concurrent tabs on the same language don't drop each other's entries.
  const merged = { ...readResolveCache(targetLang), ...additions }
  const now = Date.now()
  const fresh = Object.entries(merged)
    .filter(([, entry]) => entry && now - entry.at < RESOLVE_TTL_MS)
    .sort(([, a], [, b]) => b.at - a.at)
    .slice(0, MAX_CACHE_ENTRIES)
  writeCacheJson(wikitabCacheKey(CACHE_KEY, targetLang), Object.fromEntries(fresh))
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  const response = await fetchWikimedia(url, { signal, headers: wikimediaApiFetchHeaders(PURPOSE) })
  return response.ok ? ((await response.json()) as T) : null
}

interface PageQueryResponse {
  query?: {
    normalized?: { from: string; to: string }[]
    redirects?: { from: string; to: string }[]
    pages?: { title: string; ns: number; missing?: boolean; invalid?: boolean }[]
  }
}

/** Same wiki: confirm each `:` title is an existing main-namespace article. */
async function validateOnWiki(
  lang: string,
  seeds: readonly WikitabSavedArticleSeed[],
  signal?: AbortSignal,
): Promise<ResolveCache> {
  const resolved: ResolveCache = {}
  const now = Date.now()

  for (const batch of chunk(seeds, BATCH_SIZE)) {
    const params = new URLSearchParams({
      action: 'query',
      titles: batch.map((seed) => seed.title).join('|'),
      redirects: '1',
      format: 'json',
      formatversion: '2',
      origin: '*',
    })
    const data = await fetchJson<PageQueryResponse>(
      `https://${wikiHostFromLang(lang)}/w/api.php?${params}`,
      signal,
    )
    if (!data?.query) continue

    const renamed = new Map<string, string>()
    for (const step of [...(data.query.normalized ?? []), ...(data.query.redirects ?? [])]) {
      renamed.set(step.from, step.to)
    }
    const pageByTitle = new Map((data.query.pages ?? []).map((page) => [page.title, page]))

    for (const seed of batch) {
      let title = seed.title
      for (let hops = 0; hops < 3 && renamed.has(title); hops++) title = renamed.get(title)!
      const page = pageByTitle.get(title)
      const ok = page && page.ns === 0 && !page.missing && !page.invalid
      resolved[sourceKey(seed)] = { title: ok ? page.title : null, at: now }
    }
  }

  return resolved
}

interface WikidataEntitiesResponse {
  entities?: Record<
    string,
    {
      missing?: string
      site?: string
      title?: string
      sitelinks?: Record<string, { title?: string }>
    }
  >
}

/** Other wiki: follow the Wikidata sitelink from the source wiki to the target. */
async function translateViaWikidata(
  sourceLang: string,
  targetLang: string,
  seeds: readonly WikitabSavedArticleSeed[],
  signal?: AbortSignal,
): Promise<ResolveCache> {
  const resolved: ResolveCache = {}
  const now = Date.now()
  const sourceSite = wikidataSiteId(sourceLang)
  const targetSite = wikidataSiteId(targetLang)

  for (const batch of chunk(seeds, BATCH_SIZE)) {
    const params = new URLSearchParams({
      action: 'wbgetentities',
      sites: sourceSite,
      titles: batch.map((seed) => seed.title).join('|'),
      props: 'sitelinks',
      sitefilter: `${sourceSite}|${targetSite}`,
      format: 'json',
      formatversion: '2',
      origin: '*',
    })
    const data = await fetchJson<WikidataEntitiesResponse>(
      `https://www.wikidata.org/w/api.php?${params}`,
      signal,
    )
    if (!data?.entities) continue

    // Map each entity back to the seed by its source-wiki title.
    const targetBySourceKey = new Map<string, string | null>()
    for (const entity of Object.values(data.entities)) {
      const sourceTitle = entity.sitelinks?.[sourceSite]?.title ?? entity.title
      if (!sourceTitle) continue
      targetBySourceKey.set(
        articleTitleKey(sourceTitle),
        entity.sitelinks?.[targetSite]?.title ?? null,
      )
    }

    for (const seed of batch) {
      resolved[sourceKey(seed)] = {
        title: targetBySourceKey.get(seed.titleKey) ?? null,
        at: now,
      }
    }
  }

  return resolved
}

/**
 * Seeds rewritten for `targetLang`: each carries the target wiki's title and
 * `lang: targetLang`. Order follows `seeds`; seeds without a target article are
 * dropped, and two seeds landing on the same article collapse into one.
 */
export async function resolveSeedsForWiki(
  seeds: readonly WikitabSavedArticleSeed[],
  targetLang: string,
  signal?: AbortSignal,
): Promise<WikitabSavedArticleSeed[]> {
  if (!seeds.length) return []

  const cache = readResolveCache(targetLang)
  const now = Date.now()
  const known = (seed: WikitabSavedArticleSeed): boolean => {
    const entry = cache[sourceKey(seed)]
    return Boolean(entry) && now - entry.at < RESOLVE_TTL_MS
  }

  // Same-wiki titles without `:` are plain main-namespace titles — no lookup needed.
  const needsLookup = seeds.filter(
    (seed) => !(seed.lang === targetLang && !seed.title.includes(':')) && !known(seed),
  )

  if (needsLookup.length) {
    const bySource = new Map<string, WikitabSavedArticleSeed[]>()
    for (const seed of needsLookup) {
      const group = bySource.get(seed.lang) ?? []
      group.push(seed)
      bySource.set(seed.lang, group)
    }

    const results = await Promise.all(
      [...bySource].map(async ([sourceLang, group]) => {
        try {
          return sourceLang === targetLang
            ? await validateOnWiki(targetLang, group, signal)
            : await translateViaWikidata(sourceLang, targetLang, group, signal)
        } catch (cause) {
          if ((cause as Error)?.name === 'AbortError') throw cause
          return {}
        }
      }),
    )

    const additions: ResolveCache = Object.assign({}, ...results)
    Object.assign(cache, additions)
    writeResolveCache(targetLang, additions)
  }

  const out: WikitabSavedArticleSeed[] = []
  const seen = new Set<string>()
  for (const seed of seeds) {
    const title =
      seed.lang === targetLang && !seed.title.includes(':')
        ? seed.title
        : cache[sourceKey(seed)]?.title
    if (!title) continue
    const titleKey = articleTitleKey(title)
    if (!titleKey || seen.has(titleKey)) continue
    seen.add(titleKey)
    out.push({ title: title.replace(/_/g, ' '), titleKey, lang: targetLang })
  }
  return out
}

/** One seed → its target-wiki equivalent, or null. */
export async function resolveSeedForWiki(
  seed: WikitabSavedArticleSeed,
  targetLang: string,
  signal?: AbortSignal,
): Promise<WikitabSavedArticleSeed | null> {
  const [resolved] = await resolveSeedsForWiki([seed], targetLang, signal)
  return resolved ?? null
}
