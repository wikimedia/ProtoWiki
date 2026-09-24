import type { WikitabSavedArticle } from './wikitabConfig'

function hashString(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  return function next() {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Deterministic daily shuffle — salt separates modules picking different seeds. */
export function pickSavedArticleSeeds(
  articles: readonly WikitabSavedArticle[],
  day: string,
  maxSeeds: number,
  salt: string,
): WikitabSavedArticle[] {
  if (!articles.length) return []

  const fingerprint = articles
    .map((article) => article.titleKey)
    .sort()
    .join('|')
  const rng = mulberry32(hashString(`${salt}:${day}:${fingerprint}`))
  const copy = [...articles]

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }

  return copy.slice(0, Math.min(maxSeeds, copy.length))
}
