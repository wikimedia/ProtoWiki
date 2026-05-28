import { resolveWikipediaPageTitleIfExact } from '@/lib/resolveWikipediaSearchQuery'

export class ResolveWikipediaPageTitlesBatchError extends Error {
  constructor(
    message: string,
    public readonly code: 'aborted' | 'http',
  ) {
    super(message)
    this.name = 'ResolveWikipediaPageTitlesBatchError'
  }
}

export interface ResolvedPageTitle {
  input: string
  title: string
}

export interface ResolveWikipediaPageTitlesBatchResult {
  resolved: ResolvedPageTitle[]
  missing: string[]
}

export interface ResolveWikipediaPageTitlesBatchOptions {
  signal?: AbortSignal
  /** Wikipedia language code (default `en`). */
  lang?: string
}

/**
 * Resolve a list of candidate page titles against Wikipedia.
 * Returns canonical titles for hits and the original inputs that missed.
 */
export async function resolveWikipediaPageTitlesBatch(
  rawTitles: string[],
  options: ResolveWikipediaPageTitlesBatchOptions = {},
): Promise<ResolveWikipediaPageTitlesBatchResult> {
  const inputs = rawTitles.map((title) => title.trim()).filter(Boolean)
  if (!inputs.length) {
    return { resolved: [], missing: [] }
  }

  const resolved: ResolvedPageTitle[] = []
  const missing: string[] = []
  const seenInputs = new Set<string>()

  await Promise.all(
    inputs.map(async (input) => {
      const inputKey = input.toLowerCase()
      if (seenInputs.has(inputKey)) return
      seenInputs.add(inputKey)

      try {
        const title = await resolveWikipediaPageTitleIfExact(input, {
          lang: options.lang,
          signal: options.signal,
        })
        if (title) {
          resolved.push({ input, title })
        } else {
          missing.push(input)
        }
      } catch (caught) {
        if (options.signal?.aborted) {
          throw new ResolveWikipediaPageTitlesBatchError('Request aborted', 'aborted')
        }
        missing.push(input)
      }
    }),
  )

  return { resolved, missing }
}
