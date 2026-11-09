import { normalizeWikiPageTitleInput, wikimediaApiFetchHeaders, wikiHostFromLang } from '@/config'

export { normalizeWikiPageTitleInput }

/** Lowercase compare key (underscores → spaces, trim) — used only while resolving titles. */
export function wikiPageTitleCompareKey(value: string): string {
  return normalizeWikiPageTitleInput(value).toLowerCase()
}

interface TitlePageRecord {
  pageid: number
  title: string
}

interface BatchTitleQueryResult {
  byTitle: Map<string, TitlePageRecord>
  redirectFrom: Map<string, string>
}

function lookupTitlePage(
  map: Map<string, TitlePageRecord>,
  redirectFrom: Map<string, string>,
  input: string,
): TitlePageRecord | undefined {
  const direct = map.get(input)
  if (direct) return direct
  const inputNorm = wikiPageTitleCompareKey(input)
  for (const entry of map.values()) {
    if (wikiPageTitleCompareKey(entry.title) === inputNorm) return entry
  }
  for (const [from, to] of redirectFrom) {
    if (wikiPageTitleCompareKey(from) !== inputNorm) continue
    const target =
      map.get(to) ??
      [...map.values()].find((e) => wikiPageTitleCompareKey(e.title) === wikiPageTitleCompareKey(to))
    if (target) return target
  }
  return undefined
}

async function batchQueryTitlePages(
  titles: readonly string[],
  host: string,
  signal?: AbortSignal,
  apiPurpose = 'wiki-page-title-resolve',
): Promise<BatchTitleQueryResult> {
  const byTitle = new Map<string, TitlePageRecord>()
  const redirectFrom = new Map<string, string>()
  if (!titles.length) return { byTitle, redirectFrom }

  const params = new URLSearchParams({
    action: 'query',
    titles: [...new Set(titles)].join('|'),
    redirects: '1',
    format: 'json',
    formatversion: '2',
    origin: '*',
  })

  const response = await fetch(`https://${host}/w/api.php?${params.toString()}`, {
    signal,
    headers: wikimediaApiFetchHeaders(apiPurpose),
  })

  if (!response.ok) {
    throw new Error(`Failed to resolve page titles (HTTP ${response.status}).`)
  }

  const data = (await response.json()) as {
    query?: {
      redirects?: Array<{ from?: string; to?: string }>
      pages?: Array<{
        pageid?: number
        title?: string
        missing?: boolean
        redirect?: boolean
      }>
    }
  }

  for (const redirect of data.query?.redirects ?? []) {
    if (redirect.from && redirect.to) redirectFrom.set(redirect.from, redirect.to)
  }

  for (const page of data.query?.pages ?? []) {
    if (page.missing || page.redirect || typeof page.pageid !== 'number' || !page.title) continue
    byTitle.set(page.title, { pageid: page.pageid, title: page.title })
  }

  return { byTitle, redirectFrom }
}

/**
 * When Action API has no exact page, try opensearch — supports case/spacing fixes
 * (e.g. "Wet leg" → "Wet Leg") when the top hit clearly matches the query.
 */
async function resolveTitleViaOpenSearch(
  input: string,
  host: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'opensearch',
    search: input,
    limit: '5',
    namespace: '0',
    format: 'json',
    origin: '*',
  })

  const response = await fetch(`https://${host}/w/api.php?${params.toString()}`, {
    signal,
    headers: wikimediaApiFetchHeaders('wiki-page-title-opensearch'),
  })
  if (!response.ok) return null

  const [, titles] = (await response.json()) as [string, string[], string[], string[]]
  if (!titles?.length) return null

  const inputNorm = wikiPageTitleCompareKey(input)

  for (const title of titles) {
    if (wikiPageTitleCompareKey(title) === inputNorm) return title
  }

  const first = titles[0]
  if (!first) return null

  const firstNorm = wikiPageTitleCompareKey(first)
  const inputWords = inputNorm.split(/\s+/).filter(Boolean)

  if (inputWords.length > 0 && inputWords.every((word) => firstNorm.includes(word))) {
    return first
  }

  return null
}

