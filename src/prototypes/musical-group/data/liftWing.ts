import { wikimediaApiFetchHeaders } from '@/config'

import { fetchWithTimeout } from './fetchWithTimeout'
import {
  getCachedGoodFaith,
  getCachedReferenceNeed,
  getCachedRevertRisk,
  setCachedGoodFaith,
  setCachedReferenceNeed,
  setCachedRevertRisk,
} from './liftWingCache'

const LIFT_WING_BASE = 'https://api.wikimedia.org/service/lw/inference/v1/models'

/** Session layer on top of localStorage. */
const goodFaithMemory = new Map<number, boolean | undefined>()
const revertRiskMemory = new Map<number, RevertRiskResult | undefined>()
const referenceNeedMemory = new Map<number, number | undefined>()

export interface RevertRiskResult {
  prediction: boolean
  probability: number
}

export interface ToneResult {
  prediction: boolean
  probability: number
}

export { clearLiftWingCache } from './liftWingCache'

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
  if (goodFaithMemory.has(revId)) return goodFaithMemory.get(revId)

  const stored = getCachedGoodFaith(revId)
  if (stored !== undefined) {
    const value = stored === null ? undefined : stored
    goodFaithMemory.set(revId, value)
    return value
  }

  try {
    const response = await fetchWithTimeout(`${LIFT_WING_BASE}/enwiki-goodfaith:predict`, {
      method: 'POST',
      signal,
      headers: liftWingHeaders('musical-group-goodfaith'),
      body: JSON.stringify({ rev_id: revId }),
    })
    if (!response.ok) {
      goodFaithMemory.set(revId, undefined)
      setCachedGoodFaith(revId, null)
      return undefined
    }

    const json = (await response.json()) as {
      enwiki?: {
        scores?: Record<string, { goodfaith?: { score?: { prediction?: boolean } } }>
      }
    }
    const prediction = json.enwiki?.scores?.[String(revId)]?.goodfaith?.score?.prediction
    const value = typeof prediction === 'boolean' ? prediction : undefined
    goodFaithMemory.set(revId, value)
    setCachedGoodFaith(revId, value ?? null)
    return value
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    goodFaithMemory.set(revId, undefined)
    setCachedGoodFaith(revId, null)
    return undefined
  }
}

/** Reference-need score for a revision (0–1; higher = more citation follow-up needed). */
export async function predictReferenceNeed(
  revId: number,
  lang = 'en',
  signal?: AbortSignal,
): Promise<number | undefined> {
  if (referenceNeedMemory.has(revId)) return referenceNeedMemory.get(revId)

  const stored = getCachedReferenceNeed(revId)
  if (stored !== undefined) {
    const value = stored === null ? undefined : stored
    referenceNeedMemory.set(revId, value)
    return value
  }

  try {
    const response = await fetchWithTimeout(`${LIFT_WING_BASE}/reference-need:predict`, {
      method: 'POST',
      signal,
      headers: liftWingHeaders('musical-group-reference-need'),
      body: JSON.stringify({ rev_id: revId, lang }),
    })
    if (!response.ok) {
      referenceNeedMemory.set(revId, undefined)
      setCachedReferenceNeed(revId, null)
      return undefined
    }

    const json = (await response.json()) as { reference_need_score?: number }
    const score = json.reference_need_score
    const value = typeof score === 'number' ? score : undefined
    referenceNeedMemory.set(revId, value)
    setCachedReferenceNeed(revId, value ?? null)
    return value
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    referenceNeedMemory.set(revId, undefined)
    setCachedReferenceNeed(revId, null)
    return undefined
  }
}

/** Language-agnostic revert-risk prediction for a revision. */
export async function predictRevertRisk(
  revId: number,
  signal?: AbortSignal,
): Promise<RevertRiskResult | undefined> {
  if (revertRiskMemory.has(revId)) return revertRiskMemory.get(revId)

  const stored = getCachedRevertRisk(revId)
  if (stored !== undefined) {
    const value = stored === null ? undefined : stored
    revertRiskMemory.set(revId, value)
    return value
  }

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
      revertRiskMemory.set(revId, undefined)
      setCachedRevertRisk(revId, null)
      return undefined
    }

    const json = (await response.json()) as {
      output?: { prediction?: boolean; probabilities?: { true?: number } }
    }
    const prediction = json.output?.prediction
    if (typeof prediction !== 'boolean') {
      revertRiskMemory.set(revId, undefined)
      setCachedRevertRisk(revId, null)
      return undefined
    }
    const result: RevertRiskResult = {
      prediction,
      probability: json.output?.probabilities?.true ?? (prediction ? 1 : 0),
    }
    revertRiskMemory.set(revId, result)
    setCachedRevertRisk(revId, result)
    return result
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    revertRiskMemory.set(revId, undefined)
    setCachedRevertRisk(revId, null)
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

export function clearLiftWingMemoryCache(): void {
  goodFaithMemory.clear()
  revertRiskMemory.clear()
  referenceNeedMemory.clear()
}
