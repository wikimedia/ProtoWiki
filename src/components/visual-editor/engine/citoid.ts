/**
 * Citoid ("Add a citation" → Automatic): the same REST service production
 * uses, enwiki's type → template map, and TemplateData's citoid field maps
 * (simplified to the commonly filled fields). Previews are rendered with
 * `action=parse`, like VE's `MWPreviewElement`.
 */
import { wikimediaApiFetchHeaders } from '@/config'

export interface CitoidItem {
  itemType: string
  title?: string
  url?: string
  websiteTitle?: string
  publicationTitle?: string
  blogTitle?: string
  bookTitle?: string
  publisher?: string
  date?: string
  accessDate?: string
  DOI?: string
  PMID?: string
  PMCID?: string
  ISBN?: string | string[]
  ISSN?: string | string[]
  pages?: string
  volume?: string
  issue?: string
  edition?: string
  place?: string
  language?: string
  author?: [string, string][]
  editor?: [string, string][]
  source?: string[]
}

export class CitoidError extends Error {
  constructor(
    public kind: 'general' | 'pdf' | 'media',
    message = 'Citoid lookup failed',
  ) {
    super(message)
  }
}

export async function lookupCitation(host: string, query: string): Promise<CitoidItem[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)
  try {
    const res = await fetch(`https://${host}/api/rest_v1/data/citation/mediawiki/${encodeURIComponent(query.trim())}`, {
      signal: controller.signal,
      headers: { 'Accept-Language': 'en', ...wikimediaApiFetchHeaders('visual-editor-template-citoid') },
    })
    if (res.status === 415) {
      const body = await res.json().catch(() => null)
      throw new CitoidError(String(body?.contentType ?? '').includes('pdf') ? 'pdf' : 'media')
    }
    if (!res.ok) throw new CitoidError('general')
    const data = await res.json()
    if (!Array.isArray(data) || !data.length) throw new CitoidError('general')
    return data as CitoidItem[]
  } catch (err) {
    if (err instanceof CitoidError) throw err
    throw new CitoidError('general')
  } finally {
    clearTimeout(timer)
  }
}

/** enwiki `MediaWiki:Citoid-template-type-map.json`. */
const TYPE_MAP: Record<string, string> = {
  blogPost: 'Cite web',
  email: 'Cite web',
  forumPost: 'Cite web',
  webpage: 'Cite web',
  book: 'Cite book',
  manuscript: 'Cite book',
  magazineArticle: 'Cite news',
  newspaperArticle: 'Cite news',
  conferencePaper: 'Cite journal',
  journalArticle: 'Cite journal',
  presentation: 'Cite journal',
  report: 'Cite report',
  thesis: 'Cite thesis',
  videoRecording: 'Cite AV media',
  patent: 'Cite patent',
}

export function templateFor(item: CitoidItem): string {
  return TYPE_MAP[item.itemType] ?? 'Citation'
}

/** Cite tool titles/icons (enwiki `MediaWiki:Cite-tool-definition.json`). */
export const CITE_TOOLS = [
  { name: 'web', label: 'Website', template: 'Cite web' },
  { name: 'book', label: 'Book', template: 'Cite book' },
  { name: 'news', label: 'News', template: 'Cite news' },
  { name: 'journal', label: 'Journal', template: 'Cite journal' },
] as const

export function toolFor(template: string) {
  return CITE_TOOLS.find((t) => t.template === template) ?? null
}

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v)

/** TemplateData `maps.citoid` (the fields Citoid commonly fills). */
export function citationParams(item: CitoidItem, template: string): [string, string][] {
  const p: [string, string][] = []
  const add = (name: string, value?: string | string[]) => {
    const v = first(value)
    if (v) p.push([name, v])
  }
  add('title', item.title ?? (template === 'Cite book' ? item.bookTitle : undefined))
  add('url', item.url)
  if (template === 'Cite web') add('website', item.websiteTitle ?? item.publicationTitle ?? item.blogTitle)
  if (template === 'Cite journal') add('journal', item.publicationTitle)
  if (template === 'Cite news' || template === 'Citation') add('work', item.publicationTitle)
  if (template === 'Cite book') add('edition', item.edition)
  add('publisher', item.publisher)
  add('date', item.date)
  if (template === 'Cite book' || template === 'Cite journal') add('location', item.place)
  add('isbn', item.ISBN)
  add('issn', item.ISSN)
  add('pmc', item.PMCID?.replace(/^PMC/, ''))
  add('pmid', item.PMID)
  add('pages', item.pages)
  add('volume', item.volume)
  add('issue', item.issue)
  add('doi', item.DOI)
  add('access-date', template === 'Cite journal' || template === 'Cite book' ? undefined : item.accessDate)
  add('language', item.language)
  ;(item.author ?? []).slice(0, 15).forEach(([firstName, last], i) => {
    const n = i === 0 ? '' : String(i + 1)
    if (firstName) p.push([`first${n}`, firstName])
    if (last) p.push([`last${n}`, last])
  })
  return p
}

export function citationWikitext(template: string, params: [string, string][]): string {
  return `{{${template}${params.map(([k, v]) => ` |${k}=${v.replace(/\|/g, '{{!}}')}`).join('')}}}`
}

/** Renders wikitext the way readers will see it in the reference list. */
export async function renderWikitext(host: string, title: string, wikitext: string): Promise<string> {
  const body = new URLSearchParams({
    action: 'parse',
    format: 'json',
    formatversion: '2',
    origin: '*',
    contentmodel: 'wikitext',
    prop: 'text',
    disablelimitreport: '1',
    disableeditsection: '1',
    title,
    text: wikitext,
  })
  try {
    // No Api-User-Agent here: on POST it triggers a CORS preflight the Action API rejects.
    const res = await fetch(`https://${host}/w/api.php`, { method: 'POST', body })
    const data = await res.json()
    const html: string = data?.parse?.text ?? ''
    // Keep the citation, drop the wrapper paragraph and COinS metadata.
    const doc = new DOMParser().parseFromString(html, 'text/html')
    doc.querySelectorAll('.Z3988, style, link').forEach((el) => el.remove())
    doc.querySelectorAll('a').forEach((a) => {
      a.setAttribute('target', '_blank')
      a.setAttribute('rel', 'noopener')
      const href = a.getAttribute('href') ?? ''
      if (href.startsWith('/')) a.setAttribute('href', `https://${host}${href}`)
    })
    const p = doc.querySelector('.mw-parser-output > p')
    return (p ?? doc.querySelector('.mw-parser-output'))?.innerHTML.trim() ?? ''
  } catch {
    return ''
  }
}
