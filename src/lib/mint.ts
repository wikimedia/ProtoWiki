/**
 * MinT machine translation (https://translate.wmcloud.org/docs) — Wikimedia
 * Language team's experimental service on Cloud VPS, so no SLA: every result
 * is cached in localStorage and failures resolve to `null` (callers keep the
 * source text).
 *
 * Plain `fetch` on purpose: the CORS preflight allows `Content-Type` but not
 * `Api-User-Agent`, so `fetchWikimedia` / `wikimediaApiFetchHeaders` would fail.
 */
const MINT_TRANSLATE_URL = 'https://translate.wmcloud.org/api/translate'
const STORAGE_KEY = 'protowiki-mint-cache'
const MAX_CACHE_ENTRIES = 300

export type MintFormat = 'text' | 'html'

export interface MintRequest {
  from: string
  to: string
  content: string
  format?: MintFormat
  signal?: AbortSignal
}

interface MintResponse {
  translation?: string
}

const inFlight = new Map<string, Promise<string | null>>()

/** FNV-1a; cache keys only, not security. */
function hashContent(content: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

function readCache(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function writeCache(key: string, value: string): void {
  try {
    const cache = readCache()
    cache[key] = value
    const keys = Object.keys(cache)
    // Insertion order ≈ age; drop the oldest past the cap.
    for (const stale of keys.slice(0, Math.max(0, keys.length - MAX_CACHE_ENTRIES))) {
      delete cache[stale]
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch {
    // Quota or private-mode failures — the in-memory result still returns.
  }
}

export async function mintTranslate({
  from,
  to,
  content,
  format = 'text',
  signal,
}: MintRequest): Promise<string | null> {
  const trimmed = content.trim()
  if (!trimmed || from === to) return trimmed || null

  const key = `${from}:${to}:${format}:${hashContent(trimmed)}`
  const cached = readCache()[key]
  if (cached) return cached

  let request = inFlight.get(key)
  if (!request) {
    request = (async () => {
      try {
        const response = await fetch(MINT_TRANSLATE_URL, {
          method: 'POST',
          signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_language: from,
            target_language: to,
            format,
            content: trimmed,
          }),
        })
        if (!response.ok) return null
        const json = (await response.json()) as MintResponse
        const translation = json.translation?.trim()
        if (!translation) return null
        writeCache(key, translation)
        return translation
      } catch {
        return null
      } finally {
        inFlight.delete(key)
      }
    })()
    inFlight.set(key, request)
  }

  return request
}