/**
 * Resolve each title to the canonical Wikipedia page title (Action API + opensearch).
 * Unresolved entries keep trimmed input with underscores as spaces.
 */
export async function resolveWikiPageTitles(
  titles: readonly string[],
  options: { signal?: AbortSignal; lang?: string } = {},
): Promise<string[]> {
  const trimmed = titles.map((t) => normalizeWikiPageTitleInput(t)).filter((t) => t.length > 0)
  if (!trimmed.length) return []

  const host = wikiHostFromLang(options.lang ?? 'en')
  const signal = options.signal

  let { byTitle, redirectFrom } = await batchQueryTitlePages(trimmed, host, signal)

  const resolved = new Array<string | null>(trimmed.length).fill(null)
  const pendingResolve: { index: number; input: string }[] = []

  for (let index = 0; index < trimmed.length; index++) {
    const input = trimmed[index]
    const page = lookupTitlePage(byTitle, redirectFrom, input)
    if (page) resolved[index] = page.title
    else pendingResolve.push({ index, input })
  }

  const canonicalByIndex = new Map<number, string>()
  const canonicalToFetch = new Set<string>()

  await Promise.all(
    pendingResolve.map(async ({ index, input }) => {
      const canonical = await resolveTitleViaOpenSearch(input, host, signal)
      if (!canonical) return
      canonicalByIndex.set(index, canonical)
      if (!lookupTitlePage(byTitle, redirectFrom, canonical)) canonicalToFetch.add(canonical)
    }),
  )

  if (canonicalToFetch.size) {
    const secondBatch = await batchQueryTitlePages([...canonicalToFetch], host, signal)
    for (const page of secondBatch.byTitle.values()) {
      byTitle.set(page.title, page)
    }
    for (const [from, to] of secondBatch.redirectFrom) {
      redirectFrom.set(from, to)
    }
  }

  for (const [index, canonical] of canonicalByIndex) {
    if (resolved[index]) continue
    const page = lookupTitlePage(byTitle, redirectFrom, canonical)
    resolved[index] = page?.title ?? canonical
  }

  return trimmed.map((input, index) => resolved[index] ?? input)
}

/** Drop duplicate titles (compare key), preserving first canonical spelling. */
export function dedupeWikiPageTitles(titles: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const title of titles) {
    const key = wikiPageTitleCompareKey(title)
    if (!key.length || seen.has(key)) continue
    seen.add(key)
    out.push(normalizeWikiPageTitleInput(title))
  }
  return out
}

export function wikiPageTitleListsEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((title, index) => title === b[index])
}

export function wikiPageNotFoundMessage(title: string): string {
  const label = normalizeWikiPageTitleInput(title)
  return `'${label}' article couldn't be found`
}

/** Titles in the list that do not resolve to an existing article on the wiki. */
export async function findMissingWikiPageTitles(
  titles: readonly string[],
  options: { signal?: AbortSignal; lang?: string; alreadyResolved?: boolean } = {},
): Promise<string[]> {
  const trimmed = titles.map((t) => normalizeWikiPageTitleInput(t)).filter((t) => t.length > 0)
  if (!trimmed.length) return []

  const host = wikiHostFromLang(options.lang ?? 'en')
  const signal = options.signal
  const canonicalTitles = options.alreadyResolved
    ? trimmed
    : await resolveWikiPageTitles(trimmed, { lang: options.lang, signal })

  const { byTitle, redirectFrom } = await batchQueryTitlePages(
    [...new Set(canonicalTitles)],
    host,
    signal,
  )

  const missing: string[] = []
  const seenKeys = new Set<string>()

  for (let index = 0; index < trimmed.length; index++) {
    const requested = trimmed[index]
    const canonical = canonicalTitles[index]
    if (lookupTitlePage(byTitle, redirectFrom, canonical)) continue
    const key = wikiPageTitleCompareKey(requested)
    if (seenKeys.has(key)) continue
    seenKeys.add(key)
    missing.push(requested)
  }

  return missing
}
