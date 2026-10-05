import { wikimediaApiFetchHeaders, wikiHostFromLang } from '@/config'

import {
  AttributionApiError,
  type AttributionCallsToAction,
  type AttributionEssential,
  type AttributionSignals,
  type AttributionTrustAndRelevance,
  type FetchAttributionSignalsOptions,
} from './types'

const DEFAULT_EXPAND = ['trust_and_relevance', 'calls_to_action'] as const

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new AttributionApiError('Request aborted', 'aborted')
  }
}

function attributionSignalsUrl(host: string, title: string, expand: readonly string[]): string {
  const encodedTitle = encodeURIComponent(title.replace(/ /g, '_'))
  const base = `https://${host}/w/rest.php/attribution/v0-beta/pages/${encodedTitle}/signals`
  if (!expand.length) return base
  const params = new URLSearchParams({ expand: expand.join(',') })
  return `${base}?${params.toString()}`
}

function parseEssential(raw: unknown): AttributionEssential | null {
  if (typeof raw !== 'object' || raw === null) return null
  const record = raw as Record<string, unknown>
  const title = record.title
  const link = record.link
  const license = record.license
  if (typeof title !== 'string' || typeof link !== 'string') return null
  if (typeof license !== 'object' || license === null) return null
  const licenseRecord = license as Record<string, unknown>
  if (typeof licenseRecord.title !== 'string' || typeof licenseRecord.url !== 'string') {
    return null
  }

  const essential: AttributionEssential = {
    title,
    link,
    license: { title: licenseRecord.title, url: licenseRecord.url },
  }

  if (typeof record.credit === 'string') {
    essential.credit = record.credit
  }

  if (Array.isArray(record.default_brand_marks)) {
    essential.default_brand_marks = record.default_brand_marks
      .filter((mark): mark is Record<string, unknown> => typeof mark === 'object' && mark !== null)
      .map((mark) => ({
        name: String(mark.name ?? ''),
        url: String(mark.url ?? ''),
        type: String(mark.type ?? ''),
      }))
      .filter((mark) => mark.url.length > 0)
  }

  if (typeof record.source_wiki === 'object' && record.source_wiki !== null) {
    const sw = record.source_wiki as Record<string, unknown>
    essential.source_wiki = {
      site_name: typeof sw.site_name === 'string' ? sw.site_name : undefined,
      project_family: typeof sw.project_family === 'string' ? sw.project_family : undefined,
      site_id: typeof sw.site_id === 'string' ? sw.site_id : undefined,
      site_language: typeof sw.site_language === 'string' ? sw.site_language : undefined,
      page_language: typeof sw.page_language === 'string' ? sw.page_language : undefined,
    }
  }

  return essential
}

function parseTrustAndRelevance(raw: unknown): AttributionTrustAndRelevance | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const record = raw as Record<string, unknown>
  const result: AttributionTrustAndRelevance = {}

  if (typeof record.last_updated === 'string') {
    result.last_updated = record.last_updated
  }
  const contributorCounts = record.contributor_counts
  if (typeof contributorCounts === 'number') {
    result.contributor_counts = contributorCounts
  } else if (contributorCounts === null) {
    result.contributor_counts = null
  }
  const pageViews = record.page_views
  if (typeof pageViews === 'number') {
    result.page_views = pageViews
  } else if (pageViews === null) {
    result.page_views = null
  }
  const referenceCount = record.reference_count
  if (typeof referenceCount === 'number') {
    result.reference_count = referenceCount
  } else if (referenceCount === null) {
    result.reference_count = null
  }
  if (typeof record.trending === 'object' && record.trending !== null) {
    result.trending = record.trending as AttributionTrustAndRelevance['trending']
  }

  return Object.keys(result).length ? result : undefined
}

function parseCtaRecord(
  raw: unknown,
): Record<string, { url: string; link_text: string; description: string }> | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const record = raw as Record<string, unknown>
  const result: Record<string, { url: string; link_text: string; description: string }> = {}

  for (const [key, value] of Object.entries(record)) {
    if (typeof value !== 'object' || value === null) continue
    const cta = value as Record<string, unknown>
    if (
      typeof cta.url === 'string' &&
      typeof cta.link_text === 'string' &&
      typeof cta.description === 'string'
    ) {
      result[key] = {
        url: cta.url,
        link_text: cta.link_text,
        description: cta.description,
      }
    }
  }

  return Object.keys(result).length ? result : undefined
}

function parseCallsToAction(raw: unknown): AttributionCallsToAction | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const record = raw as Record<string, unknown>
  const participation = parseCtaRecord(record.participation_ctas)
  const donation = parseCtaRecord(record.donation_ctas)
  if (!participation && !donation) return undefined
  return {
    participation_ctas: participation,
    donation_ctas: donation,
  }
}

function parseAttributionResponse(raw: unknown): AttributionSignals {
  if (typeof raw !== 'object' || raw === null) {
    throw new AttributionApiError('Invalid attribution response', 'invalid')
  }

  const record = raw as Record<string, unknown>

  if (typeof record.errorKey === 'string') {
    const translations = record.messageTranslations as Record<string, string> | undefined
    const message =
      translations?.en ??
      (typeof record.httpReason === 'string' ? record.httpReason : record.errorKey)
    const httpStatus = typeof record.httpCode === 'number' ? record.httpCode : undefined
    throw new AttributionApiError(message, 'not_found', httpStatus, record.errorKey)
  }

  const essential = parseEssential(record.essential)
  if (!essential) {
    throw new AttributionApiError('Missing essential attribution signals', 'invalid')
  }

  return {
    essential,
    trust_and_relevance: parseTrustAndRelevance(record.trust_and_relevance),
    calls_to_action: parseCallsToAction(record.calls_to_action),
  }
}

export async function fetchAttributionSignals(
  title: string,
  options: FetchAttributionSignalsOptions = {},
): Promise<AttributionSignals> {
  const trimmedTitle = title.trim()
  if (!trimmedTitle) {
    throw new AttributionApiError('Title is required', 'invalid')
  }

  const { signal, apiContact } = options
  assertNotAborted(signal)

  const host = options.host ?? wikiHostFromLang('en')
  const expand = options.expand?.length ? options.expand : [...DEFAULT_EXPAND]
  const url = attributionSignalsUrl(host, trimmedTitle, expand)

  const response = await fetch(url, {
    signal,
    headers: wikimediaApiFetchHeaders('attribution', apiContact),
  })

  assertNotAborted(signal)

  const raw: unknown = await response.json()

  if (!response.ok) {
    try {
      parseAttributionResponse(raw)
    } catch (error) {
      if (error instanceof AttributionApiError) {
        throw error
      }
    }
    throw new AttributionApiError(`HTTP ${response.status}`, 'http', response.status)
  }

  return parseAttributionResponse(raw)
}
