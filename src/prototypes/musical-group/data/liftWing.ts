import { wikimediaApiFetchHeaders } from '@/config'

import { fetchWithTimeout } from './fetchWithTimeout'

const LIFT_WING_BASE = 'https://api.wikimedia.org/service/lw/inference/v1/models'

/** Lift Wing predictions are slow; cache per revision for the session. */
const goodFaithCache = new Map<number, boolean | undefined>()
const revertRiskCache = new Map<number, RevertRiskResult | undefined>()
const referenceNeedCache = new Map<number, number | undefined>()

export interface RevertRiskResult {
  prediction: boolean
  probability: number
}

export interface ToneResult {
  prediction: boolean
  probability: number
}

function liftWingHeaders(purpose: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...wikimediaApiFetchHeaders(purpose),
  }
}

/** enwiki good-faith prediction for a revision. */
export async function predictGoodFaith(
  revId: number,
  signal?: AbortSignal,
): Promise<boolean | undefined> {
  if (goodFaithCache.has(revId)) return goodFaithCache.get(revId)

  try {
    const response = await fetchWithTimeout(`${LIFT_WING_BASE}/enwiki-goodfaith:predict`, {
      method: 'POST',
      signal,
      headers: liftWingHeaders('musical-group-goodfaith'),
      body: JSON.stringify({ rev_id: revId }),
    })
    if (!response.ok) {
      goodFaithCache.set(revId, undefined)
      return undefined
    }

    const json = (await response.json()) as {
      enwiki?: {
        scores?: Record<string, { goodfaith?: { score?: { prediction?: boolean } } }>
      }
    }
    const prediction = json.enwiki?.scores?.[String(revId)]?.goodfaith?.score?.prediction
    const value = typeof prediction === 'boolean' ? prediction : undefined
    goodFaithCache.set(revId, value)
    return value
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    goodFaithCache.set(revId, undefined)
    return undefined
  }
}

/** Reference-need score for a revision (0–1; higher = more citation follow-up needed). */
export async function predictReferenceNeed(
  revId: number,
  lang = 'en',
  signal?: AbortSignal,
): Promise<number | undefined> {
  if (referenceNeedCache.has(revId)) return referenceNeedCache.get(revId)

  try {
    const response = await fetchWithTimeout(`${LIFT_WING_BASE}/reference-need:predict`, {
      method: 'POST',
      signal,
      headers: liftWingHeaders('musical-group-reference-need'),
      body: JSON.stringify({ rev_id: revId, lang }),
    })
    if (!response.ok) {
      referenceNeedCache.set(revId, undefined)
      return undefined
    }

    const json = (await response.json()) as { reference_need_score?: number }
    const score = json.reference_need_score
    const value = typeof score === 'number' ? score : undefined
    referenceNeedCache.set(revId, value)
    return value
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    referenceNeedCache.set(revId, undefined)
    return undefined
  }
}

/** Language-agnostic revert-risk prediction for a revision. */
export async function predictRevertRisk(
  revId: number,
  signal?: AbortSignal,
): Promise<RevertRiskResult | undefined> {
  if (revertRiskCache.has(revId)) return revertRiskCache.get(revId)

  try {
    const response = await fetchWithTimeout(
      `${LIFT_WING_BASE}/revertrisk-language-agnostic:predict`,
      {
        method: 'POST',
        signal,
        headers: liftWingHeaders('musical-group-revertrisk'),
        body: JSON.stringify({ rev_id: revId, lang: 'en' }),
      },
    )
    if (!response.ok) {
      revertRiskCache.set(revId, undefined)
      return undefined
    }

    const json = (await response.json()) as {
      output?: { prediction?: boolean; probabilities?: { true?: number } }
    }
    const prediction = json.output?.prediction
    if (typeof prediction !== 'boolean') {
      revertRiskCache.set(revId, undefined)
      return undefined
    }
    const result: RevertRiskResult = {
      prediction,
      probability: json.output?.probabilities?.true ?? (prediction ? 1 : 0),
    }
    revertRiskCache.set(revId, result)
    return result
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    revertRiskCache.set(revId, undefined)
    return undefined
  }
}

/** Edit Check tone prediction for a before/after text pair. */
export async function predictTone(
  pageTitle: string,
  originalText: string,
  modifiedText: string,
  signal?: AbortSignal,
): Promise<ToneResult | undefined> {
  if (!modifiedText.trim()) return undefined

  try {
    const response = await fetchWithTimeout(`${LIFT_WING_BASE}/edit-check:predict`, {
      method: 'POST',
      signal,
      headers: liftWingHeaders('musical-group-tone'),
      body: JSON.stringify({
        instances: [
          {
            lang: 'en',
            check_type: 'tone',
            page_title: pageTitle,
            original_text: originalText,
            modified_text: modifiedText,
          },
        ],
      }),
    })
    if (!response.ok) return undefined

    const json = (await response.json()) as {
      predictions?: { prediction?: boolean; probability?: number }[]
    }
    const prediction = json.predictions?.[0]
    if (!prediction || typeof prediction.prediction !== 'boolean') return undefined
    return {
      prediction: prediction.prediction,
      probability: prediction.probability ?? 0,
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    return undefined
  }
}
