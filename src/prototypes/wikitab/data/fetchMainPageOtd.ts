import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'
import type { WikitabCardData } from '../sections'
import { EN_WIKI_HOST, articleUrl, normalizeFeedHtml, primaryLinkTitle } from './wikitabHtml'

interface ParseResponse {
  parse?: { text?: string }
}

function mainPageParseUrl(): string {
  const params = new URLSearchParams({
    action: 'parse',
    page: 'Main_Page',
    prop: 'text',
    formatversion: '2',
    format: 'json',
    origin: '*',
  })
  return `https://${EN_WIKI_HOST}/w/api.php?${params.toString()}`
}

function normalizeImageUrl(src: string | null | undefined): string | undefined {
  if (!src) return undefined
  if (src.startsWith('//')) return `https:${src}`
  return src
}

/** Rewrite the Main Page bullet as prose: "In <year link>, …." */
function hookAsProse(li: Element): string | null {
  const yearLink = li.querySelector(':scope > a')
  const year = yearLink?.textContent?.trim()
  if (!year || !yearLink) return null

  const clone = li.cloneNode(true) as HTMLElement
  clone.querySelector(':scope > a')?.remove()
  const body = clone.innerHTML.replace(/^\s*[–-]\s*/, '').replace(/\.\s*$/, '').trim()
  return normalizeFeedHtml(`In ${yearLink.outerHTML}, ${body}.`)
}

function parseMainPageOtdHtml(html: string): WikitabCardData[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const block = doc.getElementById('mp-otd')
  if (!block) return []

  const picturedUrl = normalizeImageUrl(doc.querySelector('#mp-otd-img img')?.getAttribute('src'))
  const items = block.querySelectorAll(':scope > ul > li')

  return [...items].flatMap((li, index) => {
    const yearLink = li.querySelector(':scope > a')
    const year = yearLink?.textContent?.trim()
    if (!year) return []

    const hook = hookAsProse(li)
    if (!hook) return []

    const subject = primaryLinkTitle(hook)
    const pictured = li.innerHTML.includes('(pictured)')

    return [
      {
        key: `otd-mp-${year}-${index}`,
        html: hook,
        href: subject ? articleUrl(subject) : undefined,
        linkTitle: subject,
        thumbnailUrl: pictured ? picturedUrl : undefined,
        thumbnailTitle: !pictured && subject ? subject : undefined,
      },
    ]
  })
}

/** Main Page "On this day" event bullets — the same five items as `#mp-otd`. */
export async function fetchMainPageOtd(signal?: AbortSignal): Promise<WikitabCardData[]> {
  try {
    const response = await fetchWikimedia(mainPageParseUrl(), {
      headers: wikimediaApiFetchHeaders('wikitab-main-page-otd'),
      signal,
    })
    if (!response.ok) return []

    const payload = (await response.json()) as ParseResponse
    const html = payload.parse?.text
    if (!html) return []

    return parseMainPageOtdHtml(html)
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error
    return []
  }
}
