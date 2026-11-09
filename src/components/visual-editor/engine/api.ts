/**
 * The same public endpoints production Edit Check calls (all allow browser
 * CORS). Each helper caches per page/host and fails soft: a check whose API is
 * unreachable simply produces no suggestions.
 */
import { wikimediaApiFetchHeaders } from '@/config'

const TIMEOUT_MS = 6000

async function fetchJson(url: string, init: RequestInit = {}): Promise<any> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { ...wikimediaApiFetchHeaders('visual-editor-template'), ...(init.headers ?? {}) },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

function actionApi(host: string, params: Record<string, string>): string {
  const query = new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params })
  return `https://${host}/w/api.php?${query}`
}

const memo = new Map<string, Promise<any>>()
function once<T>(key: string, load: () => Promise<T>): Promise<T> {
  let p = memo.get(key)
  if (!p) {
    p = load().catch((err) => {
      memo.delete(key)
      throw err
    })
    memo.set(key, p)
  }
  return p as Promise<T>
}

/** `ve.init.mw.LinkCache` → `pageprops.disambiguation` (DisambiguationEditCheck). */
export async function fetchDisambiguationTitles(host: string, titles: string[]): Promise<Set<string>> {
  const unique = [...new Set(titles)]
  const result = new Set<string>()
  const batches: string[][] = []
  for (let i = 0; i < unique.length; i += 50) batches.push(unique.slice(i, i + 50))
  await Promise.all(batches.map(async (batch) => {
    const key = `disambig|${host}|${batch.join('|')}`
    try {
      const data = await once(key, () =>
        fetchJson(
          actionApi(host, {
            action: 'query',
            prop: 'pageprops',
            ppprop: 'disambiguation',
            titles: batch.join('|'),
          }),
        ),
      )
      // Map normalized titles back to what was asked.
      const normalized = new Map<string, string>()
      for (const n of data?.query?.normalized ?? []) normalized.set(n.to, n.from)
      for (const page of data?.query?.pages ?? []) {
        if (page?.pageprops && 'disambiguation' in page.pageprops) {
          result.add(normalized.get(page.title) ?? page.title)
          result.add(page.title)
        }
      }
    } catch {
      /* fail soft */
    }
  }))
  return result
}

/** siteinfo interwikimap → regexes (`ve.init.mw.Target.isInterwikiUrl`). */
export function fetchInterwikiPatterns(host: string): Promise<RegExp[]> {
  return once(`iw|${host}`, async () => {
    const data = await fetchJson(
      actionApi(host, { action: 'query', meta: 'siteinfo', siprop: 'interwikimap' }),
    )
    return (data?.query?.interwikimap ?? [])
      .map((iw: { url?: string }) => iw.url)
      .filter((url: unknown): url is string => typeof url === 'string')
      .map((url: string) => {
        const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\$1', '(.*)')
        return new RegExp(`^${escaped.replace(/^https?:/, '(?:https?:)?')}$`)
      })
  }).catch(() => [])
}

/** `MediaWiki:Visualeditor-template-tools-definition.json` → `citationNeeded` titles. */
export function fetchCitationNeededTemplates(host: string): Promise<Set<string>> {
  return once(`cn|${host}`, async () => {
    const data = await fetchJson(
      actionApi(host, {
        action: 'query',
        prop: 'revisions',
        rvprop: 'content',
        rvslots: 'main',
        titles: 'MediaWiki:Visualeditor-template-tools-definition.json',
      }),
    )
    const content = data?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content
    const parsed = content ? JSON.parse(content) : null
    const titles = new Set<string>()
    for (const entry of parsed?.citationNeeded ?? []) {
      const list = Array.isArray(entry?.title) ? entry.title : [entry?.title]
      for (const t of list) if (typeof t === 'string') titles.add(normalizeTemplateTitle(t))
    }
    return titles
  }).catch(() => new Set(CITATION_NEEDED_FALLBACK.map(normalizeTemplateTitle)))
}

/** enwiki's list (from the definition page), used only if the page can't be read. */
const CITATION_NEEDED_FALLBACK = [
  'Citation needed',
  'Cn',
  'Fact',
  'CN',
  'Citation Needed',
  'Citationneeded',
  'Cite needed',
  'Citation-needed',
]

