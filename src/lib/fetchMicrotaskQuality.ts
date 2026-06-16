import { wikimediaApiFetchHeaders } from '@/config'

const QUALITY_CHECK_URL = 'https://microtask-generator.toolforge.org/quality-check'

export interface MicrotaskQualityNeed {
  need: string
  score: number
}

export interface MicrotaskQualityResult {
  title: string
  exists: boolean
  potentialNeeds: MicrotaskQualityNeed[]
}

export class FetchMicrotaskQualityError extends Error {
  constructor(
    message: string,
    public readonly code: 'aborted' | 'http' | 'empty',
  ) {
    super(message)
    this.name = 'FetchMicrotaskQualityError'
  }
}

interface QualityCheckResponse {
  lang?: string
  results?: Array<{
    title?: string
    exists?: boolean
    potential_needs?: Array<{ need?: string; score?: number }>
  }>
}

export async function fetchMicrotaskQuality(
  titles: string[],
  options: { lang?: string; signal?: AbortSignal } = {},
): Promise<MicrotaskQualityResult[]> {
  if (options.signal?.aborted) {
    throw new FetchMicrotaskQualityError('Request aborted', 'aborted')
  }

  const uniqueTitles = [...new Set(titles.map((title) => title.trim()).filter(Boolean))]
  if (!uniqueTitles.length) {
    throw new FetchMicrotaskQualityError('No titles to check', 'empty')
  }

  const response = await fetch(QUALITY_CHECK_URL, {
    method: 'POST',
    signal: options.signal,
    headers: {
      ...wikimediaApiFetchHeaders('microtask-quality'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lang: options.lang ?? 'en',
      titles: uniqueTitles,
    }),
  })

  if (!response.ok) {
    throw new FetchMicrotaskQualityError(`Quality check failed (HTTP ${response.status})`, 'http')
  }

  const data = (await response.json()) as QualityCheckResponse

  return (data.results ?? []).map((entry) => ({
    title: entry.title ?? '',
    exists: entry.exists ?? false,
    potentialNeeds: (entry.potential_needs ?? [])
      .filter((item): item is { need: string; score: number } => typeof item.need === 'string')
      .map((item) => ({
        need: item.need,
        score: typeof item.score === 'number' ? item.score : 0,
      })),
  }))
}

/** Pick the lowest-scoring (highest priority) need for a title. */
export function pickPrimaryNeed(result: MicrotaskQualityResult): string | null {
  if (!result.potentialNeeds.length) return null

  const sorted = [...result.potentialNeeds].sort((a, b) => a.score - b.score)
  return sorted[0]?.need ?? null
}
