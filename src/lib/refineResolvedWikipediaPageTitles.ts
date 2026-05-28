import { fetchWikipediaTitleSearchCandidates } from '@/lib/fetchWikipediaTitleSearchCandidates'
import { resolveWikipediaPageTitleIfExact } from '@/lib/resolveWikipediaSearchQuery'
import type { ResolvedPageTitle } from '@/lib/resolveWikipediaPageTitlesBatch'

export interface PageTitleRefinement {
  input: string
  from: string
  to: string
  reason: string
}

export interface RefineResolvedPageTitlesResult {
  resolved: ResolvedPageTitle[]
  refinements: PageTitleRefinement[]
}

export interface RefineResolvedPageTitlesOptions {
  interest: string
  batchInputs: string[]
  lang?: string
  signal?: AbortSignal
}

function normalizeTitleKey(title: string): string {
  return title.trim().replace(/_/g, ' ').toLowerCase()
}

/** True when exact-title lookup likely picked the wrong article for the LLM's intent. */
export function needsDisambiguationReview(input: string, title: string): boolean {
  if (normalizeTitleKey(input) === normalizeTitleKey(title)) return false
  if (input.includes('(')) return false

  const inputKey = normalizeTitleKey(input)
  const titleKey = normalizeTitleKey(title)

  if (titleKey.startsWith(inputKey) && title.length > input.length + 5) {
    return true
  }

  if (!titleKey.includes(inputKey)) {
    return true
  }

  return false
}

/** Infer a Wikipedia disambiguation suffix from sibling titles or the interest query. */
export function inferDisambiguationHint(batchInputs: string[], interest: string): string | null {
  const suffixCounts = new Map<string, number>()

  for (const title of batchInputs) {
    const match = title.match(/\(([^)]+)\)\s*$/)
    if (!match) continue
    const suffix = match[1].trim().toLowerCase()
    if (!suffix.length) continue
    suffixCounts.set(suffix, (suffixCounts.get(suffix) ?? 0) + 1)
  }

  let bestSuffix: string | null = null
  let bestCount = 0
  for (const [suffix, count] of suffixCounts) {
    if (count > bestCount) {
      bestSuffix = suffix
      bestCount = count
    }
  }
  if (bestCount >= 2) return bestSuffix

  const interestLower = interest.toLowerCase()
  if (/\b(bands?|musicians?|music|indie|rock|pop|singers?|albums?)\b/.test(interestLower)) {
    return 'band'
  }
  if (/\b(films?|movies?|actors?|directors?|actresses?)\b/.test(interestLower)) {
    return 'film'
  }

  return null
}

async function resolveExactTitle(
  candidate: string,
  lang: string,
  signal?: AbortSignal,
): Promise<string | null> {
  return resolveWikipediaPageTitleIfExact(candidate, { lang, signal })
}

async function findBetterTitle(
  input: string,
  wrongTitle: string,
  hint: string | null,
  interest: string,
  lang: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const candidates: string[] = []

  if (hint) {
    candidates.push(`${input} (${hint})`)
  }

  const searchTerms = [hint ? `${input} ${hint}` : '', interest.trim(), input.trim()].filter(
    Boolean,
  )

  for (const searchQuery of searchTerms) {
    const search = await fetchWikipediaTitleSearchCandidates(searchQuery, {
      lang,
      signal,
      limit: 10,
    })

    for (const title of search.titles) {
      if (title === wrongTitle || candidates.includes(title)) continue
      if (title.toLowerCase().includes('disambiguation')) continue
      candidates.push(title)
    }
  }

  for (const candidate of candidates) {
    const resolved = await resolveExactTitle(candidate, lang, signal)
    if (!resolved || resolved === wrongTitle) continue

    if (hint && resolved.toLowerCase().includes(`(${hint.toLowerCase()})`)) {
      return resolved
    }
  }

  for (const candidate of candidates) {
    const resolved = await resolveExactTitle(candidate, lang, signal)
    if (resolved && resolved !== wrongTitle) {
      return resolved
    }
  }

  return null
}

/**
 * Re-check resolved titles where exact lookup may have followed a popular redirect
 * (e.g. "Franz Ferdinand" → archduke instead of the band in a music list).
 */
export async function refineResolvedWikipediaPageTitles(
  resolved: ResolvedPageTitle[],
  options: RefineResolvedPageTitlesOptions,
): Promise<RefineResolvedPageTitlesResult> {
  const hint = inferDisambiguationHint(options.batchInputs, options.interest)
  const refinements: PageTitleRefinement[] = []
  const out: ResolvedPageTitle[] = []

  for (const entry of resolved) {
    if (!needsDisambiguationReview(entry.input, entry.title)) {
      out.push(entry)
      continue
    }

    const better = await findBetterTitle(
      entry.input,
      entry.title,
      hint,
      options.interest,
      options.lang ?? 'en',
      options.signal,
    )

    if (better) {
      refinements.push({
        input: entry.input,
        from: entry.title,
        to: better,
        reason:
          hint ?
            `Chose a (${hint}) article to match the rest of the list.`
          : 'Search found a closer title for this name.',
      })
      out.push({ input: entry.input, title: better })
    } else {
      out.push(entry)
    }
  }

  return { resolved: out, refinements }
}