export function normalizeTemplateTitle(title: string): string {
  const t = title.replace(/_/g, ' ').replace(/^Template:/i, '').trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export interface LinkRecommendation {
  context_before: string
  link_text: string
  context_after: string
  link_target: string
  match_index: number
  score: number
}

/** Add Link service (SuggestedLinkEditCheck). */
export function fetchLinkRecommendations(lang: string, title: string): Promise<LinkRecommendation[]> {
  const page = encodeURIComponent(title.replace(/ /g, '_'))
  return once(`linkrec|${lang}|${title}`, async () => {
    const data = await fetchJson(
      `https://api.wikimedia.org/service/linkrecommendation/v1/linkrecommendations/wikipedia/${lang}/${page}`,
    )
    if (!Array.isArray(data?.links)) throw new Error('No links')
    return data.links as LinkRecommendation[]
  }).catch(() => [])
}

/** Tone Check languages (`ToneCheck.static.allowedContentLanguages`). */
export const TONE_LANGUAGES = ['en', 'es', 'fr', 'ja', 'pt']

const toneMemo = new Map<string, boolean>()

/**
 * Lift Wing `edit-check:predict` (ToneCheck). Batches of ≤100 texts; flagged
 * when `prediction && probability >= threshold`.
 */
export async function predictTone(
  texts: string[],
  { lang, title, threshold = 0.8 }: { lang: string; title: string; threshold?: number },
): Promise<boolean[]> {
  const out = texts.map((t) => toneMemo.get(`${lang}|${t}`))
  const pending = texts
    .map((text, i) => ({ text, i }))
    .filter(({ i }) => out[i] === undefined)
  for (let start = 0; start < pending.length; start += 100) {
    const batch = pending.slice(start, start + 100)
    try {
      const data = await fetchJson(
        'https://api.wikimedia.org/service/lw/inference/v1/models/edit-check:predict',
        {
          method: 'POST',
          headers: { 'Content-Type': 'text/html' },
          body: JSON.stringify({
            instances: batch.map(({ text }) => ({
              modified_text: text,
              page_title: title,
              original_text: '',
              check_type: 'tone',
              lang,
            })),
          }),
        },
      )
      const predictions = data?.predictions
      if (!Array.isArray(predictions) || predictions.length !== batch.length) continue
      batch.forEach(({ text, i }, k) => {
        const p = predictions[k]
        const flagged = !!p?.prediction && Number(p?.probability) >= threshold
        toneMemo.set(`${lang}|${text}`, flagged)
        out[i] = flagged
      })
    } catch {
      /* fail soft */
    }
  }
  return out.map((v) => v === true)
}

/** `action=query&redirects` → the redirect's final target (RedirectEditCheck "Update link"). */
export async function resolveRedirect(host: string, title: string): Promise<string | null> {
  try {
    const data = await fetchJson(actionApi(host, { action: 'query', titles: title, redirects: '1' }))
    return data?.query?.redirects?.[0]?.to ?? null
  } catch {
    return null
  }
}

/** TemplateData for templates (RequiredTemplateParamEditCheck), keyed by prefixed title. */
export async function fetchTemplateData(
  host: string,
  titles: string[],
): Promise<Map<string, Record<string, { required?: boolean; label?: unknown }>>> {
  const out = new Map<string, Record<string, { required?: boolean; label?: unknown }>>()
  const unique = [...new Set(titles)]
  const batches: string[][] = []
  for (let i = 0; i < unique.length; i += 50) batches.push(unique.slice(i, i + 50))
  await Promise.all(
    batches.map(async (batch) => {
      try {
        const data = await once(`td|${host}|${batch.join('|')}`, () =>
          fetchJson(
            actionApi(host, {
              action: 'templatedata',
              lang: 'en',
              includeMissingTitles: '1',
              redirects: '1',
              titles: batch.join('|'),
            }),
          ),
        )
        const redirects = new Map<string, string>()
        for (const r of data?.redirects ?? []) redirects.set(r.to, r.from)
        const normalized = new Map<string, string>()
        for (const n of data?.normalized ?? []) normalized.set(n.to, n.from)
        for (const page of Object.values<any>(data?.pages ?? {})) {
          if (!page?.params) continue
          const asked = redirects.get(page.title) ?? page.title
          out.set(normalized.get(asked) ?? asked, page.params)
          out.set(page.title, page.params)
        }
      } catch {
        /* fail soft */
      }
    }),
  )
  return out
}

export interface LlmSuggestion {
  title?: string
  static_description?: string
  description?: string
  target?: string
  suggestion_type?: string
  suggestion_id?: string | number
}

/** LLM editing suggestions (LLMSuggestionsEditCheck) — often empty for most pages. */
export async function fetchLlmSuggestions(host: string, lang: string, title: string): Promise<LlmSuggestion[]> {
  return once(`llm|${host}|${title}`, async () => {
    const info = await fetchJson(actionApi(host, { action: 'query', titles: title, prop: 'info' }))
    const pageId = info?.query?.pages?.[0]?.pageid
    if (!pageId) return []
    const data = await fetchJson('https://api.wikimedia.org/service/lw/inference/v1/models/editing-suggestions:predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wiki_id: `${lang}wiki`, page_id: pageId }),
    })
    if (!Array.isArray(data?.suggestions)) throw new Error('No suggestions')
    return (data.suggestions as LlmSuggestion[]).filter((s) => s.suggestion_type !== 'NPOV')
  }).catch(() => [])
}
